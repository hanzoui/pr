#!bun
import { readFile } from "fs/promises";
import DIE from "phpdie";
import sflow from "sflow";
import sha256 from "sha256";
import { createPR } from "../createGithubPullRequest";
import { CRNodes } from "../CRNodes";
import { yaml } from "../utils/yaml";
import { GithubActionUpdateTask } from "./GithubActionUpdateTask";
import { updateGithubActionPrepareBranch } from "./updateGithubActionPrepareBranch";
console.log({ GithubActionUpdateTask: await GithubActionUpdateTask.find().toArray() });

const path = "./templates/publish.yaml";
export const referenceActionContent = await readFile(path, "utf8");
export const referencePullRequestMessage = await readFile(import.meta.dir + "/GithubActionUpdateTask.md", "utf8");
export const testUpdatedPublishYaml = await readFile(import.meta.dir + "/test-updated-publish.yml", "utf8");
export const referenceActionContentHash = sha256(referenceActionContent);

if (import.meta.main) {
  // const repo = "https://github.com/54rt1n/ComfyUI-DareMerge";
  const repo = "https://github.com/snomiao/ComfyUI-DareMerge-test";

  // await GithubActionUpdateTask.findOneAndDelete({ repo });

  // aprove test
  // const approvedHash = "e6de732024cf2b64488ec093818fc2e01707c9bc97d306a42b3c22d2ef834686";
  // await approveGithubActionUpdateTask(repo, approvedHash);

  // test on single repo
  // await updateGithubActionTask(repo);

  // task list importer
  await sflow(CRNodes.find().project({ repo: "$repository", _id: 0 }))
    .log()
    .map(({ repo }) => String(repo))
    .filter((e) => e.startsWith("https://github.com"))
    .pMap((repo) => GithubActionUpdateTask.updateOne({ repo }, { $set: { updatedAt: new Date() } }, { upsert: true }))
    .run();

  // task list scanner
  await sflow(GithubActionUpdateTask.find({ error: { $exists: false } }).project({ repo: 1 }))
    .pMap(
      (e) =>
        updateGithubActionTask(e.repo).catch(async (e) => {
          const error = String(e);
          await GithubActionUpdateTask.updateOne(
            { repo },
            { $set: { error, updatedAt: new Date() } },
            { upsert: true },
          );
        }),
      { concurrency: 3 },
    )
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
