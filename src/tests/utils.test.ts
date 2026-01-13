import { normalizeUrl, slugifyForFilename, isListingCandidate } from "../utils";

function testUtils() {
  console.log("🧪 Testing utility functions...\n");

  // Test normalizeUrl
  console.log("=== Testing normalizeUrl ===");
  const testUrls = [
    "http://carzone.ie/cars",
    "https://www.carzone.ie/cars?page=2",
    "https://carzone.ie/cars#section",
    "https://www.carzone.ie:443/cars",
  ];

  testUrls.forEach((url) => {
    try {
      const normalized = normalizeUrl(url);
      console.log(`✅ ${url} -> ${normalized}`);
    } catch (error: any) {
      console.log(`❌ ${url} -> Error: ${error.message}`);
    }
  });

  // Test slugifyForFilename
  console.log("\n=== Testing slugifyForFilename ===");
  const slugifyUrls = [
    "https://www.carzone.ie/cars",
    "https://www.carzone.ie/used-cars/toyota-corolla",
    "https://www.carzone.ie/cars?page=2&sort=price",
  ];

  slugifyUrls.forEach((url) => {
    const slug = slugifyForFilename(url);
    console.log(`✅ ${url} -> ${slug}.html`);
  });

  // Test isListingCandidate
  console.log("\n=== Testing isListingCandidate ===");
  const candidateTests = [
    { url: "https://www.carzone.ie/cars", expected: true },
    { url: "https://www.carzone.ie/used-cars", expected: true },
    { url: "https://www.carzone.ie/cars/toyota-corolla", expected: true },
    { url: "https://www.carzone.ie/news/article", expected: false },
    { url: "https://www.carzone.ie/login", expected: false },
    { url: "https://www.carzone.ie/cars/image.jpg", expected: false },
    { url: "https://example.com/cars", expected: false }, // Wrong domain
  ];

  const allowedDomain = "carzone.ie";
  const allowedPathPrefixes = ["/cars", "/used-cars"];
  const excludedSubstrings = ["/news", "/login"];
  const excludedExtensions = [".jpg", ".png"];

  candidateTests.forEach(({ url, expected }) => {
    const result = isListingCandidate(
      url,
      allowedDomain,
      allowedPathPrefixes,
      excludedSubstrings,
      excludedExtensions
    );
    const status = result === expected ? "✅" : "❌";
    console.log(`${status} ${url} -> ${result} (expected: ${expected})`);
  });

  console.log("\n✨ Utility tests completed!");
}

// Run if called directly
if (require.main === module) {
  testUtils();
}

export { testUtils };
