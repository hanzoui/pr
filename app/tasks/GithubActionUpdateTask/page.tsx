import { getAuthUser } from "@/app/api/auth/[...nextauth]/getAuthUser";
import "@/app/markdown.css";
import "@/app/tasks-panel.css";
import { parseTitleBodyOfMarkdown } from "@/src/parseTitleBodyOfMarkdown";
import { yaml } from "@/src/utils/yaml";
import { forbidden } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApprovePRButton } from "./ApprovePRButton";
import { listGithubActionUpdateTask, resetErrorForGithubActionUpdateTask } from "./actions";
/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default async function GithubActionUpdateTaskPage() {
  const user = await getAuthUser();
  if (!user.admin) return forbidden();

  const data = await listGithubActionUpdateTask();
  const errorData = data.filter((e) => e.error);
  const processingData = data.filter((e) => !e.pullRequestMessage);
  const pendingReviewsData = data.filter(
    (e) => e.branchVersionHash && e.branchVersionHash !== e.approvedBranchVersionHash,
  );
  const pendingCreatePRData = data.filter(
    (e) => e.approvedBranchVersionHash && e.approvedBranchVersionHash !== e.pullRequestVersionHash,
  );
  const prCreatedData = data.filter((e) => e.pullRequestUrl);

  return (
    <div className="tasks-panel">
      <h1>GithubActionUpdateTasks in Total x{data.length}</h1>
      <ul className="p-4">
        <li>1. Drafting PRs x{processingData.length}</li>
        <li>2. Pending Reviews x{pendingReviewsData.length}</li>
        <li>3. Pending Create Pull Request x{pendingCreatePRData.length}</li>
        <li>4. Pull Request Created x{prCreatedData.length}</li>
        <li>5. Errors x{errorData.length}</li>
      </ul>

      <details>
        <summary>
          <h2>1. Drafting PRs x{processingData.length}</h2>
        </summary>
        <ol className="flex flex-col max-w-full px-4">
          {processingData.map((e, i, a) => {
            return (
              <li key={e.repo}>
                {i + 1}.{" "}
                <a target="_blank" href={e.repo}>
                  {e.repo}
                </a>
              </li>
            );
          })}
        </ol>
      </details>

      <details>
        <summary>
          <h2>2. Pending Reviews x{pendingReviewsData.length}</h2>
        </summary>
        <ol className="flex flex-col max-w-full px-4">
          {pendingReviewsData.map((e, i) => (
            <li key={e.repo} className="flex flex-col my-4">
              <div className="flex justify-between">
                <span className="text-xl font-bold">
                  {i + 1}. Updating publish.yaml for{" "}
                  <a target="_blank" href={e.repo}>
                    {e.repo}
                  </a>
                </span>
                <ApprovePRButton repo={e.repo} branchVersionHash={e.branchVersionHash} />
              </div>

              <div className="flex max-h-[70em] max-w-full overflow-auto">
                <div className="flex flex-col">
                  <h3>DRAFTED PULL REQUEST MESSAGE</h3>
                  <Markdown className="overflow-auto markdown markdown-frame max-w-[50em]" remarkPlugins={[remarkGfm]}>
                    {e.pullRequestMessage ?? ""}
                  </Markdown>
                </div>
                <div className="flex shrink flex-col max-h-full overflow-auto">
                  <div className="flex flex-col">
                    <div>
                      <a target="_blank" href={e.forkedBranchUrl}>
                        <h3>COMMIT MESSAGE</h3>
                      </a>
                    </div>
                    <code className="whitespace-pre-wrap block overflow-auto markdown markdown-frame w-[30em]">
                      {e.commitMessage ?? ""}
                    </code>
                  </div>
                  <div className="flex flex-col">
                    <h3>BRANCH DIFF RESULT</h3>
                    <code className="whitespace-pre-wrap block overflow-auto markdown markdown-frame w-[30em]">
                      {e.branchDiffResult ?? ""}
                    </code>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </details>

      <details>
        <summary>
          <h2>3. Pending Create Pull Request x{pendingCreatePRData.length}</h2>
        </summary>
        <ol className="flex flex-col max-w-full px-4 gap-4">
          {pendingCreatePRData.map((e, i) => {
            return (
              <li key={e.repo}>
                {i + 1}.{" "}
                <a target="_blank" href={e.repo}>
                  {e.repo}
                </a>{" "}
                - Creating PR [{parseTitleBodyOfMarkdown(e.pullRequestMessage!).title}]...
                <button
                  className="btn"
                  onClick={async () => {
                    "use server";
                    await resetErrorForGithubActionUpdateTask(e.repo);
                  }}
                >
                  Reset
                </button>
              </li>
            );
          })}
        </ol>
      </details>

      <details>
        <summary>
          <h2>4. Pull Request Created x{prCreatedData.length}</h2>
        </summary>
      </details>
      <ol className="flex flex-col max-w-full px-4 gap-4">
        {prCreatedData.map((e, i) => {
          return (
            <li key={e.repo}>
              {i + 1}.{" "}
              <a target="_blank" href={e.repo}>
                {e.repo}
              </a>{" "}
              - Created PR
              <a target="_blank" href={e.pullRequestUrl}>
                {parseTitleBodyOfMarkdown(e.pullRequestMessage!).title}
              </a>
            </li>
          );
        })}
      </ol>

      <details>
        <summary>
          <h2>5. Errors x{errorData.length}</h2>
        </summary>
        <ol className="flex flex-col max-w-full px-4 gap-4">
          {errorData.map((e, i, a) => {
            return (
              <li key={e.repo}>
                <div className="flex justify-between px-4">
                  <span>
                    {i + 1}.{" "}
                    <a target="_blank" href={e.repo}>
                      {e.repo}
                    </a>
                  </span>
                  <button
                    className="btn"
                    onClick={async () => {
                      "use server";
                      await resetErrorForGithubActionUpdateTask(e.repo);
                    }}
                  >
                    Reset
                  </button>
                </div>
                <pre className="whitespace-pre-wrap p-4 m-4 rounded-sm text-white bg-black ">{yaml.stringify(e)}</pre>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
