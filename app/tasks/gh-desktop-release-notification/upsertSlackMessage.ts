#!/usr/bin/env bun --hot
import { slack } from "@/src/slack";
import { getSlackChannel } from "@/src/slack/channels";
// import KeyvSqlite from "@keyv/sqlite";
import DIE from "@snomiao/die";
import Keyv from "keyv";
import { slackMessageUrlParse, slackMessageUrlStringify } from "../gh-design/gh-design";
import { COMFY_PR_CACHE_DIR } from "./COMFY_PR_CACHE_DIR";
import chalk from "chalk";

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

// Initialize caches - use in-memory during build
const SlackChannelIdsCache = new Keyv<string>();
const SlackUserIdsCache = new Keyv<string>();

// Initialize SQLite stores after build
if (!isBuildPhase && typeof window === "undefined") {
  (async () => {
    try {
      const KeyvSqlite = (await import("@keyv/sqlite")).default;
      SlackChannelIdsCache.opts.store = new KeyvSqlite("sqlite://" + COMFY_PR_CACHE_DIR + "/slackChannelIdCache.sqlite");
      SlackUserIdsCache.opts.store = new KeyvSqlite("sqlite://" + COMFY_PR_CACHE_DIR + "/slackUserIdCache.sqlite");
    } catch (error) {
      console.warn("Failed to initialize SQLite cache, using in-memory cache", error);
    }
  })();
}

/**
 * Create or update existing slack message
 *
 * Note: the returned value 'channel' is a channel id, not name
 *
 * To tag a user, use <@UserId>, e.g. <@snomiao>
 */
export async function upsertSlackMessage({
  text,
  channel,
  channelName,
  url,
  replyUrl,
  reply_broadcast,
}: {
  text: string;
  /** channelId */
  channel?: string;
  channelName?: string;
  url?: string;
  replyUrl?: string;
  reply_broadcast?: boolean;
}) {
  if (channelName) {
    channel ||=
      (await SlackChannelIdsCache.get(channelName)) ||
      (await (async () => {
        const ch = await getSlackChannel(channelName);
        const id = ch.id || DIE(`Got slack channel from ${channelName} but no id ` + JSON.stringify(channel));
        await SlackChannelIdsCache.set(channelName, id);
        return id;
      })());
  }
  if (!channel) DIE(`No slack channel specified`);

  if (!url) {
    if (process.env.DRY_RUN) {
      console.error("DRY RUN MODE");
      console.error("sending text:", text);
      throw new Error(chalk.red("Sending slack message to: " + JSON.stringify({  channel })))
    };
    const thread_ts = !replyUrl ? undefined : slackMessageUrlParse(replyUrl).ts;
    const msg = !thread_ts
      ? await slack.chat.postMessage({ text, channel })
      : await slack.chat.postMessage({ text, channel, thread_ts, reply_broadcast: reply_broadcast ?? false });

    const url = slackMessageUrlStringify({ channel, ts: msg.ts! });
    return { ...msg, url, text, channel };
  }
  if (process.env.DRY_RUN) {
    console.error("DRY RUN MODE");
    console.error("sending text:", text);
    throw new Error(chalk.red("Updating slack message to: " + JSON.stringify({  channel, url })))
  };
  const ts = slackMessageUrlParse(url).ts;
  const msg = await slack.chat.update({ text, channel, ts });
  return { ...msg, url, text, channel };
}

if (import.meta.main) {
  // const myMsg = slackMessageUrlParse('https://comfy-organization.slack.com/archives/C095SJWUYMR/p1755243753632819')

  // post new message
  const msg = await upsertSlackMessage({
    channelName: "sno-test-channel",
    text: "Hello @sno @snomiao <@sno> <@snomiao>, this is a test message from upsertSlackMessage function.",
  });
  // console.log(msg)
  console.log(msg.url);

  // // edit that by providing msg url
  const msgEdited = await upsertSlackMessage({
    ...msg,
    text: msg.text + "\nThis is a msg edit",
  });
  console.log(msgEdited);

  // // reply that msg by providing reply url
  // const msgReplied = await upsertSlackMessage({
  //   channel: msgEdited.channel,
  //   text: "Hello @snomiao, this is a reply to last message.",
  //   replyUrl: msgEdited.url,
  //   reply_broadcast: true,
  // });
  // console.log(msgReplied)
}
