import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logLevel = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const formats = [];

if (!isProduction) {
  formats.push(winston.format.colorize());
}

formats.push(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  }),
);

const transports: winston.transport[] = [];

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
      filename: path.join(__dirname, "../logs/error.log"),
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/combined.log"),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  transports,
  silent: isTest && !process.env.DEBUG_TESTS,
});

export default logger;
