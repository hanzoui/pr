import type { Collection, Document } from "mongodb";
import { db } from "./index";

/**
 * Creates a typed collection reference that works during build time
 * @param name Collection name
 * @returns Typed collection or mock object during build
 */
export function createCollection<T extends Document = Document>(name: string): Collection<T> {
  if (!db || typeof db.collection !== "function") {
    // Return a mock collection during build
    return {
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
    } as any;
  }
  return db.collection(name) as Collection<T>;
}