import { slack } from "@/src/slack";
import { slackMessageUrlParse, slackMessageUrlStringify } from "../gh-design/gh-design";

export async function upsertSlackMessage({
  text,
  channel,
  url,
  replyUrl,
  reply_broadcast,
}: {
  text: string;
  channel: string;
  url?: string;
  replyUrl?: string;
  reply_broadcast?: boolean;
}) {
  if (process.env.DRY_RUN) throw new Error("sending slack message: " + JSON.stringify({ text, channel, url }));
  if (!url) {
    const thread_ts = !replyUrl ? undefined : slackMessageUrlParse(replyUrl).ts;
    const msg = !thread_ts
      ? await slack.chat.postMessage({ text, channel })
      : await slack.chat.postMessage({ text, channel, thread_ts, reply_broadcast: Boolean(reply_broadcast) });

    const url = slackMessageUrlStringify({ channel, ts: msg.ts! });
    return { ...msg, url, text, channel };
  }
  const ts = slackMessageUrlParse(url).ts;
  const msg = await slack.chat.update({ text, channel, ts });
  return { ...msg, url, text, channel };
}
