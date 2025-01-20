import { GithubActionUpdateTask } from "@/src/2025-01-20-GithubActionUpdateTask/GithubActionUpdateTask";
import { yaml } from "@/src/utils/yaml";
import pProps from "p-props";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default async function TasksIndexPage() {
  const counts = await pProps({
    GithubActionUpdateTask: GithubActionUpdateTask.estimatedDocumentCount(),
  });
  return <pre>{yaml.stringify(counts)}</pre>;
}
