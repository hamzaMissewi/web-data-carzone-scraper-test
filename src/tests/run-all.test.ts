import { testConnection } from "../debug_check";
import { testCrawler } from "./crawler.test";
import { testUtils } from "./utils.test";

async function runAllTests() {
  console.log("🚀 Running all test suites...\n");

  try {
    // Test 1: Utility functions
    console.log("=== SUITE 1: Utility Functions ===");
    testUtils();

    // Test 2: Connection tests
    console.log("\n=== SUITE 2: Connection Tests ===");
    await testConnection();

    // Test 3: Crawler integration test
    console.log("\n=== SUITE 3: Crawler Integration Test ===");
    await testCrawler();

    console.log("\n🎉 All test suites completed successfully!");
  } catch (error: any) {
    console.error("\n💥 Test suite failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
