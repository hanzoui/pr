import { db } from "@/src/db";
import { gitCheckoutOnBranch } from "@/src/GithubActionUpdateTask/gitCheckoutOnBranch";
import { rmdir } from "fs/promises";
import sha256 from "sha256";

// git shortlog --summary --numbered --email
export const MaxDuration = 300; // https://vercel.com/changelog/serverless-functions-can-now-run-up-to-5-minutes

type Contributor = {
  count: number;
  name: string;
  email: string;
};

const GithubContributorAnalzyeTask = db.collection<{
  repoUrl: string; //unique
  contributors: Contributor[];
  updatedAt?: Date;
  // no history
}>("GithubContributorAnalzyeTask");

if (import.meta.main) {
  // await GithubContributorAnalzyeTask.createIndex({ repoUrl: 1, updatedAt: -1 });
  await GithubContributorAnalzyeTask.drop();
  await GithubContributorAnalzyeTask.createIndex({ repoUrl: 1 }, { unique: true });

  // await $pipeline(CRNodes)
  //   .project({ repo: "$repository", _id: 0 })
  //   .match({ repo: /^https:\/\/github\.com/ })
  //   .merge({ into: GithubContributorAnalzyeTask.collectionName, on: "repo", whenMatched: "merge" })
  //   .aggregate()
  //   .next();

  const repoUrl = "https://github.com/Comfy-Org/Comfy-PR";

  const branch = "analyze-contributors";
  const tmpDir = "/tmp/github-contributor-analyze/" + sha256(repoUrl).slice(0, 16);
  const cwd = await gitCheckoutOnBranch({ url: repoUrl, branch, cwd: tmpDir });
  const logs = await Bun.$.cwd(cwd)`git shortlog --summary --numbered --email`.text().finally(async () => {
    await rmdir(tmpDir, { recursive: true }).catch((e) => {});
  });

  console.log(logs);
  const contributors = parseShortLog(logs);
  console.log(contributors);

  await GithubContributorAnalzyeTask.insertOne({ repoUrl, contributors, updatedAt: new Date() });

  console.log("done");

  // git clone ${url}
  // fetch log
  // parse
  // clean
}

function parseShortLog(log: string): Contributor[] {
  const contributors: Contributor[] = [];
  const lines = log.trim().split("\n");

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(.+?)\s+<(.+?)>$/);
    if (match) {
      const [, count, name, email] = match;
      contributors.push({
        count: parseInt(count, 10),
        name: name.trim(),
        email: email.trim(),
      });
    }
  }

  return contributors;
}

// const jsonResult = parseShortLog(result);
// console.log(JSON.stringify(jsonResult, null, 2));
