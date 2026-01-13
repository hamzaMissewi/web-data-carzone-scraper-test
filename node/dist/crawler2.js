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
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const https_proxy_agent_1 = require("https-proxy-agent");
// Configuration du logging
const logger = {
    info: (msg) => console.log(`${new Date().toISOString()} - INFO - ${msg}`),
    error: (msg) => console.error(`${new Date().toISOString()} - ERROR - ${msg}`),
    warning: (msg) => console.warn(`${new Date().toISOString()} - WARNING - ${msg}`),
};
class CarZoneCrawler {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.outputDir = config.outputDir;
        this.maxPages = config.maxPages;
        this.visitedUrls = new Set();
        this.pagesSaved = 0;
        // Configuration du client HTTP avec proxy si fourni
        const axiosConfig = {
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                Connection: "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Cache-Control": "max-age=0",
            },
        };
        // REQUIREMENT: Utiliser le proxy spécifié
        if (config.proxyUrl) {
            axiosConfig.httpsAgent = new https_proxy_agent_1.HttpsProxyAgent(config.proxyUrl);
            logger.info(`Proxy configuré: ${config.proxyUrl}`);
        }
        this.client = axios_1.default.create(axiosConfig);
    }
    async initialize() {
        // REQUIREMENT: Stocker les fichiers HTML dans un dossier local
        await fs.mkdir(this.outputDir, { recursive: true });
    }
    async getPage(url) {
        try {
            const response = await this.client.get(url);
            if (response.status !== 200) {
                logger.error(`Erreur HTTP ${response.status} pour ${url}`);
                return null;
            }
            return response.data;
        }
        catch (error) {
            logger.error(`Erreur lors de la récupération de ${url}: ${error.message}`);
            return null;
        }
    }
    async savePage(url, htmlContent) {
        // REQUIREMENT: Enregistrer chaque page en HTML brut
        const filename = `page_${String(this.pagesSaved + 1).padStart(4, "0")}.html`;
        const filepath = path.join(this.outputDir, filename);
        try {
            await fs.writeFile(filepath, htmlContent, "utf-8");
            // Sauvegarde aussi l'URL correspondante
            const metaFile = path.join(this.outputDir, `page_${String(this.pagesSaved + 1).padStart(4, "0")}_url.txt`);
            await fs.writeFile(metaFile, url, "utf-8");
            this.pagesSaved++;
            logger.info(`Page ${this.pagesSaved}/${this.maxPages} sauvegardée: ${filename}`);
            return true;
        }
        catch (error) {
            logger.error(`Erreur lors de la sauvegarde de ${url}: ${error.message}`);
            return false;
        }
    }
    extractCarListingUrls(htmlContent, baseUrl) {
        const $ = cheerio.load(htmlContent);
        const urls = new Set();
        $("a[href]").each((_, element) => {
            const href = $(element).attr("href");
            if (!href)
                return;
            const fullUrl = new URL(href, baseUrl).href;
            // Filtre pour ne garder que les URLs d'annonces de voitures
            if (fullUrl.includes("/car/") || fullUrl.includes("/advert/")) {
                urls.add(fullUrl);
            }
        });
        return Array.from(urls);
    }
    getListingPages() {
        const listingUrls = [];
        const searchUrl = "https://www.carzone.ie/used-cars";
        // Parcourt plusieurs pages de résultats
        for (let pageNum = 1; pageNum <= 40; pageNum++) {
            const url = pageNum === 1 ? searchUrl : `${searchUrl}?page=${pageNum}`;
            listingUrls.push(url);
            if (listingUrls.length >= 35) {
                break;
            }
        }
        return listingUrls;
    }
    async crawl() {
        // REQUIREMENT: Crawler 200 pages
        logger.info(`Début du crawling de ${this.baseUrl}`);
        logger.info(`Objectif: ${this.maxPages} pages`);
        const listingPages = this.getListingPages();
        logger.info(`Pages de liste à parcourir: ${listingPages.length}`);
        const carUrls = [];
        // Parcourt les pages de liste pour extraire les URLs des annonces
        for (const listUrl of listingPages) {
            if (this.pagesSaved >= this.maxPages) {
                break;
            }
            logger.info(`Parcours de la page liste: ${listUrl}`);
            const html = await this.getPage(listUrl);
            if (html) {
                const urls = this.extractCarListingUrls(html, listUrl);
                carUrls.push(...urls);
                logger.info(`URLs d'annonces trouvées: ${urls.length}`);
            }
            else {
                logger.warning(`Impossible de lire la page liste ${listUrl}, passage à la suivante...`);
            }
            // Délai pour simuler un humain
            await this.sleep(2000);
        }
        // Déduplique les URLs
        const uniqueCarUrls = Array.from(new Set(carUrls));
        logger.info(`Total d'annonces uniques trouvées: ${uniqueCarUrls.length}`);
        // Crawl les pages d'annonces individuelles
        for (const url of uniqueCarUrls) {
            if (this.pagesSaved >= this.maxPages) {
                break;
            }
            if (this.visitedUrls.has(url)) {
                continue;
            }
            const html = await this.getPage(url);
            if (html) {
                await this.savePage(url, html);
                this.visitedUrls.add(url);
            }
            else {
                logger.warning(`Échec répété pour ${url}`);
            }
            // Délai entre les requêtes
            await this.sleep(1500);
        }
        logger.info(`Crawling terminé. ${this.pagesSaved} pages sauvegardées.`);
        // Crée un fichier de résumé
        const summaryFile = path.join(this.outputDir, "crawl_summary.txt");
        const summary = [
            "Crawl Summary",
            "=============",
            `Base URL: ${this.baseUrl}`,
            `Pages saved: ${this.pagesSaved}`,
            `Target: ${this.maxPages}`,
            `Proxy used: ${!!this.client.defaults.httpsAgent}`,
        ].join("\n");
        await fs.writeFile(summaryFile, summary, "utf-8");
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
async function main() {
    // REQUIREMENT: Le Dockerfile doit permettre de définir dynamiquement une URL de proxy
    const proxyUrl = process.env.PROXY_URL || undefined;
    // REQUIREMENT: Stocker les fichiers HTML dans un dossier local monté depuis l'hôte
    const outputDir = process.env.OUTPUT_DIR || "/app/output";
    // REQUIREMENT: Crawler 200 pages
    const maxPages = parseInt(process.env.MAX_PAGES || "200", 10);
    const baseUrl = process.env.BASE_URL || "https://www.carzone.ie";
    logger.info("=== CarZone.ie Crawler (TypeScript) ===");
    logger.info(`Output directory: ${outputDir}`);
    logger.info(`Max pages: ${maxPages}`);
    logger.info(`Proxy: ${proxyUrl || "None"}`);
    const crawler = new CarZoneCrawler({
        baseUrl,
        outputDir,
        proxyUrl,
        maxPages,
    });
    try {
        await crawler.initialize();
        // REQUIREMENT: Une fois lancé, l'exécution doit automatiquement Crawler les 200 pages
        await crawler.crawl();
        logger.info("Crawler terminé avec succès!");
        process.exit(0);
    }
    catch (error) {
        logger.error(`Erreur fatale: ${error.message}`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=crawler2.js.map