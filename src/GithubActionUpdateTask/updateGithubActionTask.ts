#!bun
import { $pipeline } from "@/packages/mongodb-pipeline-ts/$pipeline";
import { readFile } from "fs/promises";
import isCI from "is-ci";
import DIE from "phpdie";
import sflow from "sflow";
import sha256 from "sha256";
import { createPR } from "../createGithubPullRequest";
import { CRNodes } from "../CRNodes";
import { yaml } from "../utils/yaml";
import { getWorkerInstance } from "../WorkerInstances";
import { GithubActionUpdateTask } from "./GithubActionUpdateTask";
import { updateGithubActionPrepareBranch } from "./updateGithubActionPrepareBranch";

export const referenceActionContent = await readFile("./templates/publish.yaml", "utf8");
export const referencePullRequestMessage = await readFile("./templates/tasks/GithubActionUpdatePR.md", "utf8");
export const referenceActionContentHash = sha256(referenceActionContent); // check if target publish.yaml already latest

// for debug only
export const testUpdatedPublishYaml = await readFile(import.meta.dir + "/test-updated-publish.yml", "utf8");

if (import.meta.main) {
  // const repo = "https://github.com/54rt1n/ComfyUI-DareMerge";
  const repo = "https://github.com/snomiao/ComfyUI-DareMerge-test";
  // await GithubActionUpdateTask.findOneAndDelete({ repo });

  // aprove test
  // const approvedHash = "e6de732024cf2b64488ec093818fc2e01707c9bc97d306a42b3c22d2ef834686";
  // await approveGithubActionUpdateTask(repo, approvedHash);

  // test on single repo
  // await updateGithubActionTask(repo);

  await updateGithubActionTaskList();

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

export async function updateGithubActionTask(repo: string) {
  const task =
    (await GithubActionUpdateTask.findOneAndUpdate(
      { repo },
      { $set: { updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    )) || DIE("never");

  if (referenceActionContentHash !== task.branchVersionHash) {
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

  // make pr
  if (
    referenceActionContentHash !== task.pullRequestVersionHash &&
    referenceActionContentHash === task.approvedBranchVersionHash
  ) {
    const [src, branch] = task.forkedBranchUrl!.split("/tree/");
    const pullRequestUrl = await createPR({
      branch: branch || DIE("missing branch in forkedBranchUrl: " + task.forkedBranchUrl),
      src: src || DIE("missing origin in forkedBranchUrl: " + task.forkedBranchUrl),
      dst: repo,
      msg: task.pullRequestMessage || DIE("approved task is missing pullRequestMessage"),
    });
    Object.assign(
      task,
      (await GithubActionUpdateTask.findOneAndUpdate(
        { repo },
        { $set: { pullRequestUrl, pullRequestVersionHash: task.approvedBranchVersionHash, updatedAt: new Date() } },
        { upsert: true, returnDocument: "after" },
      )) || DIE("never"),
    );
  }

  console.log("Updated: " + repo);
}
