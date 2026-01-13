/**
 * Helper utility functions for the ComfyPR Bot
 */

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find common prefix among multiple strings
 */
export function commonPrefix(...args: string[]): string {
  if (args.length === 0) return "";
  let prefix = args[0];
  for (let i = 1; i < args.length; i++) {
    let j = 0;
    while (j < prefix.length && j < args[i].length && prefix[j] === args[i][j]) {
      j++;
    }
    prefix = prefix.slice(0, j);
    if (prefix === "") break;
  }
  return prefix;
}

/**
 * Sanitize a string to be safe for use in file paths
 */
export function sanitized(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
}
