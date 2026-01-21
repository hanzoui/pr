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

// Determine if we should skip DB connection
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isInvalidUri = !process.env.MONGODB_URI || process.env.MONGODB_URI.includes("PLEASE_SET_MONGODB_URI");
const shouldSkipConnection = isBuildPhase || isInvalidUri;

// Create a mock MongoDB client that returns empty results
const createMockClient = () => {
  const mockCollection = new Proxy({} as any, {
    get(_target, prop) {
      const asyncEmpty = async () => {};
      const asyncNull = async () => null;
      const asyncZero = async () => 0;
      const asyncEmptyArray = async () => [];
      const asyncAck = async () => ({ acknowledged: true });

      const methods: Record<string, any> = {
        createIndex: asyncEmpty,
        findOne: asyncNull,
        findOneAndUpdate: asyncNull,
        findOneAndReplace: asyncNull,
        findOneAndDelete: asyncNull,
        insertOne: async () => ({ acknowledged: true, insertedId: null }),
        insertMany: async () => ({ acknowledged: true, insertedIds: {} }),
        updateOne: async () => ({ acknowledged: true, matchedCount: 0, modifiedCount: 0 }),
        updateMany: async () => ({ acknowledged: true, matchedCount: 0, modifiedCount: 0 }),
        deleteOne: async () => ({ acknowledged: true, deletedCount: 0 }),
        deleteMany: async () => ({ acknowledged: true, deletedCount: 0 }),
        estimatedDocumentCount: asyncZero,
        countDocuments: asyncZero,
        find: () => ({
          toArray: asyncEmptyArray,
          limit: function () {
            return this;
          },
          skip: function () {
            return this;
          },
          sort: function () {
            return this;
          },
        }),
        aggregate: () => ({
          next: asyncNull,
          toArray: asyncEmptyArray,
        }),
      };

      return methods[prop as string] || asyncEmpty;
    },
  });

  const mockDb = new Proxy({} as any, {
    get(_target, prop) {
      if (prop === "collection") return () => mockCollection;
      if (prop === "admin") return () => ({ ping: async () => ({ ok: 1 }) });
      if (prop === "listCollections") return () => ({ toArray: async () => [] });
      if (prop === "command") return async () => ({ ok: 1 });
      return () => {};
    },
  });

  return {
    db: () => mockDb,
    close: async () => {},
  } as any as MongoClient;
};

// Initialize mongo client - either mock or real
export const mongo = await (shouldSkipConnection
  ? Promise.resolve(createMockClient())
  : hotResource(async () => [new MongoClient(MONGODB_URI), (conn) => conn.close()]));

// Export db instance with close method
export const db = Object.assign(mongo.db(), {
  close: async () => await mongo.close(),
});

// allow db conn for 45 mins in CI env to prevent long running CI jobs
if (isCI && !shouldSkipConnection) {
  setTimeout(
    async () => {
      await mongo.close();
      // should not be needed, but just in case
      process.exit(0);
    },
    45 * 60 * 1000,
  );
}

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
