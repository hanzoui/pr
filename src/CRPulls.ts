import type { CRPull } from "./CNRepos";
import { db } from "./db";

/**
 * @deprecated todo: utillize this collection @sno
 */
export const CRPulls = db.collection<CRPull>("CRPulls");
