import { tsmatch } from "@/packages/mongodb-pipeline-ts/Task";
import { db } from "@/src/db";
import { gh, type GH } from "@/src/gh";
import { ghc } from "@/src/ghc";
import { parseIssueUrl } from "@/src/parseIssueUrl";
import { parseUrlRepoOwner } from "@/src/parseOwnerRepo";
import DIE from "@snomiao/die";
import chalk from "chalk";
import sflow, { pageFlow } from "sflow";
/**
 * Label Ops System
 *
 * In any of those repos:
 * https://github.com/Comfy-Org/Comfy-PR
 * https://github.com/comfyanonymous/ComfyUI
 * https://github.com/Comfy-Org/ComfyUI_frontend
 * https://github.com/Comfy-Org/desktop
 *
 * User can add comments to manipulate Issue/PR labels by a simple syntax, without require permissions on repo .
 * Add a label: Send a comment with "+label:[name]" (must have no space)
 * Remove a label: Send a comment with "-label:[name]" (must have no space)
 *
 * Bugcop:
 */

const cfg = {
  REPOLIST: [
    "https://github.com/Comfy-Org/Comfy-PR",
    "https://github.com/comfyanonymous/ComfyUI",
    "https://github.com/Comfy-Org/ComfyUI_frontend",
    "https://github.com/Comfy-Org/desktop",
  ],
  // allow all users to edit bugcop:*, area:*, Core-*, labels
  allow: [/^(?:Core|Core-.*)$/, /^(?:bug-cop|area):.*$/, /^(?:hello|world)$/],
};
type GithubIssueLabelOps = {
  target_url: string; // can be comment or issue
  issue_url: string; // issue
  type: "issue" | "issue-comment";

  processed_at?: Date; // for diff
  task_updated_at?: Date;
};

const GithubIssueLabelOps = db.collection<GithubIssueLabelOps>("GithubIssueLabelOps");
GithubIssueLabelOps.createIndex({ target_url: 1 }, { unique: true });

const saveTask = async (task: Partial<GithubIssueLabelOps> & { target_url: string }) =>
  (await GithubIssueLabelOps.findOneAndUpdate(
    { target_url: task.target_url },
    { $set: { ...task, task_updated_at: new Date() } },
    { upsert: true, returnDocument: "after" },
  )) || DIE("fail to save task");

if (import.meta.main) {
  await runLabelOpInitializeScan();
}
/**
 * Scan all issues/prs and it's comments, and process them for label operations.
 *
 * this is necessary to run this to catch the missed events when webhook server is down and up again
 *
 * It's safe to run multiple time as it's idempotent.
 *
 */
async function runLabelOpInitializeScan() {
  await sflow(cfg.REPOLIST)
    .flatMap((repoUrl) => [
      pageFlow(1, async (page, per_page = 100) => {
        const { data } = await ghc.issues.list({ ...parseUrlRepoOwner(repoUrl), page, per_page, state: "open" });
        return { data, next: data.length >= per_page ? page + 1 : null };
      })
        .flat()
        .map(async (issue) => {
          // processIssueComment({issue});
          if (!issue.comments) return;
          await pageFlow(1, async (page, per_page = 100) => {
            const { data } = await ghc.issues.listComments({ ...parseIssueUrl(issue.html_url), page, per_page });
            return { data, next: data.length >= per_page ? page + 1 : null };
          })
            .flat()
            .forEach((comment) => processIssueCommentForLableops({ issue, comment }))
            .run();
        }),
    ])
    .run();
}

/**
 * Note: can also process pull_requests
 */
export async function processIssueCommentForLableops({
  issue,
  comment,
}: {
  issue: GH["issue"];
  comment: GH["issue-comment"] | null;
}) {
  const target = comment || issue;
  let task = await saveTask({
    target_url: target.html_url,
    issue_url: issue.html_url,
    type: comment ? "issue-comment" : "issue",
  });
  console.log(issue.html_url, target.body?.length);
  if (task?.processed_at && +new Date(target.updated_at) <= +task.processed_at) return null; // skip if processed
  if (!target.body) return task;

  const issueLabels = issue.labels.map((e) => (typeof e === "string" ? e : e.name));
  const labelOps = [...target.body.matchAll(/([+-])label:\s*?(\S+)\b/gim)]
    .map(([_, op, name]) => ({ op, name }))
    .filter(({ op, name }) => {
      // skip already added/removed in issueLables
      if (op === "+" && issueLabels.includes(name)) return false;
      if (op === "-" && !issueLabels.includes(name)) return false;
      // skip not allowed labels
      if (op === "+" && !cfg.allow.some((pattern) => name.match(pattern))) return false;
      if (op === "-" && !cfg.allow.some((pattern) => name.match(pattern))) return false;
      return true;
    });

  if (!labelOps.length) return saveTask({ target_url: target.html_url, processed_at: new Date() });

  console.log("Adding reaction");
  if (comment === target) {
    await gh.reactions.createForIssueComment({
      ...parseIssueUrl(issue.html_url),
      comment_id: comment.id,
      content: "eyes",
    });
  } else {
    await gh.reactions.createForIssue({ ...parseIssueUrl(issue.html_url), content: "eyes" });
  }
  //
  console.log("+- Labels");
  await sflow(labelOps)
    .forEach(async ({ op, name }) => {
      console.log(chalk.bgBlue(`${op} label: ${name}`));
      return await tsmatch(op)
        .with("+", async () => await gh.issues.addLabels({ ...parseIssueUrl(issue.html_url), labels: [name] })) // todo: merge multiple addLabels for performance
        .with("-", async () => await gh.issues.removeLabel({ ...parseIssueUrl(issue.html_url), name }))
        .otherwise(() => DIE(`Unknown label op ${op}, should never happen`));
    })
    .run();
  console.log("Done");
  return saveTask({ target_url: target.html_url, processed_at: new Date() });
}
