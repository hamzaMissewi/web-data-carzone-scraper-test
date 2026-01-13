export declare function slugifyForFilename(url: string): string;
export declare function normalizeUrl(url: string): string;
export declare function isSameDomain(url: string, allowedDomain: string): boolean;
export declare function isHtmlResponse(contentType: string): boolean;
export declare function isExcludedPath(path: string, excludedSubstrings: string[], excludedExtensions: string[]): boolean;
export declare function isListingCandidate(url: string, allowedDomain: string, allowedPathPrefixes: string[], excludedSubstrings: string[], excludedExtensions: string[]): boolean;
export declare function politeSleep(minDelay: number, maxDelay: number): Promise<void>;
//# sourceMappingURL=utils.d.ts.map