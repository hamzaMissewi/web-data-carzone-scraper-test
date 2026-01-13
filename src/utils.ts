import { URL } from "url";
import * as crypto from "crypto";

export function slugifyForFilename(url: string): string {
  try {
    const parsed = new URL(url);
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
  } catch (error) {
    return "invalid_url";
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Force HTTPS
    parsed.protocol = "https:";

    // Remove default ports
    if (parsed.port === "80" || parsed.port === "443") {
      parsed.port = "";
    }

    // Remove fragment
    parsed.hash = "";

    return parsed.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export function isSameDomain(url: string, allowedDomain: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === allowedDomain || host.endsWith(`.${allowedDomain}`);
  } catch (error) {
    return false;
  }
}

export function isHtmlResponse(contentType: string): boolean {
  return (
    contentType.includes("text/html") ||
    contentType.includes("application/xhtml+xml")
  );
}

export function isExcludedPath(
  path: string,
  excludedSubstrings: string[],
  excludedExtensions: string[]
): boolean {
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

export function isListingCandidate(
  url: string,
  allowedDomain: string,
  allowedPathPrefixes: string[],
  excludedSubstrings: string[],
  excludedExtensions: string[]
): boolean {
  try {
    const parsed = new URL(url);

    if (!isSameDomain(url, allowedDomain)) {
      return false;
    }

    const path = parsed.pathname || "/";

    if (isExcludedPath(path, excludedSubstrings, excludedExtensions)) {
      return false;
    }

    // Check if path matches allowed prefixes
    if (
      allowedPathPrefixes.some(
        (prefix) => path === prefix || path.startsWith(prefix + "/")
      )
    ) {
      return true;
    }

    // Allow pagination-like query on /cars
    if (path === "/cars") {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

export function politeSleep(minDelay: number, maxDelay: number): Promise<void> {
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  return new Promise((resolve) => setTimeout(resolve, delay * 1000));
}
