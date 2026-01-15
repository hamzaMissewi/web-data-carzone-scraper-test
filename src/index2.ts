import fs from "fs";
import path from "path";
import { crawlCarzone } from "./crawler/crawler-new";
import { BASE_URL, MAX_PAGES, OUTPUT_DIR, PROXY_URL } from "./utils/constants";

// Ensure output directory exists
const outputDir = path.isAbsolute(OUTPUT_DIR)
  ? OUTPUT_DIR
  : path.join(process.cwd(), OUTPUT_DIR);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  try {
    console.log(`Starting crawl, output will be saved to: ${outputDir}`);

    await crawlCarzone({
      baseUrl: BASE_URL,
      maxPages: MAX_PAGES,
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
      `Crawl completed successfully! Results saved to: ${outputDir}`
    );
  } catch (error) {
    console.error("Error during crawl:", error);
    process.exit(1);
  }
})();
