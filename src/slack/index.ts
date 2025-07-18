import { WebClient } from "@slack/web-api";
import DIE from "@snomiao/die";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN?.trim() || DIE(("missing env.SLACK_BOT_TOKEN"));
export const slack = new WebClient(SLACK_BOT_TOKEN);

if (import.meta.main) {
  await slack.api.test({}); // test token
  console.log("Slack API token is valid.");
}
