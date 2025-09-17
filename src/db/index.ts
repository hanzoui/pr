import { $flatten } from "@/packages/mongodb-pipeline-ts/$flatten";
import { $fresh, $stale } from "@/packages/mongodb-pipeline-ts/$fresh";
import enhancedMs from "enhanced-ms";
import hotResource from "hot-resource";
import isCI from "is-ci";
import { MongoClient } from "mongodb";
import sflow from "sflow";
import { logger } from "../logger";

// allow build without env
if (!process.env.MONGODB_URI)
  logger.warn("MONGODB_URI is not set, using default value. This may cause issues in production.");
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://PLEASE_SET_MONGODB_URI:27017";

// Skip database connection during build phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI;

export const mongo = isBuildPhase 
  ? null as any 
  : await hotResource(async () => [new MongoClient(MONGODB_URI), (conn) => conn.close()]);

export const db = isBuildPhase 
  ? { 
      close: async () => {},
      collection: () => ({
        createIndex: async () => {},
        findOne: async () => null,
        find: () => ({ 
          toArray: async () => [],
          sort: function() { return this; },
          limit: function() { return this; },
          skip: function() { return this; },
          map: function() { return this; },
          aggregate: function() { return this; },
          project: function() { return this; },
        }),
        aggregate: () => ({ 
          toArray: async () => [],
          map: function() { return this; },
          skip: function() { return this; },
          limit: function() { return this; },
        }),
        updateOne: async () => {},
        findOneAndUpdate: async () => null,
        insertOne: async () => {},
        deleteOne: async () => {},
        drop: async () => {},
        estimatedDocumentCount: async () => 0,
        countDocuments: async () => 0,
      } as any),
      listCollections: () => [],
    } as any
  : Object.assign(mongo.db(), {
      close: async () => await mongo.close(),
    });

// allow db conn for 45 mins in CI env to prevent long running CI jobs
if (isCI) {
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
  logger.info(await db.admin().ping());
  logger.info(enhancedMs("7d") === 7 * 86400e3);
  logger.info(JSON.stringify($stale("7d")));
  logger.info(JSON.stringify($flatten({ mtime: $stale("7d") })));
  logger.info(JSON.stringify($flatten({ mtime: new Date() })));
  logger.info(
    await sflow(db.listCollections())
      .map((e: any) => e.name)
      .toArray(),
  );
}

export { $flatten as $flatten, $fresh, $stale };
