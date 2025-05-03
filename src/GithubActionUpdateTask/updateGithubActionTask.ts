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

  // reset server configuration error
  await sflow(GithubActionUpdateTask.find({}))
    .map((e) => e.repo)
    .filter((e) => !e?.match(/\//))
    .log()
    .forEach(async (e) => await GithubActionUpdateTask.deleteMany({ repo: e }))
    .run();

  // simplify error "Repository was archived so is read-only."
  await GithubActionUpdateTask.updateMany(
    { error: /Repository was archived so is read-only\./ },
    { $set: { error: "Repository was archived so is read-only." } },
  );

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

  // auto reset network error
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
export async function updateGithubActionTask(repoUrl: string) {
  const task = (await GithubActionUpdateTask.findOneAndUpdate(
    { repo: repoUrl },
    { $set: { updatedAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  ))!;

  // check if already up to date
  if (referenceActionContentHash !== task.branchVersionHash) {
    console.log("[updateGithubActionTask] AI Suggesting PR for", repoUrl);
    // make branch
    const {
      hash,
      forkedBranchUrl,
      commitMessage,
      pullRequestMessage,
      diff: branchDiffResult,
      upToDate,
    } = await updateGithubActionPrepareBranch(repoUrl);

    const updatedTask = await GithubActionUpdateTask.findOneAndUpdate(
      { repo: repoUrl },
      {
        $set: {
          branchVersionHash: hash,
          forkedBranchUrl,
          commitMessage,
          pullRequestMessage,
          branchDiffResult,
          status: upToDate ? "up-to-date" : "pending-approve",
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" },
    )!;
    Object.assign(task, updatedTask);
    console.debug(
      yaml.stringify({ repo: repoUrl, hash, forkedBranchUrl, commitMessage, pullRequestMessage, branchDiffResult }),
    );
  }

  if (
    referenceActionContentHash !== task.pullRequestVersionHash &&
    referenceActionContentHash === task.approvedBranchVersionHash
  ) {
    console.log("[updateGithubActionTask] Creating PR for", repoUrl);
    const [src, branch] = task.forkedBranchUrl!.split("/tree/");
    const pullRequestUrl = await createPR({
      branch: branch || DIE("missing branch in forkedBranchUrl: " + task.forkedBranchUrl),
      src: src || DIE("missing origin in forkedBranchUrl: " + task.forkedBranchUrl),
      dst: repoUrl,
      msg: task.pullRequestMessage || DIE("approved task is missing pullRequestMessage"),
    });
    const updatedTask = await GithubActionUpdateTask.findOneAndUpdate(
      { repo: repoUrl },
      {
        $set: {
          pullRequestUrl,
          pullRequestVersionHash: task.approvedBranchVersionHash,
          updatedAt: new Date(),
          status: "opened",
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    Object.assign(task, updatedTask);
  }
  // update pr status if pr url is available
  if (task.pullRequestUrl && (task.pullRequestSyncAt ?? 0) < new Date(Date.now() - 1000 * 60 * 5)) {
    const { owner, repo, pull_number } = parsePullUrl(task.pullRequestUrl);
    const { data: pr } = await gh.pulls.get({ owner, repo, pull_number });
    const pullRequestStatus = pr.merged_at ? "MERGED" : pr.closed_at ? "CLOSED" : "OPEN";
    console.log(`[updateGithubActionTask] got ${pullRequestStatus} status in ${task.pullRequestUrl}`);
    const pullRequestCommentsCount = pr.comments;
    console.log(`[updateGithubActionTask] got ${pullRequestCommentsCount} comments in ${task.pullRequestUrl}`);

    const rawComments =
      pullRequestCommentsCount === 0
        ? []
        : await gh.issues
            .listComments({
              owner,
              repo,
              issue_number: pull_number,
            })
            .then((res) => res.data);
    if (rawComments.length !== pullRequestCommentsCount)
      throw new Error("pullRequestCommentsCount not match some information may be outdated", {
        cause: { rawComments, pullRequestCommentsCount },
      });
    const pullRequestComments: string = rawComments
      .filter((e) => !e.user?.login?.endsWith("[bot]"))
      .map((cmt) => JSON.stringify({ user: cmt.user?.login ?? "unknown", text: cmt.body }))
      .join("\n");

    const newCommentsMessage = fastDiff(task.pullRequestComments ?? "", pullRequestComments)
      .map(([dir, content]) => {
        if (dir === 0) return "";
        const sign = dir == 1 ? "+" : "-";
        return content
          .split("\n")
          .map((e) => `${sign} ${e}`)
          .join("\n");
      })
      .join("\n");
    // filter out new pr comments, maybe send to slack
    console.log(newCommentsMessage);

    const updatedTask = await GithubActionUpdateTask.findOneAndUpdate(
      { repo: repoUrl },
      {
        $set: {
          pullRequestSyncAt: new Date(),
          pullRequestStatus,
          pullRequestComments,
          pullRequestCommentsCount,
          updatedAt: new Date(),
          status: pullRequestStatus === "MERGED" ? "merged" : pullRequestStatus === "CLOSED" ? "closed" : "opened",
        },
      },
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
  console.log("[updateGithubActionTask] Updated: " + repoUrl);
}
