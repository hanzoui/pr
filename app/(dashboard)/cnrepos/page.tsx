import { CNRepos, type CNRepo } from "@/src/CNRepos";
import { Suspense } from "react";
import yaml from "yaml";

export default async function CNReposPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Custom Node Repositories</h1>

      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Legend:</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>✅: Listed in Registry + ComfyUI-Manager</div>
          <div>✔️: Listed in Registry only</div>
          <div>🧪: Ready to Create PR</div>
          <div>👀: Pending Review</div>
          <div>🫗: Outside ComfyUI-Manager</div>
          <div>❗: Error occurred</div>
        </div>
      </div>

      <Suspense fallback={<div className="text-center p-8">⏳ Loading repositories...</div>}>
        <CNReposTable />
      </Suspense>
    </div>
  );
}

async function CNReposTable() {
  const repos = await CNRepos.find({}).sort({ _id: -1 }).limit(100).toArray();

  if (!repos.length) {
    return <div className="text-center p-8">No repositories found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 border-b text-left">Status</th>
            <th className="px-4 py-2 border-b text-left">Repository</th>
            <th className="px-4 py-2 border-b text-left">Registry</th>
            <th className="px-4 py-2 border-b text-left">ComfyUI-Manager</th>
            <th className="px-4 py-2 border-b text-left">Candidate</th>
            <th className="px-4 py-2 border-b text-left">Pull Requests</th>
            <th className="px-4 py-2 border-b text-left">Info</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => (
            <CNRepoRow key={repo._id?.toString()} repo={repo} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CNRepoRow({ repo }: { repo: CNRepo }) {
  const getStatusIcon = () => {
    if (!repo.cr && !repo.cm) return "🫗";
    if (!!repo.cr && !!repo.cm && repo.crPulls?.state === "ok") return "✅";
    if (!!repo.cr && !!repo.cm) return "☑️";
    if (!!repo.cr && !repo.cm) return "✔️";
    if (!repo.crPulls) return "🧪";
    if (repo.crPulls.state === "ok") return "👀";
    if (repo.crPulls.error) return "❗";
    return "❓";
  };

  const getRepoName = (url: string) => {
    return url.replace(/^https:\/\/github\.com\//, "");
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 border-b text-center text-lg" title={getStatusDescription()}>
        {getStatusIcon()}
      </td>
      <td className="px-4 py-2 border-b">
        <a
          href={repo.repository}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline font-mono text-sm"
        >
          {getRepoName(repo.repository)}
        </a>
      </td>
      <td className="px-4 py-2 border-b text-center">
        {repo.cr_ids?.length || repo.cr ? (
          <span className="text-green-600">✓</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-2 border-b text-center">
        {repo.cm_ids?.length || repo.cm ? (
          <span className="text-green-600">✓</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-2 border-b text-center">
        {repo.candidate?.data ? <span className="text-orange-600">✓</span> : <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-2 border-b">
        <div className="space-y-1">
          {repo.crPulls?.data?.map((pull, idx) => (
            <div key={idx} className="text-xs">
              {pull.pull?.html_url ? (
                <a href={pull.pull.html_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  #{pull.pull.html_url.split("/").pop()} ({pull.type})
                </a>
              ) : (
                <span className="text-gray-500">Pending</span>
              )}
            </div>
          ))}
          {repo.crPulls?.error && (
            <div className="text-xs text-red-600" title={repo.crPulls.error}>
              Error occurred
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-2 border-b">
        <details className="text-xs">
          <summary className="cursor-pointer text-blue-600">Details</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
            {yaml.stringify({
              repository: repo.repository,
              cr_ids: repo.cr_ids?.length,
              cm_ids: repo.cm_ids?.length,
              candidate: repo.candidate?.data,
              info: repo.info?.data
                ? {
                    archived: repo.info.data.archived,
                    private: repo.info.data.private,
                    default_branch: repo.info.data.default_branch,
                  }
                : null,
              pulls_count: repo.pulls?.data?.length,
              crPulls_state: repo.crPulls?.state,
            })}
          </pre>
        </details>
      </td>
    </tr>
  );

  function getStatusDescription() {
    const icon = getStatusIcon();
    const descriptions = {
      "🫗": "Repository not listed in ComfyUI-Manager or Registry",
      "✅": "Listed in both Registry and ComfyUI-Manager (PR successful)",
      "☑️": "Listed in both Registry and ComfyUI-Manager",
      "✔️": "Listed in Registry only",
      "🧪": "Ready to create PR",
      "👀": "Pull request pending review",
      "❗": "Error occurred during processing",
      "❓": "Unknown status",
    };
    return descriptions[icon as keyof typeof descriptions] || "Unknown status";
  }
}
