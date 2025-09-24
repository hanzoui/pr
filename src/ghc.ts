import KeyvSqlite from "@keyv/sqlite";
import type { components as ghComponents } from "@octokit/openapi-types";
import crypto from "crypto";
import fs from "fs/promises";
import stableStringify from "json-stable-stringify";
import Keyv from "keyv";
import { Octokit } from "octokit";
import path from "path";
import { createLogger } from "./logger";
import { MethodCacheProxy, createMethodCacheProxy } from "./utils/MethodCacheProxy";

const logger = createLogger("ghc");

const GH_TOKEN =
  process.env.GH_TOKEN_COMFY_PR ||
  process.env.GH_TOKEN ||
  "WARNING: missing env.GH_TOKEN from https://github.com/settings/tokens?type=beta";
const octokit = new Octokit({ auth: GH_TOKEN });
export const gh = octokit.rest;

export type GH = ghComponents["schemas"];

const CACHE_DIR = path.join(process.cwd(), "node_modules/.cache/Comfy-PR");
const CACHE_FILE = path.join(CACHE_DIR, "gh-cache.sqlite");
const DEFAULT_TTL = process.env.LOCAL_DEV
  ? 30 * 60 * 1000 // cache 30 minutes when local dev
  : 1 * 60 * 1000; // cache 1 minute in production

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

let store: Keyv | null = null;
let cacheProxy: MethodCacheProxy<typeof gh> | null = null;

async function getStore() {
  if (!store) {
    await ensureCacheDir();
    store = new Keyv({
      store: new KeyvSqlite(CACHE_FILE),
      ttl: DEFAULT_TTL,
    });
  }
  return store;
}

function createGhCacheKey(path: (string | symbol)[], args: any[]): string {
  // Create a deterministic key from the path and arguments
  const apiPath = path.map(p => p.toString()).join(".");

  const argsText = args.map((e) => stableStringify(e)).join(",");
  const maxLength = 120 - apiPath.length - "gh.".length - 8 - 3; // Maximum length for args display

  let displayArgs = argsText;
  if (argsText.length > maxLength) {
    const start = argsText.substring(0, maxLength / 2);
    const end = argsText.substring(argsText.length - maxLength / 2);
    displayArgs = `${start}...${end}`;
  }

  const hash = crypto.createHash("md5").update(argsText).digest("hex").substring(0, 8);
  const cacheKey = `gh.${apiPath}(${displayArgs})#${hash}`;

  return cacheKey;
}

async function getCacheProxy() {
  if (!cacheProxy) {
    const store = await getStore();
    cacheProxy = new MethodCacheProxy({
      store,
      root: gh,
      getKey: createGhCacheKey,
      namespace: "gh",
    });
  }
  return cacheProxy;
}

export async function clearGhCache(): Promise<void> {
  const proxy = await getCacheProxy();
  await proxy.clear();
}

export async function getGhCacheStats(): Promise<{ size: number; keys: string[] }> {
  // Note: Keyv doesn't provide built-in stats, but we can query the SQLite directly if needed
  // For now, return basic info
  return { size: 0, keys: [] };
}

type DeepAsyncWrapper<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<any>
    ? T[K]
    : T[K] extends (...args: any[]) => any
      ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
      : T[K] extends object
        ? DeepAsyncWrapper<T[K]>
        : T[K];
};

// Create the cached GitHub client
const ghcPromise = (async () => {
  const store = await getStore();
  return createMethodCacheProxy({
    store,
    root: gh,
    getKey: createGhCacheKey,
    namespace: "gh",
  });
})();

export const ghc = new Proxy({} as DeepAsyncWrapper<typeof gh>, {
  get(target, prop) {
    return new Proxy(() => {}, {
      async apply(_, __, args) {
        const proxy = await ghcPromise;
        return (proxy as any)[prop](...args);
      },
      get(_, innerProp) {
        return new Proxy(() => {}, {
          async apply(_, __, args) {
            const proxy = await ghcPromise;
            return (proxy as any)[prop][innerProp](...args);
          },
          get(_, deepProp) {
            return async (...args: any[]) => {
              const proxy = await ghcPromise;
              return (proxy as any)[prop][innerProp][deepProp](...args);
            };
          },
        });
      },
    });
  },
});

// manual test with real api
if (import.meta.main) {
  async function runTest() {
    // Test the cached client
    console.info("Testing cached GitHub client...");

    // This should make a real API call
    const result1 = await ghc.repos.get({
      owner: "octocat",
      repo: "Hello-World",
    });
    console.info("First call result", { name: result1.data.name });

    // This should use cache
    const result2 = await ghc.repos.get({
      owner: "octocat",
      repo: "Hello-World",
    });
    console.info("Second call result (cached)", { name: result2.data.name });

    console.info("Cache test complete!");
  }

  runTest().catch((error) => console.error("Test failed", error));
}
