import { Octokit } from "octokit";
import sflow from "sflow";

const tokens = process.env.GH_SUBSCRIBER_TOKENS?.split(",") || [];
const gh = (token: string) => new Octokit({ auth: token }).rest;
// list subscriber users
console.log(
  `GH_TOKEN_SUBSCRIBER Users: `,
  await sflow(tokens)
    .map((token) => gh(token))
    .map(async (gh) => {
      const { data: user } = await gh.users.getAuthenticated();
      return `${user.login} <${user.email}>`;
    })
    .join(", ")
    .by(new TextEncoderStream())
    .text(),
);


if (import.meta.main) {
  // list subscribed threads
  await sflow(tokens)
    .map((token) => gh(token))
    .map(async (gh) => {
      console.log(await gh.activity.listNotificationsForAuthenticatedUser());
      // await gh.activity.setThreadSubscription({
      //   thread_id,
      // });
    })
    .run();
}

export async function subscribeTo() {
  await sflow(tokens)
    .map((token) => gh(token))
    .map(async (gh) => {
      console.log(await gh.activity.getThreadSubscriptionForAuthenticatedUser());
      // await gh.activity.setThreadSubscription({
      //   thread_id,
      // });
    })
    .run();
}
