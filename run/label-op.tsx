import { gh } from "@/src/gh";

export const REPOLIST = [
  "https://github.com/Comfy-Org/Comfy-PR",
  "https://github.com/comfyanonymous/ComfyUI",
  "https://github.com/Comfy-Org/ComfyUI_frontend",
  "https://github.com/Comfy-Org/desktop",
];

interface RepoMonitorState {
  lastCheckTime: Date;
  lastIssueId: number;
  lastPRId: number;
}

class RepoEventMonitor {
  private monitorState = new Map<string, RepoMonitorState>();
  private pollInterval = 30000; // 30 seconds

  constructor() {
    // Initialize state for each repo
    for (const repoUrl of REPOLIST) {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const key = `${owner}/${repo}`;
      this.monitorState.set(key, {
        lastCheckTime: new Date(),
        lastIssueId: 0,
        lastPRId: 0,
      });
    }
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
    return { owner: match[1], repo: match[2] };
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  async start() {
    console.log(`[${this.formatTimestamp()}] Starting repository event monitor...`);
    console.log(`[${this.formatTimestamp()}] Monitoring repos: ${REPOLIST.join(", ")}`);

    setInterval(() => {
      this.checkAllRepos();
    }, this.pollInterval);

    // Initial check
    await this.checkAllRepos();
  }

  private async checkAllRepos() {
    for (const repoUrl of REPOLIST) {
      try {
        await this.checkRepo(repoUrl);
      } catch (error) {
        console.error(`[${this.formatTimestamp()}] Error checking ${repoUrl}:`, error);
      }
    }
  }

  private async checkRepo(repoUrl: string) {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const key = `${owner}/${repo}`;
    const state = this.monitorState.get(key)!;

    await Promise.all([this.checkIssues(owner, repo, state), this.checkPullRequests(owner, repo, state)]);

    state.lastCheckTime = new Date();
  }

  private async checkIssues(owner: string, repo: string, state: RepoMonitorState) {
    try {
      // Get recent issues
      const { data: issues } = await gh.issues.listForRepo({
        owner,
        repo,
        state: "all",
        sort: "updated",
        direction: "desc",
        per_page: 10,
        since: new Date(Date.now() - this.pollInterval * 2).toISOString(),
      });

      for (const issue of issues) {
        if (issue.pull_request) continue; // Skip PRs in issues endpoint

        // Check for new issue
        if (issue.id > state.lastIssueId) {
          console.log(`[${this.formatTimestamp()}] 🆕 NEW ISSUE: ${owner}/${repo}#${issue.number} - ${issue.title}`);
          state.lastIssueId = Math.max(state.lastIssueId, issue.id);
        }

        // Check for new comments
        if (new Date(issue.updated_at) > state.lastCheckTime) {
          await this.checkIssueComments(owner, repo, issue.number);
        }

        // Check for label changes (by comparing updated time)
        if (new Date(issue.updated_at) > state.lastCheckTime) {
          await this.checkIssueLabels(owner, repo, issue.number, issue.labels);
        }
      }
    } catch (error) {
      console.error(`[${this.formatTimestamp()}] Error checking issues for ${owner}/${repo}:`, error);
    }
  }

  private async checkPullRequests(owner: string, repo: string, state: RepoMonitorState) {
    try {
      // Get recent PRs
      const { data: prs } = await gh.pulls.list({
        owner,
        repo,
        state: "all",
        sort: "updated",
        direction: "desc",
        per_page: 10,
      });

      for (const pr of prs) {
        // Check for new PR
        if (pr.id > state.lastPRId) {
          console.log(`[${this.formatTimestamp()}] 🔄 NEW PR: ${owner}/${repo}#${pr.number} - ${pr.title}`);
          state.lastPRId = Math.max(state.lastPRId, pr.id);
        }

        // Check for new PR comments
        if (new Date(pr.updated_at) > state.lastCheckTime) {
          await this.checkPRComments(owner, repo, pr.number);
        }

        // Check for label changes
        if (new Date(pr.updated_at) > state.lastCheckTime) {
          await this.checkIssueLabels(owner, repo, pr.number, pr.labels);
        }
      }
    } catch (error) {
      console.error(`[${this.formatTimestamp()}] Error checking PRs for ${owner}/${repo}:`, error);
    }
  }

  private async checkIssueComments(owner: string, repo: string, issueNumber: number) {
    try {
      const { data: comments } = await gh.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 5,
        since: new Date(Date.now() - this.pollInterval * 2).toISOString(),
      });

      for (const comment of comments) {
        if (new Date(comment.created_at) > new Date(Date.now() - this.pollInterval * 2)) {
          console.log(
            `[${this.formatTimestamp()}] 💬 NEW ISSUE COMMENT: ${owner}/${repo}#${issueNumber} by ${comment.user?.login}`,
          );
        }
      }
    } catch (error) {
      console.error(`[${this.formatTimestamp()}] Error checking issue comments:`, error);
    }
  }

  private async checkPRComments(owner: string, repo: string, prNumber: number) {
    try {
      // Check issue comments on PR
      const { data: issueComments } = await gh.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: 5,
        since: new Date(Date.now() - this.pollInterval * 2).toISOString(),
      });

      for (const comment of issueComments) {
        if (new Date(comment.created_at) > new Date(Date.now() - this.pollInterval * 2)) {
          console.log(
            `[${this.formatTimestamp()}] 💬 NEW PR COMMENT: ${owner}/${repo}#${prNumber} by ${comment.user?.login}`,
          );
        }
      }

      // Check review comments
      const { data: reviewComments } = await gh.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 5,
        since: new Date(Date.now() - this.pollInterval * 2).toISOString(),
      });

      for (const comment of reviewComments) {
        if (new Date(comment.created_at) > new Date(Date.now() - this.pollInterval * 2)) {
          console.log(
            `[${this.formatTimestamp()}] 🔍 NEW PR REVIEW COMMENT: ${owner}/${repo}#${prNumber} by ${comment.user?.login}`,
          );
        }
      }
    } catch (error) {
      console.error(`[${this.formatTimestamp()}] Error checking PR comments:`, error);
    }
  }

  private async checkIssueLabels(owner: string, repo: string, issueNumber: number, labels: any[]) {
    // This is a simplified approach - in a real implementation, you'd want to store
    // previous label state to detect actual additions/removals
    if (labels && labels.length > 0) {
      const labelNames = labels.map((label) => (typeof label === "string" ? label : label.name)).join(", ");
      console.log(`[${this.formatTimestamp()}] 🏷️  LABELS ON ${owner}/${repo}#${issueNumber}: ${labelNames}`);
    }
  }
}

if (import.meta.main) {
  const server = Bun.serve({
    routes: {
      "/health": () => new Response("ok"),
    },
  });
  console.log("listening" + server.url);

  // Start the monitoring system
  const monitor = new RepoEventMonitor();
  monitor.start();
}
