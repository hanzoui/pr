import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskDataOrNull, TaskErrorOrNull } from "@/packages/mongodb-pipeline-ts/Task";
import { CNRepos, type CNRepo } from "@/src/CNRepos";
import { Suspense } from "react";
import yaml from "yaml";

interface CNReposPageProps {
  searchParams?: Promise<{
    page?: string;
  }>;
}

export default async function CNReposPage({ searchParams }: CNReposPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page) || 1;

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
            <CNReposTable page={page} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function CNReposTable({ page }: { page: number }) {
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [repos, totalCount] = await Promise.all([
    CNRepos.find({}).sort({ _id: -1 }).skip(skip).limit(pageSize).toArray(),
    CNRepos.countDocuments({}),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!repos.length) {
    return <div className="text-center p-8">No repositories found</div>;
  }

  return (
    <div className="space-y-4">
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

      {totalPages > 1 && <CNReposPagination currentPage={page} totalPages={totalPages} />}
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
    if (TaskErrorOrNull(repo.crPulls)) return "❗";
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
        {TaskDataOrNull(repo.candidate) ? (
          <Badge variant="outline" className="text-xs px-2">
            ✓
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {TaskDataOrNull(repo.crPulls)?.map((pull, idx) => (
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
          {TaskErrorOrNull(repo.crPulls) && (
            <Badge variant="destructive" className="text-xs" title={TaskErrorOrNull(repo.crPulls) || ""}>
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
              candidate: TaskDataOrNull(repo.candidate),
              info: TaskDataOrNull(repo.info)
                ? {
                    archived: TaskDataOrNull(repo.info)?.archived,
                    private: TaskDataOrNull(repo.info)?.private,
                    default_branch: TaskDataOrNull(repo.info)?.default_branch,
                  }
                : null,
              pulls_count: TaskDataOrNull(repo.pulls)?.length,
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

function CNReposPagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    return `/cnrepos${params.toString() ? "?" + params.toString() : ""}`;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>

      <Pagination>
        <PaginationContent>
          {currentPage > 1 && (
            <PaginationItem>
              <PaginationPrevious href={createPageUrl(currentPage - 1)} />
            </PaginationItem>
          )}

          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink href={createPageUrl(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && <PaginationItem>...</PaginationItem>}
            </>
          )}

          {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
            const page = startPage + i;
            return (
              <PaginationItem key={page}>
                <PaginationLink href={createPageUrl(page)} isActive={page === currentPage}>
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <PaginationItem>...</PaginationItem>}
              <PaginationItem>
                <PaginationLink href={createPageUrl(totalPages)}>{totalPages}</PaginationLink>
              </PaginationItem>
            </>
          )}

          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationNext href={createPageUrl(currentPage + 1)} />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </div>
  );
}
