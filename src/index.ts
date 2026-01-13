import { setupLogger } from "./logger";
import { Crawler } from "./crawler";

const LOGGER = setupLogger(process.env.LOG_LEVEL || "INFO");

// Config via env vars
const OUTPUT_DIR = process.env.OUTPUT_DIR || "/app/output";
// const OUTPUT_DIR = process.env.OUTPUT_DIR || "/data";
// const PROXY_URL = process.env.PROXY_URL?.trim() || undefined;
const PROXY_URL =
  process.env.PROXY_URL?.trim() || "http://user:pass@proxy-host:port";
// const START_URLS = process.env.START_URLS || "https://www.carzone.ie/cars";
// const PROXY_URL = process.env.PROXY_URL?.trim() || "";
const BASE_URL = process.env.BASE_URL || "https://www.carzone.ie";
const START_URLS = (process.env.START_URLS || BASE_URL + "/cars")
  .split(",")
  .map((u) => u.trim())
  .filter((u) => u.length > 0);
const MAX_PAGES = parseInt(process.env.MAX_PAGES || "200");
const CRAWL_DELAY_MIN = parseFloat(process.env.CRAWL_DELAY_MIN || "0.5");
const CRAWL_DELAY_MAX = parseFloat(process.env.CRAWL_DELAY_MAX || "2.0");
const REQUEST_TIMEOUT = parseFloat(process.env.REQUEST_TIMEOUT || "20");

// Domain rules
const ALLOWED_DOMAIN = "carzone.ie";
const ALLOWED_PATH_PREFIXES = [
  "/cars",
  "/used-cars",
  "/electric-cars",
  "/dealer-cars",
];
const EXCLUDED_PATH_SUBSTRINGS = [
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
const EXCLUDED_EXTENSIONS = [
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
const USER_AGENTS = [
  // Chrome (Win/Mac/Linux)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // Firefox
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.6; rv:120.0) Gecko/20100101 Firefox/120.0",
];

async function main() {
  try {
    const crawler = new Crawler(
      {
        outputDir: OUTPUT_DIR,
        proxyUrl: PROXY_URL,
        startUrls: START_URLS,
        maxPages: MAX_PAGES,
        crawlDelayMin: CRAWL_DELAY_MIN,
        crawlDelayMax: CRAWL_DELAY_MAX,
        requestTimeout: REQUEST_TIMEOUT,
        allowedDomain: ALLOWED_DOMAIN,
        allowedPathPrefixes: ALLOWED_PATH_PREFIXES,
        excludedPathSubstrings: EXCLUDED_PATH_SUBSTRINGS,
        excludedExtensions: EXCLUDED_EXTENSIONS,
        userAgents: USER_AGENTS,
      },
      LOGGER
    );

    await crawler.crawl();
    LOGGER.info("Crawler terminé avec succès!");
    process.exit(0);
  } catch (error: any) {
    if (error.message === "SIGINT") {
      LOGGER.warning("Interrupted by user.");
      process.exit(0);
    } else {
      LOGGER.error(`Erreur fatale: ${error.message}`);
      LOGGER.exception("Fatal error:", error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  LOGGER.warning("Interrupted by user.");
  process.exit(0);
});

process.on("SIGTERM", () => {
  LOGGER.warning("Terminated by system.");
  process.exit(0);
});

main();
