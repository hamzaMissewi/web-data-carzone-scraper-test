import axios from "axios";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

interface TestConfig {
  url: string;
  proxyUrl?: string;
  userAgent?: string;
}

async function testConnection(
  config: TestConfig = { url: "https://www.carzone.ie/used-cars" }
) {
  console.log(`🔍 Testing connection to ${config.url}...`);

  const axiosConfig: any = {
    headers: {
      "User-Agent":
        config.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    },
    validateStatus: () => true,
    timeout: 30000,
  };

  // console.log(`Status: ${response.status}`);
  // console.log(`Content-Type: ${response.headers["content-type"]}`);
  // console.log(`Length: ${response.data.length}`);

  // Add proxy if provided
  if (config.proxyUrl && config.proxyUrl.trim() !== "") {
    try {
      if (config.proxyUrl.startsWith("socks")) {
        axiosConfig.httpsAgent = new SocksProxyAgent(config.proxyUrl);
        axiosConfig.httpAgent = new SocksProxyAgent(config.proxyUrl);
      } else {
        axiosConfig.httpsAgent = new HttpsProxyAgent(config.proxyUrl);
        axiosConfig.httpAgent = new HttpsProxyAgent(config.proxyUrl);
      }
      console.log(`🔗 Using proxy: ${config.proxyUrl}`);
    } catch (error: any) {
      console.error(`❌ Failed to create proxy agent: ${error.message}`);
      return;
    }
  }

  try {
    const startTime = Date.now();
    const response = await axios.get(config.url, axiosConfig);
    const endTime = Date.now();

    console.log(`\n✅ Connection successful!`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`⏱️  Response time: ${endTime - startTime}ms`);
    console.log(`📄 Content-Type: ${response.headers["content-type"]}`);
    console.log(`📏 Content length: ${response.data.length} characters`);

    if (typeof response.data === "string") {
      const $ = cheerio.load(response.data);
      const title = $("title").text().trim();
      console.log(`🏷️  Page title: ${title}`);

      const links = $("a").length;
      console.log(`🔗 Total links found: ${links}`);

      const listingLinks = $('a[href*="/used-cars/"]').length;
      console.log(`🚗 Car listing links: ${listingLinks}`);

      const carLinks = $('a[href*="/cars/"]').length;
      console.log(`🚙 General car links: ${carLinks}`);

      // Check for anti-bot measures
      const hasCloudflare =
        response.data.includes("cloudflare") ||
        response.data.includes("CF-Ray");
      const hasCaptcha =
        response.data.includes("captcha") ||
        response.data.includes("recaptcha");

      if (hasCloudflare) {
        console.log(`☁️  Cloudflare detected`);
      }
      if (hasCaptcha) {
        console.log(
          `🤖 CAPTCHA detected - may need proxy or different approach`
        );
      }

      console.log(`\n📝 HTML Preview (first 300 chars):`);
      console.log(response.data.substring(0, 300) + "...");
    } else {
      console.log(
        `⚠️  Response is not a string, type: ${typeof response.data}`
      );
    }
  } catch (error: any) {
    console.error(`\n❌ Connection failed:`);
    console.error(`🔍 Error: ${error.message}`);
    if (error.code) {
      console.error(`🔧 Error code: ${error.code}`);
    }
    if (error.response) {
      console.error(`📊 Response status: ${error.response.status}`);
      console.error(
        `📄 Response headers: ${JSON.stringify(
          error.response.headers,
          null,
          2
        )}`
      );
    }
  }
}

// Test functions for different scenarios
async function runAllTests() {
  console.log(`🚀 Starting comprehensive connection tests...\n`);

  // Test 1: Basic connection
  console.log(`\n=== Test 1: Basic Connection ===`);
  await testConnection();

  // Test 2: With proxy (if available)
  const proxyUrl = process.env.PROXY_URL;
  if (proxyUrl && proxyUrl.trim() !== "") {
    console.log(`\n=== Test 2: With Proxy ===`);
    await testConnection({ url: "https://www.carzone.ie/used-cars", proxyUrl });
  } else {
    console.log(`\n=== Test 2: Proxy Test Skipped ===`);
    console.log(
      `ℹ️  Set PROXY_URL environment variable to test proxy connectivity`
    );
  }

  // Test 3: Different endpoints
  console.log(`\n=== Test 3: Different Endpoints ===`);
  await testConnection({ url: "https://www.carzone.ie/cars" });

  console.log(`\n✨ All tests completed!`);
}

// Export for use in other files
export { testConnection, runAllTests, TestConfig };

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
