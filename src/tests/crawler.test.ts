import { Crawler } from "../crawler";
import { setupLogger } from "../logger";

// Mock configuration for testing
const testConfig = {
  outputDir: "./test-output",
  proxyUrl: process.env.PROXY_URL || "",
  startUrls: ["https://www.carzone.ie/cars"],
  maxPages: 5, // Small number for testing
  crawlDelayMin: 1,
  crawlDelayMax: 2,
  requestTimeout: 30,
  allowedDomain: "carzone.ie",
  allowedPathPrefixes: ["/cars", "/used-cars"],
  excludedPathSubstrings: [
    "/news",
    "/advice",
    "/review",
    "/reviews",
    "/blog",
    "/help",
    "/login",
    "/account",
  ],
  excludedExtensions: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".css",
    ".js",
    ".json",
    ".pdf",
  ],
  userAgents: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ],
};

async function testCrawler() {
  console.log("🧪 Testing crawler functionality...");

  const logger = setupLogger("DEBUG");
  const crawler = new Crawler(testConfig, logger);

  try {
    console.log("🚀 Starting test crawl (max 5 pages)...");
    await crawler.crawl();
    console.log("✅ Test crawl completed successfully!");
  } catch (error: any) {
    console.error("❌ Test crawl failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testCrawler().catch(console.error);
}

export { testCrawler };
