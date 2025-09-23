#!/usr/bin/env bun --hot
import { db } from "@/src/db";
import { gh } from "@/src/gh";
import { parseGithubRepoUrl } from "@/src/parseOwnerRepo";
import { getSlackChannel } from "@/src/slack/channels";
import DIE from "@snomiao/die";
import isCI from "is-ci";
import sflow from "sflow";
import { upsertSlackMessage } from "../gh-desktop-release-notification/upsertSlackMessage";

/**
 * GitHub Core Tag Notification Task
 *
 * Workflow:
 * 1. Fetch ComfyUI core repo latest tags
 * 2. Save the tag info to the database
 * 3. Notify new tags to slack
 */

const config = {
  repo: "https://github.com/comfyanonymous/ComfyUI",
  slackChannel: "desktop",
  slackMessage: "🏷️ ComfyUI <{url}|Tag {tagName}> created!",
  sendSince: new Date("2025-09-24T00:00:00Z").toISOString(),
  tagsPerPage: 10,
};

export type GithubCoreTagNotificationTask = {
  tagName: string;
  commitSha: string;
  url: string;
  createdAt?: Date;
  taggerDate?: Date;
  message?: string;
  slackMessage?: {
    text: string;
    channel: string;
    url?: string;
  };
};

export const GithubCoreTagNotificationTask = db.collection<GithubCoreTagNotificationTask>(
  "GithubCoreTagNotificationTask",
);

await GithubCoreTagNotificationTask.createIndex({ tagName: 1 }, { unique: true });

const save = async (task: { tagName: string } & Partial<GithubCoreTagNotificationTask>) =>
  (await GithubCoreTagNotificationTask.findOneAndUpdate(
    { tagName: task.tagName },
    { $set: task },
    { upsert: true, returnDocument: "after" },
  )) || DIE("never");

if (import.meta.main) {
  await runGithubCoreTagNotificationTask();
  if (isCI) {
    await db.close();
    process.exit(0);
  }
}

async function runGithubCoreTagNotificationTask() {
  const { owner, repo } = parseGithubRepoUrl(config.repo);
  const pSlackChannelId = getSlackChannel(config.slackChannel).then(
    (e) => e.id || DIE(`unable to get slack channel ${config.slackChannel}`),
  );

  const tags = await gh.repos.listTags({
    owner,
    repo,
    per_page: config.tagsPerPage,
  });

  await sflow(tags.data)
    .map(async (tag) => {
      const existingTask = await GithubCoreTagNotificationTask.findOne({ tagName: tag.name });
      if (existingTask?.slackMessage?.url) {
        return existingTask;
      }

      const tagUrl = `https://github.com/${owner}/${repo}/releases/tag/${tag.name}`;

      let tagDetails;
      let taggerDate;
      let message;

      try {
        const gitTag = await gh.git.getTag({
          owner,
          repo,
          tag_sha: tag.commit.sha,
        });

        if (gitTag.data.tagger) {
          taggerDate = new Date(gitTag.data.tagger.date);
          message = gitTag.data.message;
        }
      } catch {
      }

      let task = await save({
        tagName: tag.name,
        commitSha: tag.commit.sha,
        url: tagUrl,
        createdAt: new Date(),
        taggerDate,
        message,
      });

      if (task.taggerDate && +task.taggerDate < +new Date(config.sendSince)) {
        return task;
      }

      if (!task.taggerDate) {
        const commitData = await gh.repos.getCommit({
          owner,
          repo,
          ref: tag.commit.sha,
        });
        const commitDate = new Date(commitData.data.commit.author?.date || commitData.data.commit.committer?.date || new Date());

        if (+commitDate < +new Date(config.sendSince)) {
          return task;
        }
      }

      const slackChannelId = await pSlackChannelId;
      const slackMessageText = config.slackMessage
        .replace("{url}", task.url)
        .replace("{tagName}", task.tagName)
        .replace(/$/, task.message ? `\n> ${task.message}` : "");

      if (!task.slackMessage || task.slackMessage.text !== slackMessageText) {
        task = await save({
          tagName: task.tagName,
          slackMessage: await upsertSlackMessage({
            channel: slackChannelId,
            text: slackMessageText,
            url: task.slackMessage?.url,
          }),
        });
      }

      return task;
    })
    .log()
    .run();
}

export default runGithubCoreTagNotificationTask;