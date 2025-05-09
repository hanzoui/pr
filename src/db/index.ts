import { $flatten } from "@/packages/mongodb-pipeline-ts/$flatten";
import { $fresh, $stale } from "@/packages/mongodb-pipeline-ts/$fresh";
import enhancedMs from "enhanced-ms";
import isCI from "is-ci";
import { MongoClient } from "mongodb";

// allow build without env
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://PLEASE_SET_MONGODB_URI:27017";

type g = typeof global & { mongoClient: MongoClient };
export const mongoClient = ((global as g).mongoClient ??= new MongoClient(MONGODB_URI));
export const db = mongoClient.db();

// allow db conn for 45 mins in CI env to prevent long running CI jobs
if (isCI) {
  setTimeout(
    async () => {
      await mongoClient.close();
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
}

export { $flatten as $filaten, $fresh, $stale };
