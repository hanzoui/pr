import Keyv from "keyv";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { MethodCacheProxy } from "./MethodCacheProxy";

describe("MethodCacheProxy", () => {
  let store: Keyv;
  let testObject: any;
  let cacheProxy: MethodCacheProxy<any>;

  beforeEach(async () => {
    // Use in-memory store for testing
    store = new Keyv();

    // Create a test object with various method types
    testObject = {
      syncMethod: vi.fn((x: number) => x * 2),
      asyncMethod: vi.fn(async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 3;
      }),
      errorMethod: vi.fn(async () => {
        throw new Error("Test error");
      }),
      nested: {
        deepMethod: vi.fn(async (x: string) => `Hello ${x}`),
        level2: {
          level3Method: vi.fn((x: number) => x + 10)
        }
      },
      counter: 0,
      incrementCounter: vi.fn(function() {
        this.counter++;
        return this.counter;
      })
    };
  });

  afterEach(async () => {
    await store.clear();
  });

  it("should cache method results", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    // First call - should execute the original method
    const result1 = await proxy.asyncMethod(5);
    expect(result1).toBe(15);
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(1);

    // Second call with same args - should use cache
    const result2 = await proxy.asyncMethod(5);
    expect(result2).toBe(15);
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(1); // Still only called once

    // Different args - should execute again
    const result3 = await proxy.asyncMethod(10);
    expect(result3).toBe(30);
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(2);
  });

  it("should work with sync methods", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    const result1 = await proxy.syncMethod(4);
    expect(result1).toBe(8);
    expect(testObject.syncMethod).toHaveBeenCalledTimes(1);

    const result2 = await proxy.syncMethod(4);
    expect(result2).toBe(8);
    expect(testObject.syncMethod).toHaveBeenCalledTimes(1);
  });

  it("should handle nested objects", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    const result1 = await proxy.nested.deepMethod("World");
    expect(result1).toBe("Hello World");
    expect(testObject.nested.deepMethod).toHaveBeenCalledTimes(1);

    const result2 = await proxy.nested.deepMethod("World");
    expect(result2).toBe("Hello World");
    expect(testObject.nested.deepMethod).toHaveBeenCalledTimes(1);

    // Test deeply nested
    const result3 = await proxy.nested.level2.level3Method(5);
    expect(result3).toBe(15);
    expect(testObject.nested.level2.level3Method).toHaveBeenCalledTimes(1);

    const result4 = await proxy.nested.level2.level3Method(5);
    expect(result4).toBe(15);
    expect(testObject.nested.level2.level3Method).toHaveBeenCalledTimes(1);
  });

  it("should not cache errors by default", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    await expect(proxy.errorMethod()).rejects.toThrow("Test error");
    expect(testObject.errorMethod).toHaveBeenCalledTimes(1);

    // Should call again since error wasn't cached
    await expect(proxy.errorMethod()).rejects.toThrow("Test error");
    expect(testObject.errorMethod).toHaveBeenCalledTimes(2);
  });

  it("should use custom getKey function", async () => {
    const customGetKey = vi.fn((path: (string | symbol)[], args: any[]) => {
      return `custom:${path.join("/")}:${JSON.stringify(args)}`;
    });

    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
      getKey: customGetKey,
    });

    const proxy = cacheProxy.getProxy();

    await proxy.asyncMethod(5);
    expect(customGetKey).toHaveBeenCalledWith(["asyncMethod"], [5]);

    await proxy.nested.deepMethod("Test");
    expect(customGetKey).toHaveBeenCalledWith(["nested", "deepMethod"], ["Test"]);
  });

  it("should use custom shouldCache function", async () => {
    const shouldCache = vi.fn((path, args, result, error) => {
      // Only cache if result is greater than 10
      return !error && result > 10;
    });

    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
      shouldCache,
    });

    const proxy = cacheProxy.getProxy();

    // Result is 6 (3*2), should not cache
    await proxy.asyncMethod(2);
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(1);

    await proxy.asyncMethod(2);
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(2); // Called again, not cached

    // Result is 15 (5*3), should cache
    await proxy.asyncMethod(5);
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(3);

    await proxy.asyncMethod(5);
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(3); // Cached
  });

  it("should provide cache management methods", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    await proxy.asyncMethod(5);

    // Test has method
    const key = "asyncMethod([5])";
    expect(await cacheProxy.has(key)).toBe(true);

    // Test get method
    expect(await cacheProxy.get(key)).toBe(15);

    // Test delete method
    await cacheProxy.delete(key);
    expect(await cacheProxy.has(key)).toBe(false);

    // Test set method
    await cacheProxy.set(key, 99);
    expect(await cacheProxy.get(key)).toBe(99);

    // Test clear method
    await cacheProxy.clear();
    expect(await cacheProxy.has(key)).toBe(false);
  });

  it("should handle concurrent calls to the same method", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    // Make concurrent calls
    const promises = [
      proxy.asyncMethod(7),
      proxy.asyncMethod(7),
      proxy.asyncMethod(7),
    ];

    const results = await Promise.all(promises);

    // All should return the same result
    expect(results).toEqual([21, 21, 21]);

    // Method should be called 3 times (no deduplication in current implementation)
    // This could be improved with request deduplication
    expect(testObject.asyncMethod).toHaveBeenCalledTimes(3);
  });

  it("should maintain correct 'this' context", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    const result1 = await proxy.incrementCounter();
    expect(result1).toBe(1);
    expect(testObject.counter).toBe(1);

    // This should be cached
    const result2 = await proxy.incrementCounter();
    expect(result2).toBe(1); // Cached result
    expect(testObject.counter).toBe(1); // Counter not incremented again
  });

  it("should handle null and undefined arguments", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    testObject.nullMethod = vi.fn((a: any, b: any) => `${a}-${b}`);

    const result1 = await proxy.nullMethod(null, undefined);
    expect(result1).toBe("null-undefined");
    expect(testObject.nullMethod).toHaveBeenCalledTimes(1);

    const result2 = await proxy.nullMethod(null, undefined);
    expect(result2).toBe("null-undefined");
    expect(testObject.nullMethod).toHaveBeenCalledTimes(1); // Cached
  });

  it("should handle complex argument types", async () => {
    cacheProxy = new MethodCacheProxy({
      store,
      root: testObject,
    });

    const proxy = cacheProxy.getProxy();

    testObject.complexMethod = vi.fn((obj: any) => obj.value * 2);

    const arg = { value: 5, nested: { key: "test" } };

    const result1 = await proxy.complexMethod(arg);
    expect(result1).toBe(10);
    expect(testObject.complexMethod).toHaveBeenCalledTimes(1);

    // Same object structure should use cache
    const result2 = await proxy.complexMethod({ value: 5, nested: { key: "test" } });
    expect(result2).toBe(10);
    expect(testObject.complexMethod).toHaveBeenCalledTimes(1);

    // Different object should not use cache
    const result3 = await proxy.complexMethod({ value: 6, nested: { key: "test" } });
    expect(result3).toBe(12);
    expect(testObject.complexMethod).toHaveBeenCalledTimes(2);
  });
});