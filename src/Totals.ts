import { $pipeline } from "@/packages/mongodb-pipeline-ts/$pipeline";
import { flatten } from "flat";
import { sf } from "sflow";
import { type Task } from "../packages/mongodb-pipeline-ts/Task";
import { analyzeTotals } from "./analyzeTotals";
import { db } from "./db";
import { createCollection } from "@/src/db/collection";
import { type AwaitedReturnType } from "./types/AwaitedReturnType";
export type Totals = AwaitedReturnType<typeof analyzeTotals>;
export const Totals = createCollection<{
  /** @deprecated use totals.mtime */
  today?: string;
  totals?: Task<Totals>;
}>("Totals");
if (import.meta.main) {
  await sf
    .sflow(
      $pipeline(Totals)
        .match({ "totals.data": { $exists: true } })
        .set({ "totals.data.date": "$totals.mtime" })
        .replaceRoot({ newRoot: "$totals.data" })
        .aggregate(),
    )
    .map((e) => flatten(e) as { date: string } & Record<string, number>)
    .toLog();
}
