import axios from "axios";
import fs from "fs";
import path from "path";
import { HttpsProxyAgent } from "https-proxy-agent";
// import { chromium } from "playwright";
import { extractListings } from "../utils/extract";
import { URL } from "url";

interface CrawlOptions {
  baseUrl: string;
  maxPages: number;
  outputDir: string;
  proxy?: string;
}

export async function crawlCarzone(options: CrawlOptions) {
  const { baseUrl, maxPages, outputDir, proxy } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

  const client = axios.create({
    timeout: 15000,
    httpsAgent: agent,
    httpAgent: agent,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CarzoneCrawler/1.0)",
    },
  });

  let page = 1;
  let crawled = 0;

  while (crawled < maxPages) {
    const url = new URL(`/cars?page=${page}`, baseUrl).toString();
    console.log(`🌍 Fetching ${url}`);

    try {
      const response = await client.get(url, {
        headers: {
          "User-Agent": [
            // Chrome (Win/Mac/Linux)
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            // Firefox
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.6; rv:120.0) Gecko/20100101 Firefox/120.0",
          ],
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "max-age=0",
        },
        validateStatus: () => true,
        timeout: parseFloat(process.env.REQUEST_TIMEOUT || "20") * 1000,
        responseType: "text",
      });
      const filePath = path.join(outputDir, `page_${page}.html`);
      fs.writeFileSync(filePath, response.data, "utf-8");

      crawled++;
      page++;
    } catch (err) {
      console.error(`❌ Erreur page ${page}`, err);
      break;
    }
  }
}

export async function crawlCarzone2(opts: CrawlOptions) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    proxy: opts.proxy ? { server: opts.proxy } : undefined,
  });

  const page = await browser.newPage();
  fs.mkdirSync(opts.outputDir, { recursive: true });

  let allResults = [];
  for (let i = 1; i <= opts.maxPages; i++) {
    const url = `${opts.baseUrl}?page=${i}`;
    console.log(`🌍 ${url}`);

    await page.goto(url, { waitUntil: "networkidle" });

    const html = await page.content();
    fs.writeFileSync(path.join(opts.outputDir, `page_${i}.html`), html);

    const listings = await extractListings(page);
    allResults.push(...listings);
  }

  fs.writeFileSync(
    path.join(opts.outputDir, "cars.json"),
    JSON.stringify(allResults, null, 2)
  );

  await browser.close();
}
