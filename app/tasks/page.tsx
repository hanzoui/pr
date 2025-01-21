import { GithubActionUpdateTask } from "@/src/2025-01-20-GithubActionUpdateTask/GithubActionUpdateTask";
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
        <Link href="/tasks/GithubActionUpdateTask">GithubActionUpdateTask x {counts.GithubActionUpdateTask}</Link>
      </li>
    </ol>
  );
}
