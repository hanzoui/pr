#!/usr/bin/env zx
import "dotenv/config";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import md5 from "md5";
import { basename, dirname } from "path";
import "zx/globals";
import { gh } from "./scripts/gh.js";

// read env/parameters
console.log("Fetch Current Github User...");
const user = (await gh.users.getAuthenticated()).data;
const FORK_OWNER =
  process.env.FORK_OWNER?.replace(/"/g, "")?.trim() ||
  process.env.FORK_OWNER?.replace(/"/g, "")?.trim() ||
  user.name;
const FORK_PREFIX = process.env.FORK_PREFIX?.replace(/"/g, "")?.trim();
if (!FORK_OWNER) throw new Error("Missing FORK_OWNER");
if (!FORK_PREFIX) throw new Error("Missing FORK_PREFIX");
const dstUrl = process.env.REPO || process.argv[3] || process.argv[2];
if (!dstUrl) throw new Error("Missing dstUrl");
console.log("GIT_USER: ", user.name, user.email);

// main
{
  // Repo Define
  // TODO: add a confirmation
  const dst = parseOwnerRepo(dstUrl);
  const salt = process.env.SALT || "m3KMgZ2AeZGWYh7W";
  const repo_hash = md5(`${salt}-${user.name}-${dst.owner}/${dst.repo}`).slice(
    0,
    8
  );

  const srcUrl = `git@github.com:${FORK_OWNER}/${FORK_PREFIX}${dst.repo}-${repo_hash}`;
  const src = parseOwnerRepo(srcUrl);
  console.log("PR_SRC: ", srcUrl);
  console.log("PR_DST: ", dstUrl);
  console.log(srcUrl);

  console.log("Cleaning the pr before run");
  const dir = `prs/${src.repo}`;
  await rm(dir, { recursive: true }).catch(() => null);

  //   FORK
  await fork(dst, src);

  // tasks
  const [pyproject_info, publish_info] = await Promise.all([
    add_pyproject(dir, dstUrl, srcUrl),
    add_publish(dir, dstUrl, srcUrl),
  ]);
  // prs
  await Promise.all([
    pr({ ...pyproject_info, src, dst }),
    pr({ ...publish_info, src, dst }),
  ]);

  console.log("ALL DONE");
}

async function pr({
  title,
  body,
  branch,
  src,
  dst,
}: {
  title: string;
  body: string;
  branch: string;
  src: { owner: string; repo: string };
  dst: { owner: string; repo: string };
}) {
  const repo = (await gh.repos.get({ ...dst })).data;
  const pr_result = await gh.pulls
    .create({
      // pr info
      title,
      body,
      // source repo
      head_repo: src.owner + "/" + src.repo,
      head: src.owner + ":" + branch,
      // pr will merge into
      owner: dst.owner,
      repo: dst.repo,
      base: repo.default_branch,
      maintainer_can_modify: true,
      // draft: true,
    })
    .catch((e) => {
      if (e.message.match("A pull request already exists for")) return null;
      throw e;
    });
  console.log("PR OK", pr_result?.data.url);
}

async function add_pyproject(dir: string, pullUrl: string, pushUrl: string) {
  const branch = "pyproject";
  const tmpl = await readFile("./templates/add-toml.md", "utf8");
  const { title, body } = parseTitleBodyOfMarkdown(tmpl);
  const repo = parseOwnerRepo(pushUrl);
  if (await gh.repos.getBranch({ ...repo, branch }).catch(() => null))
    return { title, body, branch };

  const cwd = `${dir}/${branch}`;
  await $`git clone ${pushUrl} ${cwd}`;
  await $({ cwd })`
  git config user.name ${process.env.GIT_USERNAME || (user.email && user.name)}
  git config user.email ${
    process.env.GIT_USEREMAIL || (user.email && user.email)
  }
  git checkout -b ${branch}
  `;

  const p = $({ cwd })`comfy node init`;
  p.stdin.write("y"), p.stdin.end();
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  await p;
  await $({ cwd })`
    git add .
    git commit -am "chore(${branch}): ${title}"
    git push "${pushUrl}" ${branch}:${branch}
  `;
  console.log("Creating branch: pyproject OK");
  return { title, body, branch };
}

async function add_publish(dir: string, pullUrl: string, pushUrl: string) {
  const branch = "publish";
  const tmpl = await readFile("./templates/add-action.md", "utf8");
  const { title, body } = parseTitleBodyOfMarkdown(tmpl);
  const repo = parseOwnerRepo(pushUrl);
  if (await gh.repos.getBranch({ ...repo, branch }).catch(() => null))
    return { title, body, branch };

  const file = `${dir}/${branch}/.github/workflows/publish.yml`;
  const src = "./templates/publish.yaml";
  //           ./prs/repo/branch/
  console.log(src);
  // TODO: streaming process stdio
  const cwd = `${dir}/${branch}`;
  await $`git clone ${pushUrl} ${cwd}`;
  await $({ cwd })`
    git config user.name ${process.env.GIT_CONFIG_USER_NAME || user.name}
    git config user.email ${process.env.GIT_CONFIG_USER_EMAIL || user.email}
    git checkout -b ${branch}
    `;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, await readFile(src, "utf8"));
  await $({ cwd })`
    git add .
    git commit -am "chore(${branch}): ${title}"
    git push "${pushUrl}" ${branch}:${branch}
    `;

  console.log("Creating branch: publish OK");
  return { title, body, branch };
}

async function fork(
  from: { owner: string; repo: string },
  to: { owner: string; repo: string }
) {
  const forkResult = await gh.repos
    .createFork({
      ...(user.name !== to.owner && { organization: to.owner }),
      name: to.repo,
      owner: from.owner,
      repo: from.repo,
    })
    .catch((e) => {
      if (e.message.match("Name already exists on this account")) return null;
      throw e;
    });
  console.log("FORK OK ", forkResult?.data.url);
}

function parseOwnerRepo(name: string) {
  return {
    owner: basename(dirname(name.replace(/:/, "/"))),
    repo: basename(name.replace(/:/, "/")),
  };
}

function parseTitleBodyOfMarkdown(tmpl: string) {
  const title = tmpl.split("\n")[0].slice(1).trim();
  const body = tmpl.split("\n").slice(1).join("\n").trim();
  return { title, body };
}
