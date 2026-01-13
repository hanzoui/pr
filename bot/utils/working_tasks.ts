/**
 * Working Tasks State Management
 * Tracks currently active bot tasks for resume functionality
 */

import type { Keyv } from "keyv";
import type winston from "winston";

export type AppMentionEvent = {
  type: "app_mention";
  user: string;
  ts: string;
  client_msg_id?: string;
  text: string;
  team: string;
  thread_ts?: string;
  parent_user_id?: string;
  blocks: any[];
  channel: string;
  assistant_thread?: any;
  attachments?: any[];
  event_ts: string;
};

/**
 * Add a task to the working tasks list
 */
export async function addWorkingTask(State: Keyv, event: AppMentionEvent, logger: winston.Logger): Promise<void> {
  const workingTasks = (await State.get("current-working-tasks")) || { workingMessageEvents: [] };
  const events = workingTasks.workingMessageEvents || [];

  // Check if event already exists (by ts and channel)
  const exists = events.some((e: any) => e.ts === event.ts && e.channel === event.channel);
  if (!exists) {
    events.push(event);
    await State.set("current-working-tasks", { workingMessageEvents: events });
    logger.info(`Added task to working list: ${event.ts} (total: ${events.length})`);
  }
}

/**
 * Remove a task from the working tasks list
 */
export async function removeWorkingTask(State: Keyv, event: AppMentionEvent, logger: winston.Logger): Promise<void> {
  const workingTasks = (await State.get("current-working-tasks")) || { workingMessageEvents: [] };
  const events = workingTasks.workingMessageEvents || [];

  // Remove event by ts and channel
  const filtered = events.filter((e: any) => !(e.ts === event.ts && e.channel === event.channel));
  await State.set("current-working-tasks", { workingMessageEvents: filtered });
  logger.info(`Removed task from working list: ${event.ts} (remaining: ${filtered.length})`);
}

/**
 * Get all current working tasks
 */
export async function getWorkingTasks(State: Keyv): Promise<AppMentionEvent[]> {
  const workingTasks = (await State.get("current-working-tasks")) || { workingMessageEvents: [] };
  return workingTasks.workingMessageEvents || [];
}
