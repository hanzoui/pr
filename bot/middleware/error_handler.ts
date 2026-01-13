/**
 * Error handling middleware
 * Provides consistent error handling patterns across all event listeners
 */

import type { WebClient } from "@slack/web-api";
import type winston from "winston";

export interface ErrorContext {
  event?: any;
  channel?: string;
  ts?: string;
  user?: string;
}

/**
 * Wrap an async handler with error handling
 * Logs errors and optionally sends user-friendly messages to Slack
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  options: {
    logger: winston.Logger;
    slack?: WebClient;
    handlerName: string;
    sendErrorToUser?: boolean;
    getContext?: (...args: Parameters<T>) => ErrorContext;
  },
): T {
  const { logger, slack, handlerName, sendErrorToUser = false, getContext } = options;

  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract context if available
      const context = getContext ? getContext(...args) : {};

      // Log the error
      logger.error(`Error in ${handlerName}`, {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        context,
      });

      // Optionally send error to user in Slack
      if (sendErrorToUser && slack && context.channel) {
        try {
          await slack.chat.postMessage({
            channel: context.channel,
            thread_ts: context.ts,
            text: `Sorry, an error occurred while processing your request. The team has been notified.`,
          });
        } catch (slackError) {
          logger.error(`Failed to send error message to Slack`, {
            slackError,
            originalError: error,
          });
        }
      }

      // Re-throw the error if you want it to propagate
      // throw error;
    }
  }) as T;
}

/**
 * Create a standard error handler for event callbacks
 */
export function createEventErrorHandler(logger: winston.Logger, slack?: WebClient) {
  return {
    /**
     * Wrap an event handler with error handling
     */
    wrap<T extends (context: any) => Promise<any>>(
      handler: T,
      handlerName: string,
      options?: {
        sendErrorToUser?: boolean;
        extractContext?: (context: any) => ErrorContext;
      },
    ): T {
      return withErrorHandling(handler, {
        logger,
        slack,
        handlerName,
        sendErrorToUser: options?.sendErrorToUser ?? false,
        getContext: options?.extractContext
          ? (context) => options.extractContext!(context)
          : (context) => ({
              event: context?.event,
              channel: context?.event?.channel,
              ts: context?.event?.ts,
              user: context?.event?.user,
            }),
      });
    },

    /**
     * Log and handle critical errors
     */
    logCritical(message: string, error: unknown, context?: Record<string, any>) {
      logger.error(`CRITICAL: ${message}`, {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        ...context,
      });
    },

    /**
     * Log warnings
     */
    logWarning(message: string, context?: Record<string, any>) {
      logger.warn(message, context);
    },

    /**
     * Log info
     */
    logInfo(message: string, context?: Record<string, any>) {
      logger.info(message, context);
    },
  };
}

/**
 * Standard error response builder
 */
export function buildErrorResponse(
  error: unknown,
  options?: {
    includeDetails?: boolean;
    userMessage?: string;
  },
): string {
  const { includeDetails = false, userMessage } = options || {};

  if (userMessage) {
    return userMessage;
  }

  const baseMessage = "An error occurred while processing your request.";

  if (includeDetails && error instanceof Error) {
    return `${baseMessage}\n\nError: ${error.message}`;
  }

  return baseMessage;
}

/**
 * Check if error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("rate limit")
    );
  }
  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  },
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = isRetryableError,
    onRetry,
  } = options || {};

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}
