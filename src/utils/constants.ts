// export const OUTPUT_DIR = process.env.OUTPUT_DIR || "./html";
export const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";

export const PROXY_URL = process.env.PROXY_URL?.trim() || undefined; //"http://user:pass@proxy-host:port";

// export const START_URLS = process.env.START_URLS || "https://www.carzone.ie/cars";
export const BASE_URL = process.env.BASE_URL || "https://www.carzone.ie";
export const START_URLS = (process.env.START_URLS || BASE_URL + "/cars")
  .split(",")
  .map((u) => u.trim())
  .filter((u) => u.length > 0);
export const MAX_PAGES = parseInt(process.env.MAX_PAGES || "200");
export const CRAWL_DELAY_MIN = parseFloat(process.env.CRAWL_DELAY_MIN || "0.5");
export const CRAWL_DELAY_MAX = parseFloat(process.env.CRAWL_DELAY_MAX || "2.0");
export const REQUEST_TIMEOUT = parseFloat(process.env.REQUEST_TIMEOUT || "20");

export const ALLOWED_DOMAIN = "carzone.ie";
export const ALLOWED_PATH_PREFIXES = [
  "/cars",
  "/used-cars",
  "/electric-cars",
  "/dealer-cars",
];
export const EXCLUDED_PATH_SUBSTRINGS = [
  "/news",
  "/advice",
  "/review",
  "/reviews",
  "/blog",
  "/help",
  "/login",
  "/account",
  "/privacy",
  "/terms",
  "/about",
  "/sell",
  "/new-cars",
  "/finance",
  "/car-reviews",
  "/insurance",
  "/contact",
  "/sitemap",
  "/cookies",
  "/cookie",
];
export const EXCLUDED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".bmp",
  ".css",
  ".js",
  ".json",
  ".pdf",
  ".txt",
  ".xml",
  ".woff",
  ".woff2",
  ".ttf",
  ".map",
];

// Reasonable desktop UAs to reduce blocking risk
export const USER_AGENTS = [
  // Chrome (Win/Mac/Linux)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // Firefox
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.6; rv:120.0) Gecko/20100101 Firefox/120.0",
];
