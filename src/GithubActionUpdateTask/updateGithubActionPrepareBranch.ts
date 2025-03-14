import DIE from "@snomiao/die";
import { readFile, writeFile } from "fs/promises";
import { globby } from "globby";
import pProps from "p-props";
import { $ } from "../cli/echoBunShell";
import { parseUrlRepoOwner, stringifyGithubOrigin } from "../parseOwnerRepo";
import { parseTitleBodyOfMarkdown } from "../parseTitleBodyOfMarkdown";
import { checkoutRepoOnBranch } from "./checkoutRepoOnBranch";
import { gptWriter } from "./gptWriter";
import {
  referenceActionContent,
  referenceActionContentHash,
  referencePullRequestMessage,
} from "./updateGithubActionTask";

export async function updateGithubActionPrepareBranch(repo: string) {
  console.log(`$ updateGithubActionPrepareBranch("${repo}")`);
  const branch = "update-publish-yaml";
  const { cwd, html_url } = await checkoutRepoOnBranch(repo, branch);
  
  // can also peek on ${repo_url}/raw/main/.github/workflows/publish.yml
  const files = await globby(`${cwd}/.github/workflows/{publish,publish_action}.{yaml,yml}`);
  console.assert(
    files.length === 1 || DIE(`expected exactly 1 publish.yaml file, but got ${files.length} ${JSON.stringify(files)}`),
  );
  const file = files[0];
  const currentContent = await readFile(file, "utf8");

  const hasNewLineAtTheEnd = currentContent.match(/\n$/) != null;
  
  const updatedActionContent =
    (await gptWriter([
      {
        role: "system",
        content: "You write only yaml content, no explain, no code-fences, output only yaml content",
      },
      { role: "developer", content: "$ read current .github/workflows/publish.yaml" },
      { role: "function", name: "read", content: currentContent },
      { role: "developer", content: "$ read reference .github/workflows/publish.yaml" },
      { role: "function", name: "read", content: referenceActionContent },
      { role: "developer", content: "$ read Pull Request message template" },
      { role: "function", name: "read", content: referencePullRequestMessage },
      { role: "developer", content: "$ read NODE_AUTHOR_OWNER" },
      { role: "function", name: "read", content: parseUrlRepoOwner(repo).owner },
      {
        role: "user",
        content:
          "Please update current publish.yaml, respect to publish.yaml, check carefully, you make only up to 3 changes that mentioned on the PullReuqest Message template, don't touch other parts even it's different with current one. Give me a updated publish.yaml content.",
      },
    ])).trim() + (hasNewLineAtTheEnd ? "\n":'');
  // console.log(yaml.stringify({ testUpdatedPublishYaml, updatedActionContent }));
  await writeFile(file, updatedActionContent);

  if (updatedActionContent === currentContent) {
    // already up to date
    return {
      hash: referenceActionContentHash,
      diff: undefined,
      forkedBranchUrl: undefined,
      commitMessage: undefined,
      pullRequestMessage: undefined,
    };
  }

  const diff = await $`cd ${cwd} && git diff`.text();
  console.log({ diff });

  const { pullRequestMessage, commitMessage } = await pProps({
    commitMessage: gptWriter([
      {
        role: "system",
        content:
          "Act as a commit message writer, no explain, output only plain text message, start with: chore(publish): ",
      },
      { role: "user", content: JSON.stringify({ diff }) },
    ]),
    pullRequestMessage: gptWriter([
      { role: "system", content: "Act as a pull request message writer, no explain, output as markdown format" },
      { role: "developer", content: "$ read git diff" },
      { role: "function", name: "read", content: diff },
      { role: "developer", content: "$ read Pull Request message template" },
      { role: "function", name: "read", content: referencePullRequestMessage },
      {
        role: "user",
        content:
          "Write pull request message filling the PR msg template, only mention the happened changes that 'git diff' result indicated.",
      },
    ]),
  });
  const origin = await stringifyGithubOrigin(parseUrlRepoOwner(html_url));
  await $`cd ${cwd} && git add . && git commit -am ${commitMessage} && git push -f ${origin} ${branch}`;
  // ensure pr message is parsable
  const { title, body } = parseTitleBodyOfMarkdown(pullRequestMessage);

  return {
    hash: referenceActionContentHash,
    diff: diff,
    forkedBranchUrl: html_url + "/tree/" + branch,
    commitMessage,
    pullRequestMessage,
  };
}
