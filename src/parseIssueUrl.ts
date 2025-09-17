/**
 * Parse pull or issue url, get issue_number
 */
export function parseIssueUrl(issueUrl: string) {
  const [owner, repo, strNumber] = issueUrl
    .match(/^https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/(?:pull|issues)\/(\d+)(?:#.*)?$/)!
    .slice(1);
  if (!owner || !repo || !strNumber) {
    throw new Error(`Invalid issue URL: ${issueUrl}`);
  }
  return { owner, repo, issue_number: Number(strNumber) };
}
