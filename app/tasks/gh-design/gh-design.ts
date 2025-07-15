import { db } from "@/src/db";
import { gh } from "@/src/gh";
import { parseUrlRepoOwner } from "@/src/parseOwnerRepo";
import { getSlackChannel } from "@/src/slack/channels";
import { notifySlack } from "@/src/slack/notifySlack";
import console from "console";
import isCI from "is-ci";
import sflow, { pageFlow } from "sflow";

// Task bot to scan for [Design] labels on PRs and issues and send notifications to product channel

const DESIGN_LABEL = "Design";
const PRODUCT_SLACK_CHANNEL = "product";

// GitHub repositories to scan
const REPOS_TO_SCAN_URLS = [
  "https://github.com/Comfy-Org/ComfyUI_frontend",
  "https://github.com/Comfy-Org/desktop",
  "https://github.com/Comfy-Org/ComfyUI"
];

const GithubDesignTask = db.collection<{
  url: string; // the Design issue/PR url
  type: "issue" | "pull_request";
  status?: "error" | "pending" | "notified";
  notifiedAt?: Date;
}>("GithubDesignTask");

if (import.meta.main) {
  console.log("Fetching Slack product channel...");
  const productChannel = await getSlackChannel(PRODUCT_SLACK_CHANNEL);
  console.log(`Product channel: ${productChannel.name} (${productChannel.id})`);

  // for debug
  const isDryRun = !!process.env.DRY;
  if (isDryRun) {
    console.log("Running in DRY mode, no changes will be made.");
  } else {
    console.log("Running in LIVE mode, changes will be made.");
  }

  const designIssues = await sflow(REPOS_TO_SCAN_URLS)
    .map(e => parseUrlRepoOwner(e))
    .map(async ({ owner, repo }) => {
      return pageFlow(1, async (page) => {
        const per_page = 100;
        const { data: issues } = await gh.issues.listForRepo({
          owner,
          repo,
          page,
          per_page,
          labels: DESIGN_LABEL,
          state: "open",
        });
        console.log(`Found ${issues.length} Design labeled items in ${owner}/${repo}`);
        return { data: issues, next: issues.length >= per_page ? page + 1 : undefined };
      })
        .filter((e) => e.length)
        .flat()
        .map((item) => ({
          url: item.html_url,
          title: item.title,
          number: item.number,
          type: item.pull_request ? "pull_request" as const : "issue" as const,
          repo,
          owner,
        }));
    })
    .confluenceByConcat()
    .run();

  console.log(`Found ${designIssues.length} total design items`);

  const newItems = await sflow(designIssues)
    .filter(async (item) => {
      const existingTask = await GithubDesignTask.findOne({ url: item.url });
      return !existingTask || existingTask.status !== "notified";
    })
    .forEach(async (item) => {
      console.log(`Processing design item: ${item.url}`);

      // Update database
      !isDryRun &&
        (await GithubDesignTask.updateOne(
          { url: item.url },
          {
            $set: {
              type: item.type,
              status: "pending",
            }
          },
          { upsert: true }
        ));
    })
    .run();

  if (newItems.length > 0 && !isDryRun) {
    // Send notification to Slack
    const issueItems = newItems.filter(item => item.type === "issue");
    const prItems = newItems.filter(item => item.type === "pull_request");

    let message = "🎨 *New Design Items Detected*\n\n";

    if (issueItems.length > 0) {
      message += `*Issues (${issueItems.length}):*\n`;
      for (const item of issueItems) {
        message += `• <${item.url}|#${item.number}: ${item.title}> (${item.owner}/${item.repo})\n`;
      }
      message += "\n";
    }

    if (prItems.length > 0) {
      message += `*Pull Requests (${prItems.length}):*\n`;
      for (const item of prItems) {
        message += `• <${item.url}|#${item.number}: ${item.title}> (${item.owner}/${item.repo})\n`;
      }
      message += "\n";
    }

    message += "_These items have been labeled with [Design] and may need product review._";

    // Override channel to send to product channel
    const originalChannel = process.env.SLACK_BOT_CHANNEL;
    process.env.SLACK_BOT_CHANNEL = PRODUCT_SLACK_CHANNEL;

    try {
      await notifySlack(message, { unique: true });
      console.log(`Sent notification to #${PRODUCT_SLACK_CHANNEL} for ${newItems.length} design items`);
    } finally {
      // Restore original channel
      process.env.SLACK_BOT_CHANNEL = originalChannel;
    }

    // Mark items as notified
    await sflow(newItems)
      .forEach(async (item) => {
        await GithubDesignTask.updateOne(
          { url: item.url },
          {
            $set: {
              status: "notified",
              notifiedAt: new Date()
            }
          }
        );
      })
      .run();
  }

  console.log(`Design task completed. Processed ${newItems.length} new items.`);

  isCI && process.exit(0); // force exit in CI environment
}