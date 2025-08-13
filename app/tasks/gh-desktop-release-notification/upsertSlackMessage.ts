import { slack } from "@/src/slack";
import { slackMessageUrlParse, slackMessageUrlStringify } from "../gh-design/gh-design";

export async function upsertSlackMessage({ text, channel, url }: { text: string; channel: string; url?: string }) {
  if (process.env.DRY_RUN) throw new Error("sending slack message: " + JSON.stringify({ text, channel, url }));
  if (!url) {
    const msg = await slack.chat.postMessage({ text, channel });
    const url = slackMessageUrlStringify({ channel, ts: msg.ts! });
    return { ...msg, url, text, channel };
  }

  const ts = slackMessageUrlParse(url).ts;
  const msg = await slack.chat.update({ text, channel, ts });
  return { ...msg, url, text, channel };
}
