import DIE from "phpdie";
import { db } from ".";
type TaskMeta<T extends Record<string, any>> = {
  readonly coll: string,
} & T;

export const TaskMetaCollection = <T extends Record<string, any>, const COLLECTION_NAME extends string = string>(coll: COLLECTION_NAME) => {
  const c = db.collection<{ coll: COLLECTION_NAME; } & T>("TaskMeta");
  return Object.assign(c, {
    save: async (data: Partial<T>) => {
      const { coll: _, ...rest } = data;
      return await c.findOneAndUpdate(
        { coll },
        { $set: rest as any },
        { upsert: true, returnDocument: "after" }
      ) || DIE('never')
    }
  });
};
await TaskMetaCollection('TaskMeta').createIndex({ coll: 1 }, { unique: true }); // Ensure unique collection names
/**
 * 
 * @author: snomiao <snomiao@gmail.com>
 */
export async function saveTaskMeta() {
  return
};
if (import.meta.main) {
  // Example usage
  const meta = await TaskMetaCollection<{
    key: string;
    updatedAt: Date;
  }>('example').findOneAndUpdate({ coll: 'example' }, {
    $set: { key: "value", updatedAt: new Date() }
  }, { upsert: true, returnDocument: "after" });
  console.log("Meta updated:", meta);
  console.log("Config collection initialized.");
}