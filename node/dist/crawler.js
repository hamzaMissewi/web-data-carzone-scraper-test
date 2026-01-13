"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crawler = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const cheerio = __importStar(require("cheerio"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const https_proxy_agent_1 = require("https-proxy-agent");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const utils_1 = require("./utils");
class Crawler {
    constructor(config, logger) {
        this.queue = [];
        this.visited = new Set();
        this.savedUrls = new Set();
        this.savedCount = 0;
        this.config = config;
        this.logger = logger;
        this.session = this.createSession();
    }
    createSession() {
        const axiosConfig = {
            timeout: this.config.requestTimeout * 1000,
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
                axiosConfig.httpAgent = new socks_proxy_agent_1.SocksProxyAgent(this.config.proxyUrl);
                axiosConfig.httpsAgent = new socks_proxy_agent_1.SocksProxyAgent(this.config.proxyUrl);
            }
            else {
                axiosConfig.httpAgent = new https_proxy_agent_1.HttpsProxyAgent(this.config.proxyUrl);
                axiosConfig.httpsAgent = new https_proxy_agent_1.HttpsProxyAgent(this.config.proxyUrl);
            }
        }
        const instance = axios_1.default.create(axiosConfig);
        // Configure retry logic
        (0, axios_retry_1.default)(instance, {
            retries: 5,
            retryDelay: axios_retry_1.default.exponentialDelay,
            retryCondition: (error) => {
                return (axios_retry_1.default.isNetworkOrIdempotentRequestError(error) ||
                    (error.response?.status
                        ? [429, 500, 502, 503, 504].includes(error.response.status)
                        : false));
            },
            onRetry: (retryCount, error, requestConfig) => {
                this.logger.debug(`Retry attempt ${retryCount} for ${requestConfig.url}`);
            },
        });
        return instance;
    }
    randomUserAgent() {
        return this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
    }
    async fetch(url) {
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
                await new Promise((resolve) => setTimeout(resolve, sleepSeconds * 1000));
                return null;
            }
            return response;
        }
        catch (error) {
            this.logger.warning(`Request error for ${url}: ${error.message}`);
            return null;
        }
    }
    extractLinks(html, baseUrl) {
        const $ = cheerio.load(html);
        const links = [];
        $("a[href]").each((_, element) => {
            const href = $(element).attr("href")?.trim();
            if (!href)
                return;
            // Skip special links
            if (href.startsWith("#") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:")) {
                return;
            }
            try {
                // Create absolute URL
                const absUrl = new url_1.URL(href, baseUrl).toString();
                const normalized = (0, utils_1.normalizeUrl)(absUrl);
                links.push(normalized);
            }
            catch (error) {
                // Invalid URL, skip
            }
        });
        return links;
    }
    saveHtml(content, index, url) {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }
        const base = (0, utils_1.slugifyForFilename)(url);
        const filename = `${String(index).padStart(4, "0")}_${base}.html`;
        const filepath = path.join(this.config.outputDir, filename);
        fs.writeFileSync(filepath, content, "utf-8");
        return filepath;
    }
    async crawl() {
        if (this.config.proxyUrl) {
            this.logger.info(`Proxy enabled: ${this.config.proxyUrl}`);
        }
        else {
            this.logger.info("No proxy configured. Set PROXY_URL to enable one.");
        }
        // Seed queue
        for (const seed of this.config.startUrls) {
            try {
                const seedNorm = (0, utils_1.normalizeUrl)(seed);
                if ((0, utils_1.isListingCandidate)(seedNorm, this.config.allowedDomain, this.config.allowedPathPrefixes, this.config.excludedPathSubstrings, this.config.excludedExtensions)) {
                    this.queue.push(seedNorm);
                }
            }
            catch (error) {
                // Invalid URL, skip
            }
        }
        if (this.queue.length === 0) {
            this.logger.error("No valid START_URLS after filtering. Please set START_URLS to listing pages (e.g. https://www.carzone.ie/cars).");
            process.exit(2);
        }
        this.logger.info(`Starting crawl. Targets: ${this.config.maxPages} pages. Seeds: ${this.queue.length}`);
        while (this.queue.length > 0 && this.savedCount < this.config.maxPages) {
            const url = this.queue.shift();
            if (this.visited.has(url)) {
                continue;
            }
            this.visited.add(url);
            if (!(0, utils_1.isListingCandidate)(url, this.config.allowedDomain, this.config.allowedPathPrefixes, this.config.excludedPathSubstrings, this.config.excludedExtensions)) {
                continue;
            }
            await (0, utils_1.politeSleep)(this.config.crawlDelayMin, this.config.crawlDelayMax);
            const resp = await this.fetch(url);
            if (!resp) {
                continue;
            }
            if (resp.status !== 200) {
                this.logger.debug(`Skip ${url} (status ${resp.status})`);
                continue;
            }
            const contentType = resp.headers["content-type"] || "";
            if (!(0, utils_1.isHtmlResponse)(contentType)) {
                this.logger.debug(`Non-HTML content at ${url}`);
                continue;
            }
            // Save page
            if (!this.savedUrls.has(url)) {
                const filepath = this.saveHtml(resp.data, this.savedCount + 1, url);
                this.savedCount++;
                this.savedUrls.add(url);
                this.logger.info(`Saved ${this.savedCount}/${this.config.maxPages}: ${url} -> ${filepath}`);
            }
            // Extract next candidates
            const links = this.extractLinks(resp.data, url);
            for (const link of links) {
                if (!this.visited.has(link) &&
                    (0, utils_1.isListingCandidate)(link, this.config.allowedDomain, this.config.allowedPathPrefixes, this.config.excludedPathSubstrings, this.config.excludedExtensions)) {
                    this.queue.push(link);
                }
            }
        }
        this.logger.info(`Crawl completed. Saved ${this.savedCount} pages to ${this.config.outputDir}`);
        if (this.savedCount < this.config.maxPages) {
            this.logger.warning(`Could not reach the target of ${this.config.maxPages} pages. Collected ${this.savedCount}.`);
        }
    }
}
exports.Crawler = Crawler;
//# sourceMappingURL=crawler.js.map