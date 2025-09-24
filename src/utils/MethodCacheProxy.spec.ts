import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import Keyv from "keyv";
import { MethodCacheProxy, createMethodCacheProxy } from "./MethodCacheProxy";

describe("MethodCacheProxy", () => {
  let store: Keyv;
  let testObject: any;
  let callCount: Record<string, number>;

  beforeEach(() => {
    store = new Keyv({ namespace: "test" });
    callCount = {};

    testObject = {
      async fetchData(id: string) {
        callCount.fetchData = (callCount.fetchData || 0) + 1;
        return { id, data: `data-${id}` };
      },
      async computeValue(a: number, b: number) {
        callCount.computeValue = (callCount.computeValue || 0) + 1;
        return a + b;
      },
      nested: {
        async fetchNested(param: string) {
          callCount.fetchNested = (callCount.fetchNested || 0) + 1;
          return `nested-${param}`;
        },
        deeper: {
          async fetchDeeper(x: number) {
            callCount.fetchDeeper = (callCount.fetchDeeper || 0) + 1;
            return x * 2;
          },
        },
      },
      sync: {
        getValue(key: string) {
          callCount.getValue = (callCount.getValue || 0) + 1;
          return `value-${key}`;
        },
      },
    };
  });

  afterEach(async () => {
    await store.clear();
  });

  describe("Basic caching", () => {
    it("should cache method results", async () => {
      const proxy = createMethodCacheProxy({ store, root: testObject });

      const result1 = await proxy.fetchData("test-id");
      expect(result1).toEqual({ id: "test-id", data: "data-test-id" });
      expect(callCount.fetchData).toBe(1);

      const result2 = await proxy.fetchData("test-id");
      expect(result2).toEqual({ id: "test-id", data: "data-test-id" });
      expect(callCount.fetchData).toBe(1); // Should still be 1 (cached)
    });

    it("should cache with different arguments separately", async () => {
      const proxy = createMethodCacheProxy({ store, root: testObject });

      const result1 = await proxy.computeValue(5, 3);
      expect(result1).toBe(8);
      expect(callCount.computeValue).toBe(1);

      const result2 = await proxy.computeValue(10, 20);
      expect(result2).toBe(30);
      expect(callCount.computeValue).toBe(2);

      const result3 = await proxy.computeValue(5, 3);
      expect(result3).toBe(8);
      expect(callCount.computeValue).toBe(2); // Cached
    });
  });

  describe("Nested object support", () => {
    it("should cache nested object methods", async () => {
      const proxy = createMethodCacheProxy({ store, root: testObject });

      const result1 = await proxy.nested.fetchNested("test");
      expect(result1).toBe("nested-test");
      expect(callCount.fetchNested).toBe(1);

      const result2 = await proxy.nested.fetchNested("test");
      expect(result2).toBe("nested-test");
      expect(callCount.fetchNested).toBe(1); // Cached
    });

    it("should cache deeply nested object methods", async () => {
      const proxy = createMethodCacheProxy({ store, root: testObject });

      const result1 = await proxy.nested.deeper.fetchDeeper(5);
      expect(result1).toBe(10);
      expect(callCount.fetchDeeper).toBe(1);

      const result2 = await proxy.nested.deeper.fetchDeeper(5);
      expect(result2).toBe(10);
      expect(callCount.fetchDeeper).toBe(1); // Cached
    });
  });

  describe("Synchronous method wrapping", () => {
    it("should wrap synchronous methods as async", async () => {
      const proxy = createMethodCacheProxy({ store, root: testObject });

      const result1 = await proxy.sync.getValue("test");
      expect(result1).toBe("value-test");
      expect(callCount.getValue).toBe(1);

      const result2 = await proxy.sync.getValue("test");
      expect(result2).toBe("value-test");
      expect(callCount.getValue).toBe(1); // Cached
    });
  });

  describe("Custom key generation", () => {
    it("should use custom getKey function", async () => {
      const customGetKey = jest.fn((path, args) => {
        return `custom:${path.join(":")}:${JSON.stringify(args)}`;
      });

      const proxy = createMethodCacheProxy({
        store,
        root: testObject,
        getKey: customGetKey,
      });

      await proxy.fetchData("test");
      expect(customGetKey).toHaveBeenCalledWith(["fetchData"], ["test"]);

      await proxy.nested.fetchNested("param");
      expect(customGetKey).toHaveBeenCalledWith(["nested", "fetchNested"], ["param"]);
    });

    it("should use namespace in default key generation", async () => {
      const proxy = new MethodCacheProxy({
        store,
        root: testObject,
        namespace: "custom-namespace",
      });

      const proxied = proxy.getProxy();
      await proxied.fetchData("test");
      expect(callCount.fetchData).toBe(1);

      // Verify caching works with custom namespace
      await proxied.fetchData("test");
      expect(callCount.fetchData).toBe(1); // Should be cached
    });
  });

  describe("Cache management", () => {
    it("should clear all cached values", async () => {
      const proxy = new MethodCacheProxy({ store, root: testObject });
      const proxied = proxy.getProxy();

      await proxied.fetchData("test1");
      await proxied.fetchData("test2");
      expect(callCount.fetchData).toBe(2);

      await proxy.clear();

      await proxied.fetchData("test1");
      await proxied.fetchData("test2");
      expect(callCount.fetchData).toBe(4); // Should call again after clear
    });

    it("should delete specific cached value", async () => {
      const proxy = new MethodCacheProxy({ store, root: testObject });
      const proxied = proxy.getProxy();

      await proxied.fetchData("test");
      expect(callCount.fetchData).toBe(1);

      await proxy.delete(["fetchData"], ["test"]);

      await proxied.fetchData("test");
      expect(callCount.fetchData).toBe(2); // Should call again after delete
    });
  });

  describe("Error handling", () => {
    it("should not cache undefined results", async () => {
      const errorObject = {
        async mayFail(shouldFail: boolean) {
          callCount.mayFail = (callCount.mayFail || 0) + 1;
          if (shouldFail) return undefined;
          return "success";
        },
      };

      const proxy = createMethodCacheProxy({ store, root: errorObject });

      const result1 = await proxy.mayFail(true);
      expect(result1).toBeUndefined();
      expect(callCount.mayFail).toBe(1);

      const result2 = await proxy.mayFail(true);
      expect(result2).toBeUndefined();
      expect(callCount.mayFail).toBe(2); // Should not be cached

      const result3 = await proxy.mayFail(false);
      expect(result3).toBe("success");
      expect(callCount.mayFail).toBe(3);

      const result4 = await proxy.mayFail(false);
      expect(result4).toBe("success");
      expect(callCount.mayFail).toBe(3); // Should be cached
    });

    it("should propagate errors without caching", async () => {
      const errorObject = {
        async throwError() {
          callCount.throwError = (callCount.throwError || 0) + 1;
          throw new Error("Test error");
        },
      };

      const proxy = createMethodCacheProxy({ store, root: errorObject });

      await expect(proxy.throwError()).rejects.toThrow("Test error");
      expect(callCount.throwError).toBe(1);

      await expect(proxy.throwError()).rejects.toThrow("Test error");
      expect(callCount.throwError).toBe(2); // Should not be cached
    });
  });

  describe("Concurrent requests", () => {
    it("should handle concurrent requests for same key", async () => {
      const slowObject = {
        async slowFetch(id: string) {
          callCount.slowFetch = (callCount.slowFetch || 0) + 1;
          await new Promise((resolve) => setTimeout(resolve, 100));
          return `slow-${id}`;
        },
      };

      const proxy = createMethodCacheProxy({ store, root: slowObject });

      const promises = [
        proxy.slowFetch("test"),
        proxy.slowFetch("test"),
        proxy.slowFetch("test"),
      ];

      const results = await Promise.all(promises);
      expect(results).toEqual(["slow-test", "slow-test", "slow-test"]);
      // May be called multiple times due to race conditions
      expect(callCount.slowFetch).toBeGreaterThanOrEqual(1);
      expect(callCount.slowFetch).toBeLessThanOrEqual(3);
    });
  });

  describe("Property access", () => {
    it("should not interfere with non-function properties", async () => {
      const objectWithProps = {
        value: 42,
        text: "hello",
        async getData() {
          return this.value;
        },
      };

      const proxy = createMethodCacheProxy({ store, root: objectWithProps });

      expect(proxy.value).toBe(42);
      expect(proxy.text).toBe("hello");

      const result = await proxy.getData();
      expect(result).toBe(42);
    });
  });
});