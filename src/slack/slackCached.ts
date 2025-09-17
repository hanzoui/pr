import { WebClient } from "@slack/web-api";
import DIE from "@snomiao/die";
import crypto from "crypto";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN?.trim() || DIE("missing env.SLACK_BOT_TOKEN");
const slack = new WebClient(SLACK_BOT_TOKEN);

// Simple in-memory cache for development
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function createCacheKey(method: string, args: any[]): string {
  const argsHash = crypto.createHash("md5").update(JSON.stringify(args)).digest("hex");
  return `${method}:${argsHash}`;
}

function getCached(key: string): any | undefined {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return undefined;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Simple cached wrapper for common Slack methods
export const slackCached = {
  users: {
    list: async (args: any = {}) => {
      const key = createCacheKey("users.list", [args]);
      const cached = getCached(key);
      if (cached) return cached;

      const result = await slack.users.list(args);
      setCache(key, result);
      return result;
    },
  },
  conversations: {
    open: async (args: any) => {
      const key = createCacheKey("conversations.open", [args]);
      const cached = getCached(key);
      if (cached) return cached;

      const result = await slack.conversations.open(args);
      setCache(key, result);
      return result;
    },
  },
};
