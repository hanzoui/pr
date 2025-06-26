import { GithubActionUpdateTask } from "@/src/GithubActionUpdateTask/GithubActionUpdateTask";
import Link from "next/link";
import {
  GithubContributorAnalyzeTask,
  GithubContributorAnalyzeTaskFilter,
} from "./github-contributor-analyze/GithubContributorAnalyzeTask";
import { SuspenseUse } from "./SuspenseUse";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default async function TasksIndexPage() {
  const countBadges = {
    GithubActionUpdateTask: <SuspenseUse>{GithubActionUpdateTask.estimatedDocumentCount()}</SuspenseUse>,
    GithubContributorAnalyzeTask: <SuspenseUse>{GithubContributorAnalyzeTask.estimatedDocumentCount()}</SuspenseUse>,
    GithubContributorAnalyzeTaskRemain: (
      <SuspenseUse>{GithubContributorAnalyzeTask.countDocuments(GithubContributorAnalyzeTaskFilter)}</SuspenseUse>
    ),
  };

  return (
    <ol className="px-8">
      <li>
        <Link href="/tasks/github-action-update">GithubActionUpdateTask x {countBadges.GithubActionUpdateTask}</Link>
        <Link href="/tasks/github-contributor-analyze">
          GithubContributorAnalyzeTask Total {countBadges.GithubContributorAnalyzeTask} (remain:{" "}
          {countBadges.GithubContributorAnalyzeTaskRemain})
        </Link>
      </li>
    </ol>
  );
}
