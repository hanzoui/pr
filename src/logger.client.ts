// Client-side logger that uses console instead of Winston
const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || "info";

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

class ClientLogger {
  private level: number;

  constructor(level: string) {
    this.level = logLevels[level as keyof typeof logLevels] ?? logLevels.info;
  }

  private shouldLog(level: string): boolean {
    const levelValue = logLevels[level as keyof typeof logLevels] ?? logLevels.info;
    return levelValue <= this.level;
  }

  error(...args: any[]) {
    if (this.shouldLog("error")) {
      console.error(...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog("warn")) {
      console.warn(...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog("info") && !isProduction) {
      console.info(...args);
    }
  }

  debug(...args: any[]) {
    if (this.shouldLog("debug") && !isProduction) {
      console.debug(...args);
    }
  }

  verbose(...args: any[]) {
    if (this.shouldLog("verbose") && !isProduction) {
      console.log(...args);
    }
  }
}

export const logger = new ClientLogger(logLevel);
export default logger;