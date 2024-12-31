import type { Task } from "@/packages/mongodb-pipeline-ts/Task";
import DIE from "@snomiao/die";
import { gh } from "./gh";
import type { AwaitedReturnType } from "./types/AwaitedReturnType";

export const ghUser = (
  await gh.users.getAuthenticated().catch((error) => {
    throw new Error(
      `FAIL TO GET AUTHENTICATED USER INFO, CHECK ${!!process.env.GH_TOKEN ? "[?]" : "[ ]"}GH_TOKEN and ${!!process.env.GH_TOKEN_COMFY_PR ? "[?]" : "[ ]"}GH_TOKEN_COMFY_PR`,
      { cause: error },
    );
  })
).data;

console.log("Fetch Current Github User...");
console.log(`GH_TOKEN User: ${ghUser.login} <${ghUser.email}>`);
export type GHUser = Task<AwaitedReturnType<typeof gh.users.getByUsername>["data"]>;
export const GIT_USEREMAIL =
  process.env.GIT_USEREMAIL || (ghUser.email && ghUser.email) || DIE("Missing env.GIT_USEREMAIL");
export const GIT_USERNAME =
  process.env.GIT_USERNAME || (ghUser.email && ghUser.name) || DIE("Missing env.GIT_USERNAME");

// read env/parameters
console.log(`GIT COMMIT USER: ${GIT_USERNAME} <${GIT_USEREMAIL}>`);
