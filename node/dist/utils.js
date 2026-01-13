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
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyForFilename = slugifyForFilename;
exports.normalizeUrl = normalizeUrl;
exports.isSameDomain = isSameDomain;
exports.isHtmlResponse = isHtmlResponse;
exports.isExcludedPath = isExcludedPath;
exports.isListingCandidate = isListingCandidate;
exports.politeSleep = politeSleep;
const url_1 = require("url");
const crypto = __importStar(require("crypto"));
function slugifyForFilename(url) {
    try {
        const parsed = new url_1.URL(url);
        let path = parsed.pathname.replace(/^\/+|\/+$/g, "");
        let pathSlug = path.replace(/[^a-zA-Z0-9\-_/]+/g, "-").replace(/\//g, "-");
        if (!pathSlug) {
            pathSlug = "root";
        }
        const query = parsed.search.substring(1); // Remove leading '?'
        const queryHash = query
            ? crypto.createHash("sha1").update(query).digest("hex").substring(0, 8)
            : "noq";
        const host = parsed.hostname.replace(/:/g, "_");
        return `${host}_${pathSlug}_${queryHash}`;
    }
    catch (error) {
        return "invalid_url";
    }
}
function normalizeUrl(url) {
    try {
        const parsed = new url_1.URL(url);
        // Force HTTPS
        parsed.protocol = "https:";
        // Remove default ports
        if (parsed.port === "80" || parsed.port === "443") {
            parsed.port = "";
        }
        // Remove fragment
        parsed.hash = "";
        return parsed.toString();
    }
    catch (error) {
        throw new Error(`Invalid URL: ${url}`);
    }
}
function isSameDomain(url, allowedDomain) {
    try {
        const parsed = new url_1.URL(url);
        const host = parsed.hostname.toLowerCase();
        return host === allowedDomain || host.endsWith(`.${allowedDomain}`);
    }
    catch (error) {
        return false;
    }
}
function isHtmlResponse(contentType) {
    return (contentType.includes("text/html") ||
        contentType.includes("application/xhtml+xml"));
}
function isExcludedPath(path, excludedSubstrings, excludedExtensions) {
    const lower = path.toLowerCase();
    // Check extensions
    if (excludedExtensions.some((ext) => lower.endsWith(ext))) {
        return true;
    }
    // Check substrings
    if (excludedSubstrings.some((substr) => lower.includes(substr))) {
        return true;
    }
    return false;
}
function isListingCandidate(url, allowedDomain, allowedPathPrefixes, excludedSubstrings, excludedExtensions) {
    try {
        const parsed = new url_1.URL(url);
        if (!isSameDomain(url, allowedDomain)) {
            return false;
        }
        const path = parsed.pathname || "/";
        if (isExcludedPath(path, excludedSubstrings, excludedExtensions)) {
            return false;
        }
        // Check if path matches allowed prefixes
        if (allowedPathPrefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"))) {
            return true;
        }
        // Allow pagination-like query on /cars
        if (path === "/cars") {
            return true;
        }
        return false;
    }
    catch (error) {
        return false;
    }
}
function politeSleep(minDelay, maxDelay) {
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;
    return new Promise((resolve) => setTimeout(resolve, delay * 1000));
}
//# sourceMappingURL=utils.js.map