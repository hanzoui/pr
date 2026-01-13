/**
 * Central listener registration hub
 * Registers all event listeners with the Slack Socket Mode client
 */

import type { SocketModeClient } from "@slack/socket-mode";
import * as events from "./events/index";

/**
 * Register all listeners with the Socket Mode client
 */
export function registerListeners(socketModeClient: SocketModeClient): void {
  events.register(socketModeClient);
}
