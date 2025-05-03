import { db } from "../db";

// task: https://www.notion.so/drip-art/Send-mass-PR-for-all-custom-node-repo-to-update-their-github-action-workflow-1626d73d365080439da3df94c95ad5e7
// this task aim to update the repos /publish.yaml
//

export const GithubActionUpdateTask = db.collection<{
  // stage 0, import repo url
  repo: string;
  error?: string;
  status?: "error" | "pending-branch" | "pending-approve" | "pending-pr" | "up-to-date";
  updatedAt?: Date;

  // stage 1, fork and update, preview in web, approve by manual
  branchVersionHash?: string;
  forkedBranchUrl?: string;
  branchDiffResult?: string;
  commitMessage?: string; // generated commit message
  pullRequestMessage?: string; // generated pr message
  confidential?: number; // review by chatgpt

  approvedBranchVersionHash?: string; // approve by manual

  // stage 2, create pr
  pullRequestVersionHash?: string;
  pullRequestUrl?: string; // url

  // stage 3, check pr status
  pullRequestStatus?: "OPEN" | "MERGED" | "CLOSED";
  pullRequestComments?: string; // tracking pr comments, simply store the repo owners' response, to determine if we need to follow-up the pr

  // stage 4, clean forked repo after pr was merged/closed
  forkedBranchCleaningStatus?: "cleaned" | "keep";
}>("GithubActionUpdateTask");
