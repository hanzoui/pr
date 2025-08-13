import { db } from "@/src/db";
import { gh } from "@/src/gh";
import { parseUrlRepoOwner } from "@/src/parseOwnerRepo";
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

type GithubReleaseNotificationTask = {
  url: string; // github release url
  version?: string; // released version, e.g. v1.0.0, v2.0.0-beta.1
  createdAt: Date;
  releasedAt?: Date;
  isStable?: boolean; // true if the release is stable, false if it's a pre-release
  status: "draft" | "prerelease" | "stable";

  // drafted/pre-release message
  slackMessage?: {
    text: string;
    channel: string;
    url?: string; // set after sent
  };
};

const GithubReleaseNotificationTask = db.collection<GithubReleaseNotificationTask>("GithubReleaseNotificationTask");
await GithubReleaseNotificationTask.createIndex({ url: 1 }, { unique: true });
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
    .map(parseUrlRepoOwner)
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

      // create task
      let task = await save({
        url,
        status: status,
        isStable: status == "stable",
        version: release.tag_name,
        createdAt: new Date(release.created_at || DIE("no created_at in release, " + JSON.stringify(release))),
        releasedAt: !release.published_at ? undefined : new Date(release.published_at),
      });

      if (+task.createdAt! < +new Date(config.sendSince)) return task; // skip releases before the sendSince date

      const newSlackMessage = {
        channel: await pSlackChannelId,
        text: config.slackMessage
          .replace("{url}", task.url)
          .replace("{repo}", parseGithubUrl(task.url)?.repo || DIE(`unable parse REPO from URL ${task.url}`))
          .replace("{version}", task.version || DIE(`unable to parse version from task ${JSON.stringify(task)}`))
          .replace("{status}", task.status),
      };

      const anyExistedMsg = task.slackMessage;

      // upsert message if new/changed
      const shouldSendMessage = task.isStable || anyExistedMsg?.url;
      if (shouldSendMessage && anyExistedMsg?.text?.trim() !== newSlackMessage.text.trim()) {
        console.log(
          anyExistedMsg?.text !== newSlackMessage.text,
          JSON.stringify(anyExistedMsg?.text),
          JSON.stringify(newSlackMessage.text),
        );
        task = await save({ url, slackMessage: await upsertSlackMessage(newSlackMessage) });
      }
      return task;
    })
    .log()
    .run();
}

export default runGithubDesktopReleaseNotificationTask;
