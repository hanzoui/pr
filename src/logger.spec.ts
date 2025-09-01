import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import winston from "winston";
import { logger } from "./logger";

describe("Logger Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create a winston logger instance", () => {
    expect(logger).toBeDefined();
    expect(logger).toBeInstanceOf(winston.Logger);
  });

  it("should use the correct log level from environment", () => {
    process.env.LOG_LEVEL = "debug";
    delete require.cache[require.resolve("./logger")];
    const { logger: debugLogger } = require("./logger");
    expect(debugLogger.level).toBe("debug");
  });

  it("should default to 'info' level when LOG_LEVEL is not set", () => {
    delete process.env.LOG_LEVEL;
    delete require.cache[require.resolve("./logger")];
    const { logger: defaultLogger } = require("./logger");
    expect(defaultLogger.level).toBe("info");
  });

  it("should be silent in test environment by default", () => {
    process.env.NODE_ENV = "test";
    delete process.env.DEBUG_TESTS;
    delete require.cache[require.resolve("./logger")];
    const { logger: testLogger } = require("./logger");
    expect(testLogger.silent).toBe(true);
  });

  it("should not be silent in test environment when DEBUG_TESTS is set", () => {
    process.env.NODE_ENV = "test";
    process.env.DEBUG_TESTS = "true";
    delete require.cache[require.resolve("./logger")];
    const { logger: debugTestLogger } = require("./logger");
    expect(debugTestLogger.silent).toBe(false);
  });

  it("should have console transport in non-test environment", () => {
    process.env.NODE_ENV = "development";
    delete require.cache[require.resolve("./logger")];
    const { logger: devLogger } = require("./logger");
    const consoleTransport = devLogger.transports.find((t: any) => t instanceof winston.transports.Console);
    expect(consoleTransport).toBeDefined();
  });

  it("should have file transports in production environment", () => {
    process.env.NODE_ENV = "production";
    delete require.cache[require.resolve("./logger")];
    const { logger: prodLogger } = require("./logger");
    const fileTransports = prodLogger.transports.filter((t: any) => t instanceof winston.transports.File);
    expect(fileTransports.length).toBe(2);
  });

  it("should format messages correctly", () => {
    const logs: string[] = [];
    const testLogger = winston.createLogger({
      level: "info",
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.printf(({ timestamp, level, message }) => {
              const output = `${timestamp} [${level}]: ${message}`;
              logs.push(output);
              return output;
            }),
          ),
        }),
      ],
    });

    testLogger.info("test message");
    expect(logs.length).toBe(1);
    expect(logs[0]).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[info\]: test message/);
  });

  it("should include metadata in log messages", () => {
    const logs: string[] = [];
    const testLogger = winston.createLogger({
      level: "info",
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.splat(),
            winston.format.printf(({ timestamp, level, message, ...metadata }) => {
              let msg = `${timestamp} [${level}]: ${message}`;
              if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
              }
              logs.push(msg);
              return msg;
            }),
          ),
        }),
      ],
    });

    testLogger.info("test message", { userId: 123, action: "login" });
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain("test message");
    expect(logs[0]).toContain('{"userId":123,"action":"login"}');
  });

  it("should handle error objects with stack traces", () => {
    const logs: string[] = [];
    const testLogger = winston.createLogger({
      level: "error",
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf((info) => {
              const output = JSON.stringify(info);
              logs.push(output);
              return output;
            }),
          ),
        }),
      ],
    });

    const error = new Error("Test error");
    testLogger.error("An error occurred", error);
    expect(logs.length).toBe(1);
    const logOutput = JSON.parse(logs[0]);
    expect(logOutput.message).toContain("An error occurred");
    expect(logOutput.level).toBe("error");
  });

  it("should support all log levels", () => {
    const levels = ["error", "warn", "info", "debug"];
    levels.forEach((level) => {
      expect(logger[level]).toBeDefined();
      expect(typeof logger[level]).toBe("function");
    });
  });
});

    });
  });
});
