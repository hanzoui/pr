import { upsertSlackMessage } from "@/app/tasks/gh-desktop-release-notification/upsertSlackMessage";
import { slack } from ".";
import { slackCached } from "./slackCached";

export async function sendDMToUser(username: string, message: string) {
  // Find user by username
  const users = await slackCached.users.list();
  const user = users.members?.find((u: any) => u.name === username);
  if (!user) {
    throw new Error(`User ${username} not found`);
  }

  // Open DM conversation
  const conversation = await slackCached.conversations.open({ users: user.id });
  if (!conversation.channel) {
    throw new Error(`Failed to open conversation with ${username}`);
  }

  // Get last message permalink if exists
  let lastMessageUrl: string | undefined;
  try {
    const history = await slack.conversations.history({
      channel: conversation.channel.id,
      limit: 1,
    });
    const lastMessage = history.messages?.[0];
    if (lastMessage) {
      const permalink = await slack.chat.getPermalink({
        channel: conversation.channel.id,
        message_ts: lastMessage.ts!,
      });
      lastMessageUrl = permalink.permalink;
    }
  } catch (error) {
    // Ignore errors getting last message
  }

  // Send message
  await upsertSlackMessage({
    channel: conversation.channel.id,
    text: message,
    url: lastMessageUrl,
  });

  return { userId: user.id, channelId: conversation.channel.id };
}

// Test functionality
if (import.meta.main) {
  await sendDMToUser("snomiao", "Hello from the simplified DM function!");
  console.log("DM sent successfully");
}
