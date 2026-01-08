import { db } from "@/src/db";
import { gh } from "@/src/gh";
import { parseGithubRepoUrl } from "@/src/parseOwnerRepo";
import { getSlackChannel } from "@/src/slack/channels";
import DIE from "@snomiao/die";
import isCI from "is-ci";
import parseGithubUrl from "parse-github-url";
import sflow from "sflow";
import { upsertSlackMessage } from "./upsertSlackMessage";
// workflow
/**
 * 1. fetch repos latest releases
 * 2. save the release info to the database
 * 3. if it's stable, notify the release to slack
 * 4. if it's a pre-release, do nothing
 */
const config = {
  repos: ["https://github.com/comfyanonymous/ComfyUI", "https://github.com/Comfy-Org/desktop"],
  slackChannel: "desktop",
  slackMessage: "🔮 {repo} <{url}|Release {version}> is {status}!",
  sendSince: new Date("2025-08-02T00:00:00Z").toISOString(), // only send notifications for releases after this date (UTC)
};

const coreVersionPattern = /Update ComfyUI core to (v\S+)/;
export type GithubReleaseNotificationTask = {
  url: string; // github release url
  version?: string; // released version, e.g. v1.0.0, v2.0.0-beta.1
  coreVersion?: string; // for desktop repo, match /Update ComfyUI core to (v\S+)/
  createdAt: Date;
  releasedAt?: Date;
  isStable?: boolean; // true if the release is stable, false if it's a pre-release
  status: "draft" | "prerelease" | "stable";

  // when it's drafting/pre-release
  slackMessageDrafting?: {
    text: string;
    channel: string;
    url?: string; // set after sent
  };

  // send when it's stable, will reply the drafting url if there are one
  slackMessage?: {
    text: string;
    channel: string;
    url?: string; // set after sent
  };
};

export const GithubReleaseNotificationTask = db.collection<GithubReleaseNotificationTask>(
  "GithubReleaseNotificationTask",
);
await GithubReleaseNotificationTask.createIndex({ url: 1 }, { unique: true });
await GithubReleaseNotificationTask.createIndex({ version: 1 }); // Index for finding by version

const save = async (task: { url: string } & Partial<GithubReleaseNotificationTask>) =>
  (await GithubReleaseNotificationTask.findOneAndUpdate(
    { url: task.url },
    { $set: task },
    { upsert: true, returnDocument: "after" },
  )) || DIE("never");

if (import.meta.main) {
  await runGithubDesktopReleaseNotificationTask();
  if (isCI) {
    await db.close();
    process.exit(0); // exit if running in CI
  }
}

async function runGithubDesktopReleaseNotificationTask() {
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
      const version = release.tag_name;

      // For draft releases, find existing task by version to preserve Slack message URL
      // This prevents creating duplicate Slack messages when draft URL changes
      let existingTask: GithubReleaseNotificationTask | null = null;
      if (status === "draft" && version) {
        existingTask = await GithubReleaseNotificationTask.findOne({ version });
      }

      // create or update task
      let task = await save({
        url,
        status: status,
        isStable: status == "stable",
        version: version,
        coreVersion: (release.body || release.body_text)?.match(coreVersionPattern)?.[1],
        createdAt: new Date(release.created_at || DIE("no created_at in release, " + JSON.stringify(release))),
        releasedAt: !release.published_at ? undefined : new Date(release.published_at),
        // Preserve existing Slack message URLs when draft URL changes
        slackMessageDrafting: existingTask?.slackMessageDrafting || undefined,
        slackMessage: existingTask?.slackMessage || undefined,
      });
      const coreTask = !task.coreVersion
        ? undefined
        : await GithubReleaseNotificationTask.findOne({ version: task.coreVersion });

      if (+task.createdAt! < +new Date(config.sendSince)) return task; // skip releases before the sendSince date

      const newSlackMessage = {
        channel: await pSlackChannelId,
        text: config.slackMessage
          .replace("{url}", task.url)
          .replace("{repo}", parseGithubUrl(task.url)?.repo || DIE(`unable parse REPO from URL ${task.url}`))
          .replace("{version}", task.version || DIE(`unable to parse version from task ${JSON.stringify(task)}`))
          .replace("{status}", task.status)
          .replace(/$/, !coreTask?.version ? "" : " Core: " + coreTask.version),
      };

      // upsert drafting message if new/changed
      const shouldSendDraftingMessage = !task.isStable || task.slackMessageDrafting?.url;
      if (shouldSendDraftingMessage && task.slackMessageDrafting?.text?.trim() !== newSlackMessage.text.trim()) {
        task = await save({
          url,
          slackMessageDrafting: await upsertSlackMessage({
            ...newSlackMessage,
            url: task.slackMessageDrafting?.url, // Pass existing URL to update instead of creating new message
            replyUrl: coreTask?.slackMessageDrafting?.url,
          }),
        });
      }

      // upsert stable message if new/changed
      // FIX: Only send if stable AND (no existing message OR text changed)
      // This prevents duplicate messages when multiple task runs occur concurrently
      const shouldSendMessage = task.isStable && !task.slackMessage?.url;
      const shouldUpdateMessage =
        task.isStable && task.slackMessage?.url && task.slackMessage?.text?.trim() !== newSlackMessage.text.trim();

      if (shouldSendMessage || shouldUpdateMessage) {
        // const replyUrl =
        //   coreTask?.slackMessageDrafting?.url || coreTask?.slackMessage?.url || task.slackMessageDrafting?.url;
        task = await save({
          url,
          slackMessage: await upsertSlackMessage({
            ...newSlackMessage,
            url: task.slackMessage?.url, // Pass existing URL to update instead of creating new message
            // replyUrl: replyUrl,
            // reply_broadcast: replyUrl ? true : false,
          }),
        });
      }
      return task;
    })
    .log()
    .run();
}

export default runGithubDesktopReleaseNotificationTask;
