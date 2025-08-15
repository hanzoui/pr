import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CNRepos, type CNRepo } from "@/src/CNRepos";
import { Suspense } from "react";
import yaml from "yaml";

export default async function CNReposPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Custom Node Repositories</h1>
        <p className="text-muted-foreground">
          Manage and monitor ComfyUI custom node repositories and their registry integration status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span className="text-sm">Registry + ComfyUI-Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✔️</span>
              <span className="text-sm">Registry only</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🧪</span>
              <span className="text-sm">Ready to Create PR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👀</span>
              <span className="text-sm">Pending Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🫗</span>
              <span className="text-sm">Outside ComfyUI-Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">❗</span>
              <span className="text-sm">Error occurred</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>Recent repositories and their integration status</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center p-8">⏳ Loading repositories...</div>}>
            <CNReposTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function CNReposTable() {
  const repos = await CNRepos.find({}).sort({ _id: -1 }).limit(100).toArray();

  if (!repos.length) {
    return <div className="text-center p-8">No repositories found</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Status</TableHead>
          <TableHead>Repository</TableHead>
          <TableHead className="w-24 text-center">Registry</TableHead>
          <TableHead className="w-32 text-center">ComfyUI-Manager</TableHead>
          <TableHead className="w-24 text-center">Candidate</TableHead>
          <TableHead>Pull Requests</TableHead>
          <TableHead className="w-24">Info</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {repos.map((repo) => (
          <CNRepoRow key={repo._id?.toString()} repo={repo} />
        ))}
      </TableBody>
    </Table>
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
    <TableRow>
      <TableCell className="text-center text-lg" title={getStatusDescription()}>
        {getStatusIcon()}
      </TableCell>
      <TableCell>
        <a
          href={repo.repository}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline font-mono text-sm transition-colors"
        >
          {getRepoName(repo.repository)}
        </a>
      </TableCell>
      <TableCell className="text-center">
        {repo.cr_ids?.length || repo.cr ? (
          <Badge variant="secondary" className="text-xs px-2">
            ✓
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {repo.cm_ids?.length || repo.cm ? (
          <Badge variant="secondary" className="text-xs px-2">
            ✓
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {repo.candidate?.data ? (
          <Badge variant="outline" className="text-xs px-2">
            ✓
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {repo.crPulls?.data?.map((pull, idx) => (
            <div key={idx} className="text-xs">
              {pull.pull?.html_url ? (
                <a
                  href={pull.pull.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  #{pull.pull.html_url.split("/").pop()} ({pull.type})
                </a>
              ) : (
                <span className="text-muted-foreground">Pending</span>
              )}
            </div>
          ))}
          {repo.crPulls?.error && (
            <Badge variant="destructive" className="text-xs" title={repo.crPulls.error}>
              Error
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <details className="text-xs">
          <summary className="cursor-pointer text-primary hover:text-primary/80 transition-colors">Details</summary>
          <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-32 font-mono">
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
      </TableCell>
    </TableRow>
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
