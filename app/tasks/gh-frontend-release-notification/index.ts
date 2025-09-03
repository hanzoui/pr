import { db } from "@/src/db";
import { gh } from "@/src/gh";
import { parseGithubRepoUrl } from "@/src/parseOwnerRepo";
import { getSlackChannel } from "@/src/slack/channels";
import DIE from "@snomiao/die";
import isCI from "is-ci";
import parseGithubUrl from "parse-github-url";
import sflow from "sflow";
import { upsertSlackMessage } from "../gh-desktop-release-notification/upsertSlackMessage";

/**
 * GitHub Frontend Release Notification Task
 * 
 * Workflow:
 * 1. Fetch ComfyUI_frontend repo latest releases
 * 2. Save the release info to the database
 * 3. If it's stable, notify the release to slack
 * 4. If it's a pre-release, send drafting notification
 */

const config = {
  repos: ["https://github.com/Comfy-Org/ComfyUI_frontend"],
  slackChannel: "frontend",
  slackMessage: "🎨 {repo} <{url}|Release {version}> is {status}!",
  sendSince: new Date("2025-08-02T00:00:00Z").toISOString(),
};

export type GithubFrontendReleaseNotificationTask = {
  url: string;
  version?: string;
  createdAt: Date;
  releasedAt?: Date;
  isStable?: boolean;
  status: "draft" | "prerelease" | "stable";
  
  slackMessageDrafting?: {
    text: string;
    channel: string;
    url?: string;
  };
  
  slackMessage?: {
    text: string;
    channel: string;
    url?: string;
  };
};

export const GithubFrontendReleaseNotificationTask = db.collection<GithubFrontendReleaseNotificationTask>(
  "GithubFrontendReleaseNotificationTask",
);

await GithubFrontendReleaseNotificationTask.createIndex({ url: 1 }, { unique: true });

const save = async (task: { url: string } & Partial<GithubFrontendReleaseNotificationTask>) =>
  (await GithubFrontendReleaseNotificationTask.findOneAndUpdate(
    { url: task.url },
    { $set: task },
    { upsert: true, returnDocument: "after" },
  )) || DIE("never");

if (import.meta.main) {
  await runGithubFrontendReleaseNotificationTask();
  if (isCI) {
    await db.close();
    process.exit(0);
  }
}

async function runGithubFrontendReleaseNotificationTask() {
  const pSlackChannelId = getSlackChannel(config.slackChannel).then(
    (e) => e.id || DIE(`unable to get slack channel ${config.slackChannel}`),
  );

  await sflow(config.repos)
    .map(parseGithubRepoUrl)
    .flatMap(({ owner, repo }) =>
      gh.repos
        .listReleases({
          owner,
          repo,
          per_page: 3,
        })
        .then((e) => e.data),
    )
    .map(async (release) => {
      const url = release.html_url;
      const status = release.draft ? "draft" : release.prerelease ? "prerelease" : "stable";

      let task = await save({
        url,
        status: status,
        isStable: status == "stable",
        version: release.tag_name,
        createdAt: new Date(release.created_at || DIE("no created_at in release, " + JSON.stringify(release))),
        releasedAt: !release.published_at ? undefined : new Date(release.published_at),
      });

      if (+task.createdAt! < +new Date(config.sendSince)) return task;

      const newSlackMessage = {
        channel: await pSlackChannelId,
        text: config.slackMessage
          .replace("{url}", task.url)
          .replace("{repo}", parseGithubUrl(task.url)?.repo || DIE(`unable parse REPO from URL ${task.url}`))
          .replace("{version}", task.version || DIE(`unable to parse version from task ${JSON.stringify(task)}`))
          .replace("{status}", task.status),
      };

      const shouldSendDraftingMessage = !task.isStable && !task.slackMessageDrafting?.url;
      if (shouldSendDraftingMessage && task.slackMessageDrafting?.text?.trim() !== newSlackMessage.text.trim()) {
        task = await save({
          url,
          slackMessageDrafting: await upsertSlackMessage(newSlackMessage),
        });
      }

      const shouldSendMessage = task.isStable && !task.slackMessage?.url;
      if (shouldSendMessage && task.slackMessage?.text?.trim() !== newSlackMessage.text.trim()) {
        task = await save({
          url,
          slackMessage: await upsertSlackMessage({
            ...newSlackMessage,
            replyUrl: task.slackMessageDrafting?.url,
          }),
        });
      }
      
      return task;
    })
    .log()
    .run();
}

export default runGithubFrontendReleaseNotificationTask;