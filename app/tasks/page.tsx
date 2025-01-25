import { GithubActionUpdateTask } from "@/src/GithubActionUpdateTask/GithubActionUpdateTask";
import Link from "next/link";
import pProps from "p-props";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default async function TasksIndexPage() {
  const counts = await pProps({
    GithubActionUpdateTask: GithubActionUpdateTask.estimatedDocumentCount(),
  });

  return (
    <ol>
      <li>
        <Link href="/tasks/github-action-update">GithubActionUpdateTask x {counts.GithubActionUpdateTask}</Link>
      </li>
    </ol>
  );
}
