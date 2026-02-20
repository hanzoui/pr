import { mkdir } from "fs/promises";
export const COMFY_PR_CACHE_DIR = "./node_modules/.cache/comfy-pr";
await mkdir(COMFY_PR_CACHE_DIR, { recursive: true });
