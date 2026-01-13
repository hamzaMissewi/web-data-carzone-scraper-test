import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

import { Logger } from "./logger";
import {
  slugifyForFilename,
  normalizeUrl,
  isListingCandidate,
  politeSleep,
} from "./utils";

interface CrawlerConfig {
  outputDir: string;
  proxyUrl?: string;
  startUrls: string[];
  maxPages: number;
  crawlDelayMin: number;
  crawlDelayMax: number;
  requestTimeout: number;
  allowedDomain: string;
  allowedPathPrefixes: string[];
  excludedPathSubstrings: string[];
  excludedExtensions: string[];
  userAgents: string[];
}

export class Crawler {
  private config: CrawlerConfig;
  private logger: Logger;
  private queue: string[] = [];
  private visited: Set<string> = new Set();
  private savedUrls: Set<string> = new Set();
  private savedCount: number = 0;

  constructor(config: CrawlerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  private getAxiosConfig(url: string) {
    const config: any = {
      headers: {
        "User-Agent":
          this.config.userAgents[
            Math.floor(Math.random() * this.config.userAgents.length)
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
      timeout: this.config.requestTimeout * 1000,
      responseType: "text",
    };

    if (this.config.proxyUrl && this.config.proxyUrl.trim() !== "") {
      try {
        if (this.config.proxyUrl.startsWith("socks")) {
          const agent = new SocksProxyAgent(this.config.proxyUrl);
          config.httpsAgent = agent;
          config.httpAgent = agent;
        } else {
          const agent = new HttpsProxyAgent(this.config.proxyUrl);
          config.httpsAgent = agent;
          config.httpAgent = agent;
        }
        this.logger.debug(`Using proxy: ${this.config.proxyUrl}`);
      } catch (error: any) {
        this.logger.warning(`Failed to create proxy agent: ${error.message}`);
      }
    } else {
      this.logger.debug("No proxy configured");
    }

    return config;
  }

  private async fetch(
    url: string
  ): Promise<{ content: string; status: number } | null> {
    try {
      this.logger.debug(`Fetching ${url}...`);
      const config = this.getAxiosConfig(url);
      const response = await axios.get(url, config);

      return {
        content:
          typeof response.data === "string"
            ? response.data
            : JSON.stringify(response.data),
        status: response.status,
      };
    } catch (error: any) {
      this.logger.warning(`Fetch error for ${url}: ${error.message}`);
      return null;
    }
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href")?.trim();
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      try {
        const absUrl = new URL(href, baseUrl).toString();
        const normalized = normalizeUrl(absUrl);
        links.push(normalized);
      } catch (error) {
        // Invalid URL
        console.log("Invalid URL");
      }
    });

    return links;
  }

  private saveHtml(content: string, index: number, url: string): string {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const base = slugifyForFilename(url);
    const filename = `${String(index).padStart(4, "0")}_${base}.html`;
    const filepath = path.join(this.config.outputDir, filename);

    try {
      fs.writeFileSync(filepath, content, "utf-8");
      this.logger.debug(`Successfully saved HTML to ${filepath}`);
    } catch (error: any) {
      this.logger.error(`Failed to save HTML to ${filepath}: ${error.message}`);
      throw error;
    }

    return filepath;
  }

  async crawl(): Promise<void> {
    this.logger.info("Initializing crawler (Axios + Cheerio)...");
    this.logger.info(
      `Configuration: Output dir: ${this.config.outputDir}, Max pages: ${this.config.maxPages}`
    );
    this.logger.info(`Start URLs: ${this.config.startUrls.join(", ")}`);

    if (this.config.proxyUrl) {
      this.logger.info(`Proxy configured: ${this.config.proxyUrl}`);
    } else {
      this.logger.info("No proxy configured");
    }

    // Initial seed
    for (const seed of this.config.startUrls) {
      try {
        const seedNorm = normalizeUrl(seed);
        if (
          isListingCandidate(
            seedNorm,
            this.config.allowedDomain,
            this.config.allowedPathPrefixes,
            this.config.excludedPathSubstrings,
            this.config.excludedExtensions
          )
        ) {
          this.queue.push(seedNorm);
        }
      } catch (e: any) {
        this.logger.warning(`Invalid seed URL: ${seed} - ${e.message}`);
      }
    }

    if (this.queue.length === 0) {
      this.logger.error("No valid START_URLS.");
      process.exit(2);
    }

    this.logger.info(`Starting crawl. Max pages: ${this.config.maxPages}`);

    while (this.queue.length > 0 && this.savedCount < this.config.maxPages) {
      const url = this.queue.shift()!;

      if (this.visited.has(url)) continue;
      this.visited.add(url);

      // Check candidacy
      if (
        !isListingCandidate(
          url,
          this.config.allowedDomain,
          this.config.allowedPathPrefixes,
          this.config.excludedPathSubstrings,
          this.config.excludedExtensions
        )
      ) {
        continue;
      }

      await politeSleep(this.config.crawlDelayMin, this.config.crawlDelayMax);

      const result = await this.fetch(url);
      if (!result) continue;

      const { content, status } = result;

      this.logger.debug(`Fetched ${url} (Status: ${status})`);

      if (!this.savedUrls.has(url)) {
        const filepath = this.saveHtml(content, this.savedCount + 1, url);
        this.savedCount++;
        this.savedUrls.add(url);
        this.logger.info(
          `Saved ${this.savedCount}/${this.config.maxPages}: ${url} -> ${filepath}`
        );
      }

      const links = this.extractLinks(content, url);
      for (const link of links) {
        if (
          !this.visited.has(link) &&
          !this.queue.includes(link) &&
          isListingCandidate(
            link,
            this.config.allowedDomain,
            this.config.allowedPathPrefixes,
            this.config.excludedPathSubstrings,
            this.config.excludedExtensions
          )
        ) {
          this.queue.push(link);
        }
      }
    }

    this.logger.info(`Crawl completed. Saved ${this.savedCount} pages.`);
  }
}
