import axios, { AxiosInstance, AxiosResponse } from "axios";
import axiosRetry from "axios-retry";
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
  isHtmlResponse,
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
  private session: AxiosInstance;
  private queue: string[] = [];
  private visited: Set<string> = new Set();
  private savedUrls: Set<string> = new Set();
  private savedCount: number = 0;

  constructor(config: CrawlerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.session = this.createSession();
  }

  private createSession(): AxiosInstance {
    const axiosConfig: any = {
      timeout: this.config.requestTimeout * 1000,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on any status
    };

    // Configure proxy if provided
    if (this.config.proxyUrl) {
      if (this.config.proxyUrl.startsWith("socks")) {
        axiosConfig.httpAgent = new SocksProxyAgent(this.config.proxyUrl);
        axiosConfig.httpsAgent = new SocksProxyAgent(this.config.proxyUrl);
      } else {
        axiosConfig.httpAgent = new HttpsProxyAgent(this.config.proxyUrl);
        axiosConfig.httpsAgent = new HttpsProxyAgent(this.config.proxyUrl);
      }
    }

    const instance = axios.create(axiosConfig);

    // Configure retry logic
    axiosRetry(instance, {
      retries: 5,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status
            ? [429, 500, 502, 503, 504].includes(error.response.status)
            : false)
        );
      },
      onRetry: (retryCount, error, requestConfig) => {
        this.logger.debug(
          `Retry attempt ${retryCount} for ${requestConfig.url}`
        );
      },
    });

    return instance;
  }

  private randomUserAgent(): string {
    return this.config.userAgents[
      Math.floor(Math.random() * this.config.userAgents.length)
    ];
  }

  private async fetch(url: string): Promise<AxiosResponse | null> {
    try {
      const response = await this.session.get(url, {
        headers: {
          "User-Agent": this.randomUserAgent(),
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers["retry-after"];
        const sleepSeconds = retryAfter ? parseInt(retryAfter) : 5;
        this.logger.warning(`429 received. Sleeping for ${sleepSeconds}s...`);
        await new Promise((resolve) =>
          setTimeout(resolve, sleepSeconds * 1000)
        );
        return null;
      }

      return response;
    } catch (error: any) {
      this.logger.warning(`Request error for ${url}: ${error.message}`);
      return null;
    }
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href")?.trim();
      if (!href) return;

      // Skip special links
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      try {
        // Create absolute URL
        const absUrl = new URL(href, baseUrl).toString();
        const normalized = normalizeUrl(absUrl);
        links.push(normalized);
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return links;
  }

  private saveHtml(content: string, index: number, url: string): string {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const base = slugifyForFilename(url);
    const filename = `${String(index).padStart(4, "0")}_${base}.html`;
    const filepath = path.join(this.config.outputDir, filename);

    fs.writeFileSync(filepath, content, "utf-8");
    return filepath;
  }

  async crawl(): Promise<void> {
    if (this.config.proxyUrl) {
      this.logger.info(`Proxy enabled: ${this.config.proxyUrl}`);
    } else {
      this.logger.info("No proxy configured. Set PROXY_URL to enable one.");
    }

    // Seed queue
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
      } catch (error) {
        // Invalid URL, skip
      }
    }

    if (this.queue.length === 0) {
      this.logger.error(
        "No valid START_URLS after filtering. Please set START_URLS to listing pages (e.g. https://www.carzone.ie/cars)."
      );
      process.exit(2);
    }

    this.logger.info(
      `Starting crawl. Targets: ${this.config.maxPages} pages. Seeds: ${this.queue.length}`
    );

    while (this.queue.length > 0 && this.savedCount < this.config.maxPages) {
      const url = this.queue.shift()!;

      if (this.visited.has(url)) {
        continue;
      }
      this.visited.add(url);

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

      const resp = await this.fetch(url);
      if (!resp) {
        continue;
      }

      if (resp.status !== 200) {
        this.logger.debug(`Skip ${url} (status ${resp.status})`);
        continue;
      }

      const contentType = resp.headers["content-type"] || "";
      if (!isHtmlResponse(contentType)) {
        this.logger.debug(`Non-HTML content at ${url}`);
        continue;
      }

      // Save page
      if (!this.savedUrls.has(url)) {
        const filepath = this.saveHtml(resp.data, this.savedCount + 1, url);
        this.savedCount++;
        this.savedUrls.add(url);
        this.logger.info(
          `Saved ${this.savedCount}/${this.config.maxPages}: ${url} -> ${filepath}`
        );
      }

      // Extract next candidates
      const links = this.extractLinks(resp.data, url);
      for (const link of links) {
        if (
          !this.visited.has(link) &&
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

    this.logger.info(
      `Crawl completed. Saved ${this.savedCount} pages to ${this.config.outputDir}`
    );
    if (this.savedCount < this.config.maxPages) {
      this.logger.warning(
        `Could not reach the target of ${this.config.maxPages} pages. Collected ${this.savedCount}.`
      );
    }
  }
}
