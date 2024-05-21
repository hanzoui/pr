#!/usr/bin/env bun
import "dotenv/config";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import md5 from "md5";
import { basename, dirname } from "path";
import { $, question } from "zx";
import { DIE } from "./DIE";
import { gh } from "./scripts/gh";
$.verbose = true;
// read env/parameters
console.log("Fetch Current Github User...");
const user = (await gh.users.getAuthenticated()).data;

const GIT_USERNAME =
  process.env.GIT_USERNAME ||
  (user.email && user.name) ||
  (await question("Input env.GIT_USERNAME: ")) ||
  DIE("Missing env.GIT_USERNAME");
const GIT_USEREMAIL =
  process.env.GIT_USEREMAIL ||
  (user.email && user.email) ||
  (await question("Input env.GIT_USEREMAIL: ")) ||
  DIE("Missing env.GIT_USEREMAIL");

const FORK_OWNER =
  process.env.FORK_OWNER?.replace(/"/g, "")?.trim() ||
  user.name ||
  (await question(
    "Input env.FORK_OWNER (for example FORK_OWNER=ComfyNodePRs, will fork into https://github.com/ComfyNodePRs): "
  )) ||
  DIE("Missing env.FORK_OWNER");
const FORK_PREFIX =
  (process.env.FORK_PREFIX?.replace(/"/g, "")?.trim() ||
    (await question(
      "Input env.FORK_PREFIX ('PR-' is Recommened, but also it could be empty): "
    ))) ??
  DIE('Missing env.FORK_PREFIX, if you want empty maybe try FORK_PREFIX=""');

const upstreamUrl =
  process.env.REPO ||
  (await question("Input the PR target env.REPO: ")) ||
  DIE("Missing env.REPO");

console.log("GIT_USER: ", user.name, user.email);

// main
{
  await ComfyRegistryPR();
  // todo: build and publish to npm
}

async function ComfyRegistryPR() {
  // Repo Define
  const upstream = parseOwnerRepo(upstreamUrl);
  const salt = process.env.SALT || "m3KMgZ2AeZGWYh7W";
  console.log(`* Change env.SALT=${salt} will fork into a different repo`);
  const repo_hash = md5(
    `${salt}-${user.name}-${upstream.owner}/${upstream.repo}`
  ).slice(0, 8);
  const forkRepoName =
    (FORK_PREFIX && `${FORK_PREFIX}${upstream.repo}-${repo_hash}`) ||
    upstream.repo;
  const forkDst = `${FORK_OWNER}/${forkRepoName}`;
  const forkSSHUrl = `git@github.com:${forkDst}`;
  const forkHTTPSUrl = `https://github.com/${forkDst}`;
  const src = parseOwnerRepo(forkSSHUrl);
  // console.log("PR_SRC: ", forkSSHUrl);
  // console.log("PR_DST: ", upstreamUrl);
  // console.log(forkSSHUrl);
  console.log("Cleaning the pr before run");
  const dir = `prs/${src.repo}`;
  await rm(dir, { recursive: true }).catch(() => null);

  //   const choose = await question(
  //     `
  // Prepare to fork...
  // From: ${upstreamUrl}
  //   To: ${forkHTTPSUrl}
  // Are you ready to fork (y/N)?
  // `.trim()
  //   );
  //   choose.match(/y/i) || DIE("User Aborted");
  //   FORK
  await fork(upstream, src);

  // prInfos
  const prInfos = await Promise.all([
    await add_publish(dir, upstreamUrl, forkSSHUrl),
    await add_pyproject(dir, upstreamUrl, forkSSHUrl),
  ]);
  // prs
  await Promise.all(
    prInfos.map((prInfo) => pr({ ...prInfo, src, dst: upstream }))
  );

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
      if (e.message.match("A pull request already exists for")) {
        console.log("PR Existed ", e);
        return null;
      }
      throw e;
    });
  console.log("PR OK", pr_result?.data.html_url);
}

async function add_pyproject(
  dir: string,
  upstreamUrl: string,
  forkUrl: string
) {
  const branch = "pyproject";
  const tmpl = await readFile("./templates/add-toml.md", "utf8");
  const { title, body } = parseTitleBodyOfMarkdown(tmpl);
  const repo = parseOwnerRepo(forkUrl);

  if (await gh.repos.getBranch({ ...repo, branch }).catch(() => null))
    return { title, body, branch }; // skip if branch existed

  const src = parseOwnerRepo(upstreamUrl);
  const cwd = `${dir}/${branch}/${src.repo}`; // src.repo is for keep correct directory name
  await $`git clone ${upstreamUrl} ${cwd}`;

  // make changes
  // try linux first
  await $({ cwd })`comfy node init`;
  await $({ cwd })`
source ${process.cwd() + "/.venv/bin/activate"}
comfy node init
  `;
  await $({ cwd })`${process.cwd() + "\\.venv\\Scripts\\activate"}
comfy node init
    `;
  // commit changes
  await $({ cwd })`
git config user.name ${GIT_USERNAME}
git config user.email ${GIT_USEREMAIL}
git checkout -b ${branch}
git add .
git commit -am ${`chore(${branch}): ${title}`}
git push "${forkUrl}" ${branch}:${branch}
  `;
  const branchUrl = `https://github.com/${repo.owner}/${repo.repo}/tree/${branch}`;
  console.log(`Branch Push OK: ${branchUrl}`);
  return { title, body, branch };
}

async function add_publish(dir: string, upstreamUrl: string, forkUrl: string) {
  const branch = "publish";
  const tmpl = await readFile("./templates/add-action.md", "utf8");
  const { title, body } = parseTitleBodyOfMarkdown(tmpl);
  const repo = parseOwnerRepo(forkUrl);

  if (await gh.repos.getBranch({ ...repo, branch }).catch(() => null))
    return { title, body, branch }; // skip if branch existed

  const src = parseOwnerRepo(upstreamUrl);
  const cwd = `${dir}/${branch}/${src.repo}`; // src.repo is for keep correct directory name

  await $`git clone ${upstreamUrl} ${cwd}`;
  // make changes
  const file = `${cwd}/.github/workflows/publish.yml`;
  const publishYmlPath = "./templates/publish.yaml";
  console.log("Copying ", publishYmlPath, "to", file);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, await readFile(publishYmlPath, "utf8"));
  // commit & push changes
  await $({ cwd })`
git config user.name ${process.env.GIT_CONFIG_USER_NAME || user.name}
git config user.email ${process.env.GIT_CONFIG_USER_EMAIL || user.email}
git checkout -b ${branch}
git add .
git commit -am "chore(${branch}): ${title}"
git push "${forkUrl}" ${branch}:${branch}
    `;

  const branchUrl = `https://github.com/${repo.owner}/${repo.repo}/tree/${branch}`;
  console.log(`Branch Push OK: ${branchUrl}`);
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
  const forkedUrl =
    forkResult?.data.html_url ??
    "https://github.com/" + to.owner + "/" + to.repo;
  console.log("FORK OK ", forkedUrl);
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
