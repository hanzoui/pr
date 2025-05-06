import { compareBy } from "comparing";
import * as d3 from "d3";
import { groupBy, sum, uniq, uniqBy } from "rambda";
import sflow from "sflow";
import { GithubContributorAnalyzeTask } from "./GithubContributorAnalyzeTask";

if (import.meta.main) {
  // clean solved error
  //   await GithubContributorAnalyzeTask.updateMany(
  //     { contributors: { $exists: true } },
  //     { $unset: { error: 1, errorAt: 1 } },
  //   );

  // analyze
  const data = await sflow(GithubContributorAnalyzeTask.find({})).toArray();
  const flat = data.map((e) => e.contributors?.map((y) => ({ ...y, repoUrl: e.repoUrl })) ?? []).flat();
  const byEmails = groupBy((e) => e.email?.toLowerCase() ?? "", flat);
  const json = Object.entries(byEmails)
    .map(([email, e]) => ({
      email,
      commitCount: sum(e!.map((e) => e!.count)),
      //   repos: e!
      //     .map((e) => stringifyGithubRepoUrl(parseUrlRepoOwner(e!.repoUrl)).slice("https://github.com".length))
      //     .join(" "),
      repoCount: uniq(e!.map((e) => e!.repoUrl)).length,
      usernameCount: uniq(e!.map((e) => e!.name)).length,
      usernames: uniqBy(
        (e) => e.toLocaleLowerCase(),
        e!.map((e) => e!.name),
      )
        .toSorted()
        .join(" / "),
    }))
    .toSorted(compareBy((e) => -e.commitCount));

  console.log(json);
  await Bun.write("./.cache/uniq-contributor-emails.csv", d3.csvFormat(json));
  console.log("done");
}

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default async function GithubContributorAnalyzeTaskPage() {
  return;
}
