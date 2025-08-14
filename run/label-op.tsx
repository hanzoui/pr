import { gh } from "@/src/gh";
import crypto from "crypto";

export const REPOLIST = [
  "https://github.com/Comfy-Org/Comfy-PR",
  "https://github.com/comfyanonymous/ComfyUI",
  "https://github.com/Comfy-Org/ComfyUI_frontend",
  "https://github.com/Comfy-Org/desktop",
];

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "your-webhook-secret-here";
const USE_WEBHOOKS = process.env.USE_WEBHOOKS === "true";

interface RepoMonitorState {
  lastCheckTime: Date;
  lastIssueId: number;
  lastPRId: number;
}

interface WebhookPayload {
  action?: string;
  issue?: any;
  pull_request?: any;
  comment?: any;
  label?: any;
  repository?: any;
  sender?: any;
}

class RepoEventMonitor {
  private monitorState = new Map<string, RepoMonitorState>();
  private pollInterval = 30000; // 30 seconds
  private webhookSetupComplete = false;

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

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) return false;

    const expectedSignature = `sha256=${crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")}`;

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  handleWebhookEvent(eventType: string, payload: WebhookPayload): void {
    const timestamp = this.formatTimestamp();
    const repo = payload.repository;
    const repoName = repo ? `${repo.owner.login}/${repo.name}` : "unknown";

    switch (eventType) {
      case "issues":
        this.handleIssueEvent(payload, timestamp, repoName);
        break;
      case "pull_request":
        this.handlePREvent(payload, timestamp, repoName);
        break;
      case "issue_comment":
        this.handleCommentEvent(payload, timestamp, repoName);
        break;
      case "pull_request_review":
      case "pull_request_review_comment":
        this.handlePRReviewEvent(payload, timestamp, repoName);
        break;
      case "label":
        this.handleLabelEvent(payload, timestamp, repoName);
        break;
      default:
        console.log(`[${timestamp}] 📥 WEBHOOK: ${eventType} event received for ${repoName}`);
    }
  }

  private handleIssueEvent(payload: WebhookPayload, timestamp: string, repoName: string): void {
    const { action, issue, sender } = payload;
    const issueNumber = issue?.number;
    const issueTitle = issue?.title;
    const username = sender?.login;

    switch (action) {
      case "opened":
        console.log(`[${timestamp}] 🆕 NEW ISSUE (WEBHOOK): ${repoName}#${issueNumber} - ${issueTitle} by ${username}`);
        break;
      case "closed":
        console.log(`[${timestamp}] ✅ ISSUE CLOSED (WEBHOOK): ${repoName}#${issueNumber} by ${username}`);
        break;
      case "reopened":
        console.log(`[${timestamp}] 🔄 ISSUE REOPENED (WEBHOOK): ${repoName}#${issueNumber} by ${username}`);
        break;
      case "labeled":
      case "unlabeled":
        const label = payload.label?.name;
        console.log(
          `[${timestamp}] 🏷️  ISSUE ${action.toUpperCase()} (WEBHOOK): ${repoName}#${issueNumber} - ${label} by ${username}`,
        );
        break;
      default:
        console.log(
          `[${timestamp}] 📝 ISSUE ${action?.toUpperCase()} (WEBHOOK): ${repoName}#${issueNumber} by ${username}`,
        );
    }
  }

  private handlePREvent(payload: WebhookPayload, timestamp: string, repoName: string): void {
    const { action, pull_request, sender } = payload;
    const prNumber = pull_request?.number;
    const prTitle = pull_request?.title;
    const username = sender?.login;

    switch (action) {
      case "opened":
        console.log(`[${timestamp}] 🔄 NEW PR (WEBHOOK): ${repoName}#${prNumber} - ${prTitle} by ${username}`);
        break;
      case "closed":
        const merged = pull_request?.merged;
        if (merged) {
          console.log(`[${timestamp}] 🎉 PR MERGED (WEBHOOK): ${repoName}#${prNumber} by ${username}`);
        } else {
          console.log(`[${timestamp}] ❌ PR CLOSED (WEBHOOK): ${repoName}#${prNumber} by ${username}`);
        }
        break;
      case "reopened":
        console.log(`[${timestamp}] 🔄 PR REOPENED (WEBHOOK): ${repoName}#${prNumber} by ${username}`);
        break;
      case "labeled":
      case "unlabeled":
        const label = payload.label?.name;
        console.log(
          `[${timestamp}] 🏷️  PR ${action.toUpperCase()} (WEBHOOK): ${repoName}#${prNumber} - ${label} by ${username}`,
        );
        break;
      default:
        console.log(`[${timestamp}] 📝 PR ${action?.toUpperCase()} (WEBHOOK): ${repoName}#${prNumber} by ${username}`);
    }
  }

  private handleCommentEvent(payload: WebhookPayload, timestamp: string, repoName: string): void {
    const { action, comment, issue, sender } = payload;
    const issueNumber = issue?.number;
    const username = sender?.login;
    const isPR = !!issue?.pull_request;

    if (action === "created") {
      const type = isPR ? "PR" : "ISSUE";
      console.log(`[${timestamp}] 💬 NEW ${type} COMMENT (WEBHOOK): ${repoName}#${issueNumber} by ${username}`);
    }
  }

  private handlePRReviewEvent(payload: WebhookPayload, timestamp: string, repoName: string): void {
    const { action, pull_request, sender } = payload;
    const prNumber = pull_request?.number;
    const username = sender?.login;

    if (action === "created" || action === "submitted") {
      console.log(`[${timestamp}] 🔍 NEW PR REVIEW COMMENT (WEBHOOK): ${repoName}#${prNumber} by ${username}`);
    }
  }

  private handleLabelEvent(payload: WebhookPayload, timestamp: string, repoName: string): void {
    const { action, label, sender } = payload;
    const labelName = label?.name;
    const username = sender?.login;

    console.log(
      `[${timestamp}] 🏷️  LABEL ${action?.toUpperCase()} (WEBHOOK): ${repoName} - ${labelName} by ${username}`,
    );
  }

  async setupWebhooks(): Promise<void> {
    if (this.webhookSetupComplete) return;

    console.log(`[${this.formatTimestamp()}] Setting up webhooks for repositories...`);

    for (const repoUrl of REPOLIST) {
      try {
        const { owner, repo } = this.parseRepoUrl(repoUrl);

        // Check if webhook already exists
        const { data: hooks } = await gh.repos.listWebhooks({ owner, repo });
        const webhookUrl = `${process.env.WEBHOOK_BASE_URL || "http://localhost:3000"}/webhook`;
        const existingHook = hooks.find((hook) => hook.config?.url === webhookUrl);

        if (existingHook) {
          console.log(`[${this.formatTimestamp()}] ✅ Webhook already exists for ${owner}/${repo}`);
          continue;
        }

        // Create webhook
        await gh.repos.createWebhook({
          owner,
          repo,
          config: {
            url: webhookUrl,
            content_type: "json",
            secret: WEBHOOK_SECRET,
          },
          events: [
            "issues",
            "pull_request",
            "issue_comment",
            "pull_request_review",
            "pull_request_review_comment",
            "label",
          ],
        });

        console.log(`[${this.formatTimestamp()}] ✅ Webhook created for ${owner}/${repo}`);
      } catch (error: any) {
        if (error.status === 403) {
          console.warn(
            `[${this.formatTimestamp()}] ⚠️  No permission to create webhook for ${repoUrl}. Falling back to polling.`,
          );
        } else {
          console.error(`[${this.formatTimestamp()}] ❌ Error creating webhook for ${repoUrl}:`, error.message);
        }
      }
    }

    this.webhookSetupComplete = true;
  }

  async start() {
    console.log(`[${this.formatTimestamp()}] Starting repository event monitor...`);
    console.log(`[${this.formatTimestamp()}] Monitoring repos: ${REPOLIST.join(", ")}`);

    if (USE_WEBHOOKS) {
      console.log(`[${this.formatTimestamp()}] Using webhooks for real-time notifications`);
      await this.setupWebhooks();
    } else {
      console.log(`[${this.formatTimestamp()}] Using polling mode (30s interval)`);
      setInterval(() => {
        this.checkAllRepos();
      }, this.pollInterval);

      // Initial check
      await this.checkAllRepos();
    }
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
  // Start the monitoring system
  const monitor = new RepoEventMonitor();

  const server = Bun.serve({
    port: process.env.PORT || 3000,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/health") {
        return new Response("ok");
      }

      if (url.pathname === "/webhook" && req.method === "POST") {
        try {
          const body = await req.text();
          const signature = req.headers.get("x-hub-signature-256") || "";
          const eventType = req.headers.get("x-github-event") || "";

          // Verify webhook signature if secret is configured
          if (WEBHOOK_SECRET !== "your-webhook-secret-here") {
            if (!monitor.verifyWebhookSignature(body, signature)) {
              return new Response("Unauthorized", { status: 401 });
            }
          }

          const payload = JSON.parse(body);
          monitor.handleWebhookEvent(eventType, payload);

          return new Response("OK");
        } catch (error) {
          console.error("Webhook error:", error);
          return new Response("Error", { status: 500 });
        }
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`Server listening on ${server.url}`);
  console.log(`Webhook endpoint: ${server.url}webhook`);

  monitor.start();
}
