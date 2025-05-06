import type { Contributor } from "./GithubContributorAnalyzeTask";

export function parseGitShortLog(log: string): Contributor[] {
  const contributors: Contributor[] = [];
  const lines = log.trim().split("\n");

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(.+?)\s+<(.+?)>$/);
    if (match) {
      const [, count, name, email] = match;
      contributors.push({
        count: parseInt(count, 10),
        name: name.trim(),
        email: email.trim(),
      });
    }
  }

  return contributors;
}
