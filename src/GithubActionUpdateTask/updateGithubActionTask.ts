#!/usr/bin/env bun
import { $pipeline } from "@/packages/mongodb-pipeline-ts/$pipeline";
import fastDiff from "fast-diff";
import { readFile, writeFile } from "fs/promises";
import isCI from "is-ci";
import DIE from "phpdie";
import sflow from "sflow";
import sha256 from "sha256";
import yaml from "yaml";
import { createPR } from "../createGithubPullRequest";
import { CRNodes } from "../CRNodes";
import { gh } from "../gh";
import { parsePullUrl } from "../parsePullUrl";
import { getWorkerInstance } from "../WorkerInstances";
import { GithubActionUpdateTask } from "./GithubActionUpdateTask";
import { updateGithubActionPrepareBranch } from "./updateGithubActionPrepareBranch";

export const referenceActionContent = await readFile("./templates/publish.yaml", "utf8");
export const referencePullRequestMessage = await readFile("./templates/tasks/GithubActionUpdatePR.md", "utf8");
export const referenceActionContentHash = sha256(referenceActionContent); // check if target publish.yaml already latest

// for debug only
export const testUpdatedPublishYaml = await readFile(import.meta.dir + "/test-updated-publish.yml", "utf8");

// const resetPattern = {

// }
if (import.meta.main) {
  // const repo = "https://github.com/54rt1n/ComfyUI-DareMerge";
  const repo = "https://github.com/snomiao/ComfyUI-DareMerge-test";
  // await GithubActionUpdateTask.findOneAndDelete({ repo });

  // aprove test
  // const approvedHash = "e6de732024cf2b64488ec093818fc2e01707c9bc97d306a42b3c22d2ef834686";
  // await approveGithubActionUpdateTask(repo, approvedHash);

  // test on single repo
  // await updateGithubActionTask(repo);

  // reset silly pr messages
  const silly = await sflow(
    GithubActionUpdateTask.find({
      pullRequestMessage: /\+\s+if: \${{ github.repository_owner == 'NODE_AUTHOR_OWNER' }}$/gim,
    }),
  )
    .log((e) => yaml.stringify(e))
    .map((e, index) => ({ ...e, index }))
    .forEach(async (e) => await GithubActionUpdateTask.deleteMany({ _id: e._id }))
    .toArray();

  await writeFile("./.cache/" + import.meta.file + "-silly-log.yaml", yaml.stringify(silly)).catch(() => {
    console.error("Error writing silly-log file");
  });

  await updateGithubActionTaskList();

  console.log("done");

  if (isCI) process.exit(0);
}

async function updateGithubActionTaskList() {
  await getWorkerInstance("updateGithubActionTaskList");

  // task list importer
  await GithubActionUpdateTask.createIndex({ repo: 1 }, { unique: true });
  await $pipeline(CRNodes)
    .project({ repo: "$repository", _id: 0 })
    .match({ repo: /^https:\/\/github\.com/ })
    .merge({ into: GithubActionUpdateTask.collectionName, on: "repo", whenMatched: "merge" })
    .aggregate()
    .next();

  // reset network error
  await GithubActionUpdateTask.deleteMany({ error: /OPENAI_API_KEY/ });
  await GithubActionUpdateTask.deleteMany({ error: /was submitted too quickly/ });

  console.log({ GithubActionUpdateTask: await GithubActionUpdateTask.find().toArray() });

  // task list scanner
  await sflow(GithubActionUpdateTask.find({ error: { $exists: false } }).project({ repo: 1 }))
    .map(async ({ repo }) => {
      console.log("-");
      return await updateGithubActionTask(repo).catch(async (err) => {
        console.error(err);
        const error = String(err);
        await GithubActionUpdateTask.updateOne({ repo }, { $set: { error, updatedAt: new Date() } }, { upsert: true });
        // throw err;
      });
    })
    .run();

  // console.log(yaml.stringify({ GithubActionUpdateTask: await GithubActionUpdateTask.find().toArray() }));
  console.log("done");
}

/**
 * wofklow:
 * 1. check if repo is already up to date
 * 2. if not, make a branch and update the publish.yaml
 * 3. make pr
 * 4. check pr status, track pr comments
 */
export async function updateGithubActionTask(repo: string) {
  const task =
    (await GithubActionUpdateTask.findOneAndUpdate(
      { repo },
      { $set: { updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    )) || DIE("never");

  // check if already up to date
  if (referenceActionContentHash !== task.branchVersionHash) {
    console.log("[updateGithubActionTask] AI Suggesting PR for", repo);
    // make branch
    const {
      hash,
      forkedBranchUrl,
      commitMessage,
      pullRequestMessage,
      diff: branchDiffResult,
    } = await updateGithubActionPrepareBranch(repo);

    Object.assign(
      task,
      (await GithubActionUpdateTask.findOneAndUpdate(
        { repo },
        {
          $set: {
            branchVersionHash: hash,
            forkedBranchUrl,
            commitMessage,
            pullRequestMessage,
            branchDiffResult,
            updatedAt: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" },
      )) || DIE("never"),
    );
    console.debug(yaml.stringify({ repo, hash, forkedBranchUrl, commitMessage, pullRequestMessage, branchDiffResult }));
  }

  if (
    referenceActionContentHash !== task.pullRequestVersionHash &&
    referenceActionContentHash === task.approvedBranchVersionHash
  ) {
    console.log("[updateGithubActionTask] Creating PR for", repo);
    const [src, branch] = task.forkedBranchUrl!.split("/tree/");
    const pullRequestUrl = await createPR({
      branch: branch || DIE("missing branch in forkedBranchUrl: " + task.forkedBranchUrl),
      src: src || DIE("missing origin in forkedBranchUrl: " + task.forkedBranchUrl),
      dst: repo,
      msg: task.pullRequestMessage || DIE("approved task is missing pullRequestMessage"),
    });
    const updatedTask =
      (await GithubActionUpdateTask.findOneAndUpdate(
        { repo },
        { $set: { pullRequestUrl, pullRequestVersionHash: task.approvedBranchVersionHash, updatedAt: new Date() } },
        { upsert: true, returnDocument: "after" },
      )) || DIE("never");
    Object.assign(task, updatedTask);
  }
  // update pr status if pr url is available
  if (task.pullRequestUrl) {
    const { owner, repo, pull_number } = parsePullUrl(task.pullRequestUrl);
    const { data: pr } = await gh.pulls.get({ owner, repo, pull_number });
    const pullRequestStatus = pr.merged_at ? "MERGED" : pr.closed_at ? "CLOSED" : "OPEN";
    const rawComments =
      pr.comments === 0
        ? []
        : await gh.pulls
            .listReviewComments({
              owner,
              repo,
              pull_number,
            })
            .then((res) => res.data);
    const pullRequestComments: string = rawComments
      .map(({ body_text, user: { login } }) => JSON.stringify({ username: login, text: body_text }))
      .join("\n");
    // filter out new pr comments, maybe send to slack
    console.log(
      fastDiff(task.pullRequestComments ?? "", pullRequestComments)
        .map(([dir, content]) => {
          if (dir === 0) return "";
          const sign = dir == 1 ? "+" : "-";
          return content
            .split("\n")
            .map((e) => `${sign} ${e}`)
            .join("\n");
        })
        .join("\n"),
    );

    const updatedTask = await GithubActionUpdateTask.findOneAndUpdate(
      { repo },
      { $set: { pullRequestStatus, pullRequestComments, updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
    Object.assign(task, updatedTask);
  }
  // delete origin branch - WIP
  // if (task.forkedBranchUrl && task.pullRequestStatus === "MERGED") {
  //   const [src, branch] = task.forkedBranchUrl.split("/tree/");
  //   await gh.git.deleteRef({ owner: src.split("/").pop()!, ref: `heads/${branch}` });
  //   await GithubActionUpdateTask.findOneAndUpdate(
  //     { repo },
  //     { $set: { forkedBranchCleaningStatus: "cleaned", updatedAt: new Date() } },
  //     { upsert: true, returnDocument: "after" },
  //   );
  // }
  console.log("[updateGithubActionTask] Updated: " + repo);
}
