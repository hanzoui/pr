// Server-side logger using Winston
// This module should only be imported in server-side code

let winston: any;
try {
  if (typeof window === "undefined") {
    winston = require("winston");
  }
} catch (e) {
  // Winston not available, will use console fallback
}

const logLevel = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const formats: any[] = [];
const transports: any[] = [];

let logger: any;

if (typeof window === "undefined" && winston) {
  // Server-side configuration
  if (!isProduction) {
    formats.push(winston.format.colorize());
  }

  formats.push(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ timestamp, level, message, ...metadata }: any) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
      }
      return msg;
    }),
  );

  if (!isTest) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(...formats),
      }),
    );
  }

  if (isProduction) {
    transports.push(
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: "logs/combined.log",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
      }),
    );
  }

  logger = winston.createLogger({
    level: logLevel,
    transports,
    silent: isTest && !process.env.DEBUG_TESTS,
  });
} else {
  // Client-side fallback - use console
  logger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    verbose: console.log,
  };
}

export { logger };
export default logger;
