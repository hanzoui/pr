import { makePublishcrBranch } from "./makePublishBranch";
import { makePyprojectBranch } from "./makeTomlBranch";

export async function clone_modify_push_Branches(upstreamUrl: string, forkUrl: string) {
  const pyprojectBranchInfo = makePyprojectBranch(upstreamUrl, forkUrl);
  const publishcrBranchInfo = makePublishcrBranch(upstreamUrl, forkUrl);
  return (await Promise.all([pyprojectBranchInfo, publishcrBranchInfo]))
    .map(({ body, branch, title, type }) => ({
      body,
      branch,
      title,
      type,
      srcUrl: forkUrl,
      dstUrl: upstreamUrl,
    }));
}
