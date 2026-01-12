
import os
import re
import sys
import time
import hashlib
import logging
import random
from collections import deque
from urllib.parse import urljoin, urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def setup_logger(level: str) -> logging.Logger:
    logger = logging.getLogger("carzone_crawler")
    logger.setLevel(level.upper() if level else "INFO")
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.handlers = [handler]
    logger.propagate = False
    return logger


LOGGER = setup_logger(os.getenv("LOG_LEVEL", "INFO"))


# Config via env vars
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "/data")
PROXY_URL = os.getenv("PROXY_URL", "").strip()
START_URLS = [u.strip() for u in os.getenv("START_URLS", "https://www.carzone.ie/cars").split(",") if u.strip()]
MAX_PAGES = int(os.getenv("MAX_PAGES", "200"))
CRAWL_DELAY_MIN = float(os.getenv("CRAWL_DELAY_MIN", "0.5"))
CRAWL_DELAY_MAX = float(os.getenv("CRAWL_DELAY_MAX", "2.0"))
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "20"))

# Domain rules
ALLOWED_DOMAIN = "carzone.ie"
ALLOWED_PATH_PREFIXES = [
    "/cars",
    "/used-cars",
    "/electric-cars",
    "/dealer-cars",
]
EXCLUDED_PATH_SUBSTRINGS = [
    "/news", "/advice", "/review", "/reviews", "/blog", "/help",
    "/login", "/account", "/privacy", "/terms", "/about", "/sell",
    "/new-cars", "/finance", "/car-reviews", "/insurance", "/contact",
    "/sitemap", "/cookies", "/cookie"
]
EXCLUDED_EXTENSIONS = (
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".webp", ".bmp",
    ".css", ".js", ".json", ".pdf", ".txt", ".xml", ".woff", ".woff2", ".ttf", ".map"
)

# Reasonable desktop UAs to reduce blocking risk
USER_AGENTS = [
    # Chrome (Win/Mac/Linux)
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
    " Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko)"
    " Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)"
    " Chrome/120.0.0.0 Safari/537.36",
    # Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.6; rv:120.0) Gecko/20100101 Firefox/120.0",
]


def slugify_for_filename(url: str) -> str:
    """
    Create a reasonably safe filename from a URL.
    """
    parsed = urlsplit(url)
    path = parsed.path.strip("/")
    path_slug = re.sub(r"[^a-zA-Z0-9\-_/]+", "-", path)
    path_slug = path_slug.replace("/", "-")
    if not path_slug:
        path_slug = "root"

    query = parsed.query
    query_hash = hashlib.sha1(query.encode("utf-8")).hexdigest()[:8] if query else "noq"
    host = parsed.netloc.replace(":", "_")
    return f"{host}_{path_slug}_{query_hash}"


def normalize_url(url: str) -> str:
    """
    Normalize URL to https scheme, strip fragments, remove default ports.
    """
    parsed = urlsplit(url)
    scheme = "https"  # force https
    netloc = parsed.netloc
    if netloc.endswith(":80") or netloc.endswith(":443"):
        netloc = netloc.split(":")[0]
    # drop fragment
    return urlunsplit((scheme, netloc, parsed.path, parsed.query, ""))


def is_same_domain(url: str, allowed_domain: str) -> bool:
    try:
        parsed = urlsplit(url)
        host = parsed.netloc.lower()
        return host == allowed_domain or host.endswith("." + allowed_domain)
    except Exception:
        return False


def is_html_response(resp: requests.Response) -> bool:
    ctype = resp.headers.get("Content-Type", "")
    return "text/html" in ctype or "application/xhtml+xml" in ctype


def is_excluded_path(path: str) -> bool:
    lower = path.lower()
    if any(lower.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
        return True
    if any(substr in lower for substr in EXCLUDED_PATH_SUBSTRINGS):
        return True
    return False


def is_listing_candidate(url: str) -> bool:
    """
    Heuristic to keep only 'listing-like' pages under /cars, /used-cars, etc.
    """
    try:
        parsed = urlsplit(url)
    except Exception:
        return False

    if not is_same_domain(url, ALLOWED_DOMAIN):
        return False

    path = parsed.path or "/"
    if is_excluded_path(path):
        return False

    if any(path == p or path.startswith(p + "/") for p in ALLOWED_PATH_PREFIXES):
        return True

    # Allow pagination-like query on /cars?...
    if path == "/cars":
        return True

    return False


def extract_links(html: str, base_url: str) -> list:
    """
    Extract absolute links from HTML and normalize them.
    """
    soup = BeautifulSoup(html, "lxml")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
            continue
        abs_url = urljoin(base_url, href)
        try:
            abs_url = normalize_url(abs_url)
        except Exception:
            continue
        links.append(abs_url)
    return links


def create_session(proxy_url: str | None) -> requests.Session:
    sess = requests.Session()
    # Rotating UA by request (we set base headers; we'll override per request)
    sess.headers.update({
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    })

    retry = Retry(
        total=5,
        backoff_factor=1.0,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "HEAD", "OPTIONS"],
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=16, pool_maxsize=32)
    sess.mount("http://", adapter)
    sess.mount("https://", adapter)

    if proxy_url:
        # Support http(s) and socks (socks5h)
        sess.proxies.update({"http": proxy_url, "https": proxy_url})

    return sess


def polite_sleep():
    delay = random.uniform(CRAWL_DELAY_MIN, CRAWL_DELAY_MAX)
    time.sleep(delay)


def save_html(content: bytes, out_dir: str, index: int, url: str) -> str:
    os.makedirs(out_dir, exist_ok=True)
    base = slugify_for_filename(url)
    filename = f"{index:04d}_{base}.html"
    path = os.path.join(out_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    return path


def fetch(session: requests.Session, url: str) -> requests.Response | None:
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    try:
        resp = session.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        # Handle too many requests explicitly
        if resp.status_code == 429:
            retry_after = resp.headers.get("Retry-After")
            sleep_s = 5
            if retry_after:
                try:
                    sleep_s = int(retry_after)
                except Exception:
                    pass
            LOGGER.warning("429 received. Sleeping for %ss...", sleep_s)
            time.sleep(sleep_s)
            return None
        return resp
    except requests.RequestException as e:
        LOGGER.warning("Request error for %s: %s", url, e)
        return None


def crawl():
    if PROXY_URL:
        LOGGER.info("Proxy enabled: %s", PROXY_URL)
    else:
        LOGGER.info("No proxy configured. Set PROXY_URL to enable one.")

    session = create_session(PROXY_URL)

    queue = deque()
    visited = set()
    saved_urls = set()
    saved_count = 0

    # Seed queue
    for seed in START_URLS:
        try:
            seed_norm = normalize_url(seed)
        except Exception:
            continue
        if is_listing_candidate(seed_norm):
            queue.append(seed_norm)

    if not queue:
        LOGGER.error("No valid START_URLS after filtering. Please set START_URLS to listing pages (e.g. https://www.carzone.ie/cars).")
        sys.exit(2)

    LOGGER.info("Starting crawl. Targets: %d pages. Seeds: %d", MAX_PAGES, len(queue))

    while queue and saved_count < MAX_PAGES:
        url = queue.popleft()
        if url in visited:
            continue
        visited.add(url)

        if not is_listing_candidate(url):
            continue

        polite_sleep()
        resp = fetch(session, url)
        if resp is None:
            continue

        if resp.status_code != 200:
            LOGGER.debug("Skip %s (status %s)", url, resp.status_code)
            continue

        if not is_html_response(resp):
            LOGGER.debug("Non-HTML content at %s", url)
            continue

        # Save page
        if url not in saved_urls:
            path = save_html(resp.content, OUTPUT_DIR, saved_count + 1, url)
            saved_count += 1
            saved_urls.add(url)
            LOGGER.info("Saved %d/%d: %s -> %s", saved_count, MAX_PAGES, url, path)

        # Extract next candidates
        links = extract_links(resp.text, url)
        for link in links:
            if link not in visited and is_listing_candidate(link):
                queue.append(link)

    LOGGER.info("Crawl completed. Saved %d pages to %s", saved_count, OUTPUT_DIR)
    if saved_count < MAX_PAGES:
        LOGGER.warning("Could not reach the target of %d pages. Collected %d.", MAX_PAGES, saved_count)


def main():
    try:
        # REQUIREMENT: Une fois ... lancé, l’exécution doit automatiquement Crawler les 200 pages
        crawl()
        LOGGER.info("Crawler terminé avec succès!")
    except KeyboardInterrupt:
        LOGGER.warning("Interrupted by user.")
    except Exception as e:
        LOGGER.error(f"Erreur fatale: {e}")
        # LOGGER.exception("Fatal error: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
