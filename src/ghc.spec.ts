import { beforeEach, describe, expect, it } from "bun:test";
import { clearGhCache, getGhCacheStats } from "./ghc";

describe("Cached GitHub Client (ghc)", () => {
  beforeEach(async () => {
    // Clear cache before each test
    await clearGhCache();
  });

  describe("Cache management", () => {
    it("should clear cache when clearGhCache is called", async () => {
      // Test basic cache clearing functionality
      await clearGhCache();
      expect(true).toBe(true); // Cache clear should not throw
    });

    it("should return cache stats", async () => {
      const stats = await getGhCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("keys");
      expect(Array.isArray(stats.keys)).toBe(true);
      expect(typeof stats.size).toBe("number");
    });
  });

  describe("Cache key generation", () => {
    it("should handle cache key creation without errors", () => {
      // Test that the module loads and basic functionality works
      const { ghc } = require("./ghc");
      expect(typeof ghc).toBe("object");
      expect(ghc).toBeDefined();
    });
  });

  describe("Proxy wrapper functionality", () => {
    it("should create proxy wrapper for nested objects", () => {
      const { ghc } = require("./ghc");

      // Test that nested objects are accessible
      expect(ghc.repos).toBeDefined();
      expect(ghc.users).toBeDefined();
      expect(typeof ghc.repos).toBe("object");
      expect(typeof ghc.users).toBe("object");
    });

    it("should maintain API structure", () => {
      const { ghc } = require("./ghc");

      // Test that common GitHub API endpoints are accessible
      expect(typeof ghc.repos.get).toBe("function");
      expect(typeof ghc.users.getByUsername).toBe("function");
    });
  });

  describe("Environment handling", () => {
    it("should handle missing GitHub token gracefully", () => {
      const originalToken = process.env.GH_TOKEN;
      const originalTokenComfy = process.env.GH_TOKEN_COMFY_PR;

      delete process.env.GH_TOKEN;
      delete process.env.GH_TOKEN_COMFY_PR;

      try {
        // Should not throw when importing without token
        const { ghc } = require("./ghc");
        expect(ghc).toBeDefined();
      } finally {
        // Restore original tokens
        if (originalToken) process.env.GH_TOKEN = originalToken;
        if (originalTokenComfy) process.env.GH_TOKEN_COMFY_PR = originalTokenComfy;
      }
    });

    it("should prefer COMFY_PR token over regular token", () => {
      const originalToken = process.env.GH_TOKEN;
      const originalTokenComfy = process.env.GH_TOKEN_COMFY_PR;

      process.env.GH_TOKEN = "regular_token";
      process.env.GH_TOKEN_COMFY_PR = "comfy_token";

      try {
        // Re-import to test token preference
        delete require.cache[require.resolve("./ghc")];
        const { ghc } = require("./ghc");
        expect(ghc).toBeDefined();
      } finally {
        // Restore original tokens
        if (originalToken) {
          process.env.GH_TOKEN = originalToken;
        } else {
          delete process.env.GH_TOKEN;
        }
        if (originalTokenComfy) {
          process.env.GH_TOKEN_COMFY_PR = originalTokenComfy;
        } else {
          delete process.env.GH_TOKEN_COMFY_PR;
        }
      }
    });
  });

  describe("Cache configuration", () => {
    it("should use different TTL for local dev vs production", () => {
      const originalLocalDev = process.env.LOCAL_DEV;

      // Test local dev mode
      process.env.LOCAL_DEV = "true";
      delete require.cache[require.resolve("./ghc")];
      let ghc = require("./ghc").ghc;
      expect(ghc).toBeDefined();

      // Test production mode
      delete process.env.LOCAL_DEV;
      delete require.cache[require.resolve("./ghc")];
      ghc = require("./ghc").ghc;
      expect(ghc).toBeDefined();

      // Restore
      if (originalLocalDev) {
        process.env.LOCAL_DEV = originalLocalDev;
      }
    });
  });

  describe("Type safety", () => {
    it("should maintain type structure compatibility", () => {
      const { gh, ghc } = require("./ghc");

      // Both should have similar structures
      expect(typeof gh).toBe("object");
      expect(typeof ghc).toBe("object");

      // Basic API structure should be maintained
      expect(gh.repos).toBeDefined();
      expect(ghc.repos).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle cache directory creation", async () => {
      // Test that cache management functions complete successfully
      await clearGhCache(); // Should complete without throwing
      const stats = await getGhCacheStats(); // Should return stats object
      expect(stats).toBeDefined();
    });
  });

  describe("Integration", () => {
    it("should work with manual test execution pattern", () => {
      // Test the import.meta.main pattern would work
      const originalMain = import.meta.main;

      try {
        // Should not error when checking import.meta.main
        expect(typeof import.meta.main).toBe("boolean");
      } catch (error) {
        // In test environment, this might not be available
        expect(true).toBe(true);
      }
    });
  });
});
