/**
 * Event listener registration
 */

import type { SocketModeClient } from "@slack/socket-mode";
import { appMentionCallback } from "./app_mention";
import { messageCallback } from "./message";

/**
 * Register all event listeners
 */
export function register(socketModeClient: SocketModeClient): void {
  socketModeClient
    .on("app_mention", appMentionCallback)
    .on("message", messageCallback)
    .on("error", (error) => {
      console.error("Socket Mode error", { error });
    })
    .on("connect", () => console.log("SOCKET - Slack connected"))
    .on("disconnect", () => console.log("SOCKET - Slack disconnected"))
    .on("ready", () => console.log("SOCKET - Ready to receive events"));
}
