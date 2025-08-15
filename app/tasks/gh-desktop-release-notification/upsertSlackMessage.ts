import { slack } from "@/src/slack";
import { getSlackChannel } from "@/src/slack/channels";
import KeyvSqlite from "@keyv/sqlite";
import DIE from "@snomiao/die";
import { mkdir } from "fs/promises";
import Keyv from "keyv";
import { slackMessageUrlParse, slackMessageUrlStringify } from "../gh-design/gh-design";

const cacheDir = "./node_modules/.cache/comfy-pr";
await mkdir(cacheDir, { recursive: true });
const SlackChannelIdsCache = new Keyv<string>({
  store: new KeyvSqlite("sqlite://" + cacheDir + "/slackChannelIdCache.sqlite"),
});

/**
 * upsert slack message
 *
 * Note: the returned value 'channel' is a channel id, not name
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

  if (process.env.DRY_RUN) throw new Error("sending slack message: " + JSON.stringify({ text, channel, url }));
  if (!url) {
    const thread_ts = !replyUrl ? undefined : slackMessageUrlParse(replyUrl).ts;
    const msg = !thread_ts
      ? await slack.chat.postMessage({ text, channel })
      : await slack.chat.postMessage({ text, channel, thread_ts, reply_broadcast: reply_broadcast ?? false });

    const url = slackMessageUrlStringify({ channel, ts: msg.ts! });
    return { ...msg, url, text, channel };
  }
  const ts = slackMessageUrlParse(url).ts;
  const msg = await slack.chat.update({ text, channel, ts });
  return { ...msg, url, text, channel };
}

if (import.meta.main) {
  // post new message
  const msg = await upsertSlackMessage({
    channelName: "sno-test-channel",
    text: "Hello @snomiao, this is a test message from upsertSlackMessage function.",
  });
  console.log(msg);

  // edit that by providing msg url
  const msgEdited = await upsertSlackMessage({
    ...msg,
    text: msg.text + "\nThis is a msg edit",
  });
  console.log(msgEdited);

  // reply that msg by providing reply url
  const msgReplied = await upsertSlackMessage({
    channel: msgEdited.channel,
    text: "Hello @snomiao, this is a reply to last message.",
    replyUrl: msgEdited.url,
    reply_broadcast: true,
  });
  console.log(msgReplied);
}
