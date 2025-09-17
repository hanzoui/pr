import type { CRPull } from "./CNRepos";
import { db } from "./db";
import { createCollection } from "@/src/db/collection";

/**
 * @deprecated todo: utillize this collection @sno
 */
export const CRPulls = createCollection<CRPull>("CRPulls");
