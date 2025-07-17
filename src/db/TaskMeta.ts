import type { ObjectId } from "mongodb";
import DIE from "phpdie";
import { omit } from "rambda";
import { z } from "zod";
import { db } from ".";

export const TaskMetaCollection = <S extends z.ZodObject<any>, const COLLECTION_NAME extends string = string>(
  coll: COLLECTION_NAME,
  schema: S
) => {
  const c = db.collection<{ coll: COLLECTION_NAME; } & z.infer<S>>("TaskMeta");
  return Object.assign(c, {
    $set: async (data: Partial<z.infer<S>>) => {

      // Validate data with schema
      try {
        schema.partial().parse(data);
      } catch (error: unknown | z.ZodError) {
        if (error instanceof z.ZodError) {
          throw new Error(`Validation failed: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        }
        throw error;
      }

      return await c.findOneAndUpdate(
        { coll },
        { $set: omit('coll', data) },
        { upsert: true, returnDocument: "after" }
      ) || DIE('never')
    },
    save: async (data: z.infer<S>) => {
      // Validate data with schema
      try {
        schema.parse(data);
      } catch (error: unknown | z.ZodError) {
        if (error instanceof z.ZodError) {
          throw new Error(`Validation failed: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        }
        throw error;
      }

      return await c.findOneAndUpdate(
        { coll },
        { $set: omit('coll', data) },
        { upsert: true, returnDocument: "after" }
      ) || DIE('never');
    },
  });
};
await TaskMetaCollection('TaskMeta', z.object({})).createIndex({ coll: 1 }, { unique: true }); // Ensure unique collection names

if (import.meta.main) {
  // Example usage with schema
  const exampleSchema = z.object({
    key: z.string(),
    updatedAt: z.date(),
    optional: z.string().optional(), // Optional field
  });

  const TaskMeta = TaskMetaCollection('example', exampleSchema);

  const meta = await TaskMeta.$set({
    key: "value",
    updatedAt: new Date(),
    // asd: '123' // will throw validation error if uncommented
  });
  meta._id satisfies ObjectId; // Access the _id field
  meta.coll satisfies ('example'); // = 'example'
  // meta.key; // Access the key field
  meta.updatedAt satisfies Date; // Access the updatedAt field
  // meta.optional; // Access the optional field, will be undefined if not set

  console.log("Meta updated:", meta);
  console.log("Config collection initialized.");
}