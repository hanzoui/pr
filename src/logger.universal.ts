// Universal logger that works on both server and client
let logger: any;

if (typeof window === "undefined") {
  // Server-side: use Winston
  const { logger: winstonLogger } = await import("./logger");
  logger = winstonLogger;
} else {
  // Client-side: use console-based logger
  const { logger: clientLogger } = await import("./logger.client");
  logger = clientLogger;
}

export { logger };
export default logger;