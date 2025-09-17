import { db } from "@/src/db";
import sflow from "sflow";
import type { Collection } from "mongodb";

type UserType = {
  email: string;
  admin: boolean;
};

export const Users: Collection<UserType> = (db as any)?.collection("Users") || {} as any;

// setup admins - only run if db is available
if (db && typeof window === "undefined" && Users.updateOne) {
  await sflow(process.env.AUTH_ADMINS?.split(",").map((e) => e.toLowerCase()) ?? [])
    .pMap((email) => Users.updateOne({ email }, { $set: { email, admin: true } }, { upsert: true }))
    .toCount();
}
