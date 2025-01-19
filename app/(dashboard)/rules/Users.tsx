import { db } from "@/src/db";
import sflow from "sflow";

export const Users = db.collection<{
  email: string;
  admin: boolean;
}>("Users");

// setup admins
await sflow(process.env.AUTH_ADMINS?.split(",").map((e) => e.toLowerCase()) ?? [])
  .pMap((email) => Users.updateOne({ email }, { $set: { email, admin: true } }, { upsert: true }))
  .toCount();
