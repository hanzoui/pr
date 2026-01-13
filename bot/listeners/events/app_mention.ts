/**
 * App mention event handler
 * Handles @mentions of the bot in channels
 */

import type winston from "winston";
import z from "zod";
import { withErrorHandling } from "../../middleware/error_handler";
import type { AppMentionEvent } from "../../utils/working_tasks";

const zAppMentionEvent = z.object({
  type: z.literal("app_mention"),
  user: z.string(),
  ts: z.string(),
  client_msg_id: z.string().optional(),
  text: z.string(),
  team: z.string(),
  thread_ts: z.string().optional(),
  parent_user_id: z.string().optional(),
  blocks: z.array(z.any()),
  channel: z.string(),
  assistant_thread: z.any().optional(),
  attachments: z.array(z.any()).optional(),
  event_ts: z.string(),
});

interface AppMentionHandlerDeps {
  logger: winston.Logger;
  spawnBotOnSlackMessageEvent: (event: AppMentionEvent) => Promise<void>;
}

/**
 * Create app_mention event callback with dependencies
 */
export function createAppMentionCallback(deps: AppMentionHandlerDeps) {
  const { logger, spawnBotOnSlackMessageEvent } = deps;

  const handler = async ({ event, body, ack }: any) => {
    const parsedEvent = await zAppMentionEvent.parseAsync(event);

    // Acknowledge the event as its parsed
    await ack();

    logger.info(`APP_MENTION - Received event in channel ${parsedEvent.channel} from user ${parsedEvent.user}`);

    await spawnBotOnSlackMessageEvent(parsedEvent);
  };

  // Wrap with error handling
  return withErrorHandling(handler, {
    logger,
    handlerName: "app_mention",
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
export let appMentionCallback: ReturnType<typeof createAppMentionCallback>;
