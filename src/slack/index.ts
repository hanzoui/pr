import { WebClient } from "@slack/web-api";
import DIE from "phpdie";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || DIE(("missing env.SLACK_BOT_TOKEN"));
console.log("Slack Bot Token:", SLACK_BOT_TOKEN.slice(0,6) + "..." + SLACK_BOT_TOKEN.slice(-6));
export const slack = new WebClient(SLACK_BOT_TOKEN);

if (import.meta.main) {
  await slack.api.test({}); // test token
  console.log("Slack API token is valid.");
}
