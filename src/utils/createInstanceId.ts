import { generateSlug } from "random-word-slugs";

export function createInstanceId() {
  return generateSlug(2);
  // return Math.random().toString(36).slice(2, 10).toUpperCase();
}
