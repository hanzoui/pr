import pMap from "p-map";
import { clone_modify_push_Branches } from "./clone_modify_push_Branches";
import { createGithubForkForRepo } from "./createGithubForkForRepo";
import { createGithubPullRequest } from "./createGithubPullRequest";
import type { GithubPull } from "./gh/GithubPull";
import { parsePulls } from "./parsePullsState";
if (import.meta.main) {
  // test repo
  const test_repo = "https://github.com/snomiao/ComfyNode-Registry-test";
  console.info(await createComfyRegistryPullRequests(test_repo));
}
export async function createComfyRegistryPullRequests(upstreamRepoUrl: string) {
  console.log("forking " + upstreamRepoUrl);
  const forkedRepo = await createGithubForkForRepo(upstreamRepoUrl);

  console.log("modifing " + forkedRepo.html_url);
  const PR_REQUESTS = await clone_modify_push_Branches(upstreamRepoUrl, forkedRepo.html_url);
  const prs = await pMap(PR_REQUESTS, async ({ type, ...prInfo }) => await createGithubPullRequest({ ...prInfo }));

  console.log("Registry PRs DONE");

  return ([...prs] as GithubPull[]).map((e) => parsePulls([e])[0]);
}
