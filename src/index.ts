import { Crawler } from "./crawler";
import {
  ALLOWED_DOMAIN,
  ALLOWED_PATH_PREFIXES,
  CRAWL_DELAY_MAX,
  CRAWL_DELAY_MIN,
  EXCLUDED_EXTENSIONS,
  EXCLUDED_PATH_SUBSTRINGS,
  MAX_PAGES,
  OUTPUT_DIR,
  PROXY_URL,
  REQUEST_TIMEOUT,
  START_URLS,
  USER_AGENTS,
} from "./utils/constants";
import { setupLogger } from "./utils/logger";

const LOGGER = setupLogger(process.env.LOG_LEVEL || "INFO");

async function main() {
  try {
    const crawler = new Crawler(
      {
        outputDir: OUTPUT_DIR,
        proxyUrl: PROXY_URL,
        startUrls: Array.isArray(START_URLS) ? START_URLS : [START_URLS],
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

    LOGGER.info("✅ Crawler terminé avec succès!");
    // process.exit(0);
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
