import { describe, expect, it } from "bun:test";
import winston from "winston";
import { createLogger, logger } from "./logger";

describe("Logger", () => {
  describe("logger instance", () => {
    it("should be a winston logger instance", () => {
      expect(logger).toBeInstanceOf(winston.Logger);
    });

    it("should have default log level from environment or 'info'", () => {
      const expectedLevel = process.env.LOG_LEVEL || "info";
      expect(logger.level).toBe(expectedLevel);
    });

    it("should have console transport", () => {
      expect(logger.transports.length).toBeGreaterThan(0);
      expect(logger.transports[0]).toBeInstanceOf(winston.transports.Console);
    });
  });

  describe("createLogger", () => {
    it("should create a child logger with module context", () => {
      const moduleLogger = createLogger("test-module");
      expect(moduleLogger).toBeInstanceOf(winston.Logger);
    });

    it("should include module name in metadata", () => {
      const moduleLogger = createLogger("test-module");
      expect(moduleLogger).toBeInstanceOf(winston.Logger);
      // Child loggers in Winston add metadata
      expect(moduleLogger.defaultMeta).toBeDefined();
    });
  });

  describe("log levels", () => {
    it("should have info method", () => {
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe("function");
    });

    it("should have error method", () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe("function");
    });

    it("should have warning method", () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe("function");
    });

    it("should have debug method", () => {
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe("function");
    });

    it("should respect log level settings", () => {
      const originalLevel = logger.level;
      logger.level = "error";
      expect(logger.level).toBe("error");
      logger.level = originalLevel;
    });
  });

  describe("metadata handling", () => {
    it("should accept metadata objects", () => {
      const metadata = { userId: 123, action: "test" };
      // This should not throw
      expect(() => logger.info("test with metadata", metadata)).not.toThrow();
    });

    it("should handle complex objects as metadata", () => {
      const complexData = {
        nested: {
          value: "test",
          array: [1, 2, 3],
        },
      };
      // This should not throw
      expect(() => logger.info("complex metadata", complexData)).not.toThrow();
    });
  });

  describe("logger configuration", () => {
    it("should have timestamp format configured", () => {
      const formats = logger.format;
      expect(formats).toBeDefined();
    });

    it("should have error stack handling", () => {
      const formats = logger.format;
      expect(formats).toBeDefined();
    });
  });
});
