import fs from "fs";
import path from "path";
import { crawlCarzone } from "./crawler/crawler-new";
import { PROXY_URL } from "./utils/constants";

// Ensure output directory exists
const outputDir = path.join(process.cwd(), "output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  try {
    console.log(`🚀 Starting crawl, output will be saved to: ${outputDir}`);

    //  TODO
    await crawlCarzone({
      // baseUrl: "https://www.carzone.ie/cars",
      baseUrl: "https://www.carzone.ie",
      maxPages: 200,
      outputDir: outputDir,
      proxy: PROXY_URL,
    });

    // await crawlCarzone2({
    //   baseUrl: "https://www.carzone.ie/search",
    //   maxPages: 200,
    //   outputDir: outputDir,
    //   proxy: PROXY_URL,
    // });

    console.log(
      `✅ Crawl completed successfully! Results saved to: ${outputDir}`
    );
  } catch (error) {
    console.error("❌ Error during crawl:", error);
    process.exit(1);
  }
})();
