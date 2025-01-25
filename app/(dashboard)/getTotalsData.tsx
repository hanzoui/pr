"use server";
import { $pipeline } from "@/packages/mongodb-pipeline-ts/$pipeline";
import { Totals } from "@/src/Totals";
import { flatten } from "flat";
import sf from "sflow";

export async function getTotalsData() {
  return sf(
    $pipeline(Totals)
      .match({ "totals.data": { $exists: true } })
      .match({ "totals.mtime": { $gt: new Date(+new Date() - 86400e3 * 30) } }) // 1 month
      .set({ "totals.data.date": "$totals.mtime" })
      .replaceRoot({ newRoot: "$totals.data" })
      .aggregate(),
  )
    .map((e) => flatten(e) as { date: string } & Record<string, number>)
    .limit(3000)
    .toArray();
}
