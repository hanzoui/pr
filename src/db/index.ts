import { $flatten } from "@/packages/mongodb-pipeline-ts/$flatten";
import { $fresh, $stale } from "@/packages/mongodb-pipeline-ts/$fresh";
import enhancedMs from "enhanced-ms";
import hotResource from "hot-resource";
import isCI from "is-ci";
import { MongoClient } from "mongodb";
import sflow from "sflow";

// allow build without env
if (!process.env.MONGODB_URI)
  console.warn("MONGODB_URI is not set, using default value. This may cause issues in production.");
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://PLEASE_SET_MONGODB_URI:27017";

// Lazy initialization to avoid blocking during Next.js build
let _mongo: Awaited<ReturnType<typeof hotResource<MongoClient>>> | null = null;
let _initPromise: Promise<Awaited<ReturnType<typeof hotResource<MongoClient>>>> | null = null;

async function getMongo() {
  if (_mongo) return _mongo;
  if (_initPromise) return _initPromise;

  _initPromise = hotResource(async () => [new MongoClient(MONGODB_URI), (conn) => conn.close()]);
  _mongo = await _initPromise;

  // allow db conn for 45 mins in CI env to prevent long running CI jobs
  if (isCI) {
    setTimeout(
      async () => {
        await _mongo?.close();
        // should not be needed, but just in case
        process.exit(0);
      },
      45 * 60 * 1000,
    );
  }

  return _mongo;
}

export const mongo = new Proxy({} as Awaited<ReturnType<typeof hotResource<MongoClient>>>, {
  get: (target, prop) => {
    if (prop === "then") return undefined; // Prevent Promise auto-awaiting
    return (...args: any[]) =>
      getMongo().then((m) => {
        const value = (m as any)[prop];
        return typeof value === "function" ? value.apply(m, args) : value;
      });
  },
});

// Proxy for collection to make createIndex and other methods lazy
function createCollectionProxy(collectionName: string): any {
  return new Proxy({} as any, {
    get: (target, prop) => {
      if (prop === "then") return undefined; // Prevent Promise auto-awaiting
      return (...args: any[]) =>
        getMongo().then((m) => {
          const dbInstance = m.db();
          const collection = dbInstance.collection(collectionName);
          const value = (collection as any)[prop];
          return typeof value === "function" ? value.apply(collection, args) : value;
        });
    },
  });
}

export const db = new Proxy({} as ReturnType<MongoClient["db"]> & { close: () => Promise<void> }, {
  get: (target, prop) => {
    if (prop === "then") return undefined; // Prevent Promise auto-awaiting
    if (prop === "close") {
      return async () => {
        const m = await getMongo();
        return m.close();
      };
    }
    if (prop === "collection") {
      return (name: string, options?: any) => createCollectionProxy(name);
    }
    return (...args: any[]) =>
      getMongo().then((m) => {
        const dbInstance = m.db();
        const value = (dbInstance as any)[prop];
        return typeof value === "function" ? value.apply(dbInstance, args) : value;
      });
  },
});

if (import.meta.main) {
  console.log(await db.admin().ping());
  console.log(enhancedMs("7d") === 7 * 86400e3);
  console.log(JSON.stringify($stale("7d")));
  console.log(JSON.stringify($flatten({ mtime: $stale("7d") })));
  console.log(JSON.stringify($flatten({ mtime: new Date() })));
  console.log(
    await sflow(db.listCollections())
      .map((e) => e.name)
      .toArray(),
  );
}

export { $flatten as $flatten, $fresh, $stale };
