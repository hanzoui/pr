import KeyvSqlite from "@keyv/sqlite";
import { WebClient } from "@slack/web-api";
import crypto from "crypto";
import fs from "fs/promises";
import stableStringify from "json-stable-stringify";
import Keyv from "keyv";
import path from "path";
import { getSlack, isSlackAvailable } from ".";
import { createLogger } from "../logger";
import { createMethodCacheProxy } from "../utils/MethodCacheProxy";

const logger = createLogger("slackCached");

const CACHE_DIR = path.join(process.cwd(), "node_modules/.cache/Comfy-PR");
const CACHE_FILE = path.join(CACHE_DIR, "slack-cache.sqlite");
const DEFAULT_TTL = process.env.LOCAL_DEV
  ? 30 * 60 * 1000 // cache 30 minutes when local dev
  : 0 * 60 * 1000; // cache 0 minute in production

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

let store: Keyv | null = null;

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

function createSlackCacheKey(path: (string | symbol)[], args: any[]): string {
  // Create a deterministic key from the path and arguments
  const apiPath = path.map(p => p.toString()).join(".");

  const argsText = args.map((e) => stableStringify(e)).join(",");
  const maxLength = 120 - apiPath.length - "slack.".length - 8 - 3; // Maximum length for args display

  let displayArgs = argsText;
  if (argsText.length > maxLength) {
    const start = argsText.substring(0, maxLength / 2);
    const end = argsText.substring(argsText.length - maxLength / 2);
    displayArgs = `${start}...${end}`;
  }

  const hash = crypto.createHash("md5").update(argsText).digest("hex").substring(0, 8);
  const cacheKey = `slack.${apiPath}(${displayArgs})#${hash}`;

  return cacheKey;
}

// Create the cached Slack client
const slackCachedPromise = (async () => {
  const store = await getStore();
  const slack = getSlack();
  return createMethodCacheProxy({
    store,
    root: slack,
    getKey: createSlackCacheKey,
    namespace: "slack",
  });
})();

type DeepAsyncWrapper<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<any>
    ? T[K]
    : T[K] extends (...args: any[]) => any
      ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
      : T[K] extends object
        ? DeepAsyncWrapper<T[K]>
        : T[K];
};

export const slackCached = new Proxy({} as DeepAsyncWrapper<WebClient>, {
  get(target, prop) {
    return new Proxy(() => {}, {
      async apply(_, __, args) {
        const proxy = await slackCachedPromise;
        return (proxy as any)[prop](...args);
      },
      get(_, innerProp) {
        return new Proxy(() => {}, {
          async apply(_, __, args) {
            const proxy = await slackCachedPromise;
            return (proxy as any)[prop][innerProp](...args);
          },
          get(_, deepProp) {
            return async (...args: any[]) => {
              const proxy = await slackCachedPromise;
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
    if (!isSlackAvailable()) {
      logger.info("Slack token not configured, skipping test");
      return;
    }

    // Test the cached client
    logger.info("Testing cached Slack client...");

    const slack = getSlack();

    // This should make a real API call
    const result1 = await slackCached.users.profile.get({});
    logger.info("First call result", { name: result1.profile });

    // This should use cache
    const result2 = await slackCached.users.profile.get({});
    logger.info("Second call result (cached)", { name: result2.profile });

    logger.info("Cache test complete!");
  }

  runTest().catch((error) => logger.error("Test failed", error));
}
