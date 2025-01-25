import { $ } from "../cli/echoBunShell";
import { createGithubForkForRepoEx } from "../createGithubForkForRepo";
import { getBranchWorkingDir } from "../getBranchWorkingDir";
import { GIT_USEREMAIL, GIT_USERNAME } from "../ghUser";

export async function checkoutRepoOnBranch(upstreamUrl: string, branch: string) {
  console.log("==== CHECKOUT " + upstreamUrl);
  const forkedRepo = await createGithubForkForRepoEx(upstreamUrl);
  const forkedHtmlUrl = forkedRepo.html_url;
  const cwd = await getBranchWorkingDir(upstreamUrl, forkedRepo.html_url, branch);
  await $`
git clone ${upstreamUrl} ${cwd}
cd ${cwd}
git config user.name ${GIT_USERNAME} && \
git config user.email ${GIT_USEREMAIL} && \
git checkout -b ${branch}
`;
  return { cwd, html_url: forkedHtmlUrl };
}
