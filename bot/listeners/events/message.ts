/**
 * Message event handler
 * Handles direct messages and bot mentions in regular messages
 */

import type winston from "winston";
import { withErrorHandling } from "../../middleware/error_handler";
import { parseSlackMessageToMarkdown } from "../../slack/parseSlackMessageToMarkdown";
import type { AppMentionEvent } from "../../utils/working_tasks";

interface MessageHandlerDeps {
  logger: winston.Logger;
  spawnBotOnSlackMessageEvent: (event: AppMentionEvent) => Promise<void>;
}

/**
 * Create message event callback with dependencies
 */
export function createMessageCallback(deps: MessageHandlerDeps) {
  const { logger, spawnBotOnSlackMessageEvent } = deps;

  const handler = async ({ event, body, ack }: any) => {
    logger.debug("MESSAGE EVENT", { event });
    logger.debug("parsed_text: " + (await parseSlackMessageToMarkdown(event.text || "")));

    await ack();

    // Skip bot messages
    if (event.bot_id) {
      return;
    }

    // Get bot user ID
    const botUsername = "comfyprbot";
    // TODO: fetch botUserId by botUsername or use slack api to "get my name"
    const botUserId = process.env.SLACK_BOT_USER_ID || "U078499LK5K"; // ComfyPR-Bot user ID

    // Check if message mentions the bot
    const text = event.text || "";
    const hasBotMention = text.includes(`<@${botUserId}>`);

    // Handle DM messages (channel_type: "im") and treat them like app mentions
    const isDM = event.channel_type === "im";

    if ((isDM || hasBotMention) && event.user && event.text) {
      const eventType = isDM ? "DM" : "BOT MENTION";
      logger.debug(`${eventType} DETECTED - Processing message as app_mention`, {
        channel: event.channel,
        ts: event.ts,
        text: text.substring(0, 100),
      });

      const mentionEvent: AppMentionEvent = {
        type: "app_mention" as const,
        user: event.user,
        ts: event.ts,
        client_msg_id: event.client_msg_id,
        text: event.text,
        team: event.team,
        thread_ts: event.thread_ts,
        parent_user_id: event.parent_user_id,
        blocks: event.blocks || [],
        channel: event.channel,
        assistant_thread: event.assistant_thread,
        attachments: event.attachments,
        event_ts: event.event_ts,
      };
      await spawnBotOnSlackMessageEvent(mentionEvent);
    }
  };

  // Wrap with error handling
  return withErrorHandling(handler, {
    logger,
    handlerName: "message",
    sendErrorToUser: false, // Errors are handled within spawnBotOnSlackMessageEvent
    getContext: ({ event }) => ({
      event,
      channel: event?.channel,
      ts: event?.ts,
      user: event?.user,
    }),
  });
}

// Export a placeholder - will be replaced with actual instance in index.ts
export let messageCallback: ReturnType<typeof createMessageCallback>;
