import { parseGithubRepoUrl } from "./parseOwnerRepo";

export function getRepoWorkingDir(forkUrl: string) {
  return `prs/${parseGithubRepoUrl(forkUrl).repo}`;
}
