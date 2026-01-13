import { Logger } from "./logger";
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
export declare class Crawler {
    private config;
    private logger;
    private session;
    private queue;
    private visited;
    private savedUrls;
    private savedCount;
    constructor(config: CrawlerConfig, logger: Logger);
    private createSession;
    private randomUserAgent;
    private fetch;
    private extractLinks;
    private saveHtml;
    crawl(): Promise<void>;
}
export {};
//# sourceMappingURL=crawler.d.ts.map