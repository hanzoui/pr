import type { components as GithubApiComponents } from "@octokit/openapi-types";
type S = GithubApiComponents["schemas"];
export type WEBHOOK_EVENTS = {
  branch_protection_configuration: S[`webhook-branch-protection-configuration${string}` & keyof S];
  branch_protection_rule: S[`webhook-branch-protection-rule${string}` & keyof S];
  check_run: S[`webhook-check-run${string}` & keyof S];
  check_suite: S[`webhook-check-suite${string}` & keyof S];
  code_scanning_alert: S[`webhook-code-scanning-alert${string}` & keyof S];
  commit_comment: S[`webhook-commit-comment${string}` & keyof S];
  create: S[`webhook-create${string}` & keyof S];
  custom_property: S[`webhook-custom-property${string}` & keyof S];
  custom_property_values: S[`webhook-custom-property-values${string}` & keyof S];
  delete: S[`webhook-delete${string}` & keyof S];
  dependabot_alert: S[`webhook-dependabot-alert${string}` & keyof S];
  deploy_key: S[`webhook-deploy-key${string}` & keyof S];
  deployment: S[`webhook-deployment${string}` & keyof S];
  deployment_protection_rule: S[`webhook-deployment-protection-rule${string}` & keyof S];
  deployment_review: S[`webhook-deployment-review${string}` & keyof S];
  deployment_status: S[`webhook-deployment-status${string}` & keyof S];
  discussion: S[`webhook-discussion${string}` & keyof S];
  discussion_comment: S[`webhook-discussion-comment${string}` & keyof S];
  fork: S[`webhook-fork${string}` & keyof S];
  github_app_authorization: S[`webhook-github-app-authorization${string}` & keyof S];
  gollum: S[`webhook-gollum${string}` & keyof S];
  installation: S[`webhook-installation${string}` & keyof S];
  installation_repositories: S[`webhook-installation-repositories${string}` & keyof S];
  installation_target: S[`webhook-installation-target${string}` & keyof S];
  issue_comment: S[`webhook-issue-comment${string}` & keyof S];
  issue_dependencies: S[`webhook-issue-dependencies${string}` & keyof S];
  issues: S[`webhook-issues${string}` & keyof S];
  label: S[`webhook-label${string}` & keyof S];
  marketplace_purchase: S[`webhook-marketplace-purchase${string}` & keyof S];
  member: S[`webhook-member${string}` & keyof S];
  membership: S[`webhook-membership${string}` & keyof S];
  merge_group: S[`webhook-merge-group${string}` & keyof S];
  meta: S[`webhook-meta${string}` & keyof S];
  milestone: S[`webhook-milestone${string}` & keyof S];
  org_block: S[`webhook-org-block${string}` & keyof S];
  organization: S[`webhook-organization${string}` & keyof S];
  package: S[`webhook-package${string}` & keyof S];
  page_build: S[`webhook-page-build${string}` & keyof S];
  personal_access_token_request: S[`webhook-personal-access-token-request${string}` & keyof S];
  ping: S[`webhook-ping${string}` & keyof S];
  project: S[`webhook-project${string}` & keyof S];
  project_card: S[`webhook-project-card${string}` & keyof S];
  project_column: S[`webhook-project-column${string}` & keyof S];
  projects_v2: S[`webhook-projects-v2${string}` & keyof S];
  projects_v2_item: S[`webhook-projects-v2-item${string}` & keyof S];
  projects_v2_status_update: S[`webhook-projects-v2-status-update${string}` & keyof S];
  public: S[`webhook-public${string}` & keyof S];
  pull_request: S[`webhook-pull-request${string}` & keyof S];
  pull_request_review: S[`webhook-pull-request-review${string}` & keyof S];
  pull_request_review_comment: S[`webhook-pull-request-review-comment${string}` & keyof S];
  pull_request_review_thread: S[`webhook-pull-request-review-thread${string}` & keyof S];
  push: S[`webhook-push${string}` & keyof S];
  registry_package: S[`webhook-registry-package${string}` & keyof S];
  release: S[`webhook-release${string}` & keyof S];
  repository: S[`webhook-repository${string}` & keyof S];
  repository_advisory: S[`webhook-repository-advisory${string}` & keyof S];
  repository_dispatch: S[`webhook-repository-dispatch${string}` & keyof S];
  repository_import: S[`webhook-repository-import${string}` & keyof S];
  repository_ruleset: S[`webhook-repository-ruleset${string}` & keyof S];
  repository_vulnerability_alert: S[`webhook-repository-vulnerability-alert${string}` & keyof S];
  secret_scanning_alert: S[`webhook-secret-scanning-alert${string}` & keyof S];
  secret_scanning_alert_location: S[`webhook-secret-scanning-alert-location${string}` & keyof S];
  secret_scanning_scan: S[`webhook-secret-scanning-scan${string}` & keyof S];
  security_advisory: S[`webhook-security-advisory${string}` & keyof S];
  security_and_analysis: S[`webhook-security-and-analysis${string}` & keyof S];
  sponsorship: S[`webhook-sponsorship${string}` & keyof S];
  star: S[`webhook-star${string}` & keyof S];
  status: S[`webhook-status${string}` & keyof S];
  sub_issues: S[`webhook-sub-issues${string}` & keyof S];
  team: S[`webhook-team${string}` & keyof S];
  team_add: S[`webhook-team-add${string}` & keyof S];
  watch: S[`webhook-watch${string}` & keyof S];
  workflow_dispatch: S[`webhook-workflow-dispatch${string}` & keyof S];
  workflow_job: S[`webhook-workflow-job${string}` & keyof S];
  workflow_run: S[`webhook-workflow-run${string}` & keyof S];
};
export type WEBHOOK_EVENT<K extends keyof WEBHOOK_EVENTS = keyof WEBHOOK_EVENTS> = {
  type: K;
  payload: WEBHOOK_EVENTS[K];
};
export type WEBHOOK_EVENT_2 =
  | {
      type: "branch_protection_configuration";
      payload: S[`webhook-branch-protection-configuration${string}` & keyof S];
    }
  | { type: "branch_protection_rule"; payload: S[`webhook-branch-protection-rule${string}` & keyof S] }
  | { type: "check_run"; payload: S[`webhook-check-run${string}` & keyof S] }
  | { type: "check_suite"; payload: S[`webhook-check-suite${string}` & keyof S] }
  | { type: "code_scanning_alert"; payload: S[`webhook-code-scanning-alert${string}` & keyof S] }
  | { type: "commit_comment"; payload: S[`webhook-commit-comment${string}` & keyof S] }
  | { type: "create"; payload: S[`webhook-create${string}` & keyof S] }
  | { type: "custom_property"; payload: S[`webhook-custom-property${string}` & keyof S] }
  | { type: "custom_property_values"; payload: S[`webhook-custom-property-values${string}` & keyof S] }
  | { type: "delete"; payload: S[`webhook-delete${string}` & keyof S] }
  | { type: "dependabot_alert"; payload: S[`webhook-dependabot-alert${string}` & keyof S] }
  | { type: "deploy_key"; payload: S[`webhook-deploy-key${string}` & keyof S] }
  | { type: "deployment"; payload: S[`webhook-deployment${string}` & keyof S] }
  | { type: "deployment_protection_rule"; payload: S[`webhook-deployment-protection-rule${string}` & keyof S] }
  | { type: "deployment_review"; payload: S[`webhook-deployment-review${string}` & keyof S] }
  | { type: "deployment_status"; payload: S[`webhook-deployment-status${string}` & keyof S] }
  | { type: "discussion"; payload: S[`webhook-discussion${string}` & keyof S] }
  | { type: "discussion_comment"; payload: S[`webhook-discussion-comment${string}` & keyof S] }
  | { type: "fork"; payload: S[`webhook-fork${string}` & keyof S] }
  | { type: "github_app_authorization"; payload: S[`webhook-github-app-authorization${string}` & keyof S] }
  | { type: "gollum"; payload: S[`webhook-gollum${string}` & keyof S] }
  | { type: "installation"; payload: S[`webhook-installation${string}` & keyof S] }
  | { type: "installation_repositories"; payload: S[`webhook-installation-repositories${string}` & keyof S] }
  | { type: "installation_target"; payload: S[`webhook-installation-target${string}` & keyof S] }
  | { type: "issue_comment"; payload: S[`webhook-issue-comment${string}` & keyof S] }
  | { type: "issue_dependencies"; payload: S[`webhook-issue-dependencies${string}` & keyof S] }
  | { type: "issues"; payload: S[`webhook-issues${string}` & keyof S] }
  | { type: "label"; payload: S[`webhook-label${string}` & keyof S] }
  | { type: "marketplace_purchase"; payload: S[`webhook-marketplace-purchase${string}` & keyof S] }
  | { type: "member"; payload: S[`webhook-member${string}` & keyof S] }
  | { type: "membership"; payload: S[`webhook-membership${string}` & keyof S] }
  | { type: "merge_group"; payload: S[`webhook-merge-group${string}` & keyof S] }
  | { type: "meta"; payload: S[`webhook-meta${string}` & keyof S] }
  | { type: "milestone"; payload: S[`webhook-milestone${string}` & keyof S] }
  | { type: "org_block"; payload: S[`webhook-org-block${string}` & keyof S] }
  | { type: "organization"; payload: S[`webhook-organization${string}` & keyof S] }
  | { type: "package"; payload: S[`webhook-package${string}` & keyof S] }
  | { type: "page_build"; payload: S[`webhook-page-build${string}` & keyof S] }
  | { type: "personal_access_token_request"; payload: S[`webhook-personal-access-token-request${string}` & keyof S] }
  | { type: "ping"; payload: S[`webhook-ping${string}` & keyof S] }
  | { type: "project"; payload: S[`webhook-project${string}` & keyof S] }
  | { type: "project_card"; payload: S[`webhook-project-card${string}` & keyof S] }
  | { type: "project_column"; payload: S[`webhook-project-column${string}` & keyof S] }
  | { type: "projects_v2"; payload: S[`webhook-projects-v2${string}` & keyof S] }
  | { type: "projects_v2_item"; payload: S[`webhook-projects-v2-item${string}` & keyof S] }
  | { type: "projects_v2_status_update"; payload: S[`webhook-projects-v2-status-update${string}` & keyof S] }
  | { type: "public"; payload: S[`webhook-public${string}` & keyof S] }
  | { type: "pull_request"; payload: S[`webhook-pull-request${string}` & keyof S] }
  | { type: "pull_request_review"; payload: S[`webhook-pull-request-review${string}` & keyof S] }
  | { type: "pull_request_review_comment"; payload: S[`webhook-pull-request-review-comment${string}` & keyof S] }
  | { type: "pull_request_review_thread"; payload: S[`webhook-pull-request-review-thread${string}` & keyof S] }
  | { type: "push"; payload: S[`webhook-push${string}` & keyof S] }
  | { type: "registry_package"; payload: S[`webhook-registry-package${string}` & keyof S] }
  | { type: "release"; payload: S[`webhook-release${string}` & keyof S] }
  | { type: "repository"; payload: S[`webhook-repository${string}` & keyof S] }
  | { type: "repository_advisory"; payload: S[`webhook-repository-advisory${string}` & keyof S] }
  | { type: "repository_dispatch"; payload: S[`webhook-repository-dispatch${string}` & keyof S] }
  | { type: "repository_import"; payload: S[`webhook-repository-import${string}` & keyof S] }
  | { type: "repository_ruleset"; payload: S[`webhook-repository-ruleset${string}` & keyof S] }
  | { type: "repository_vulnerability_alert"; payload: S[`webhook-repository-vulnerability-alert${string}` & keyof S] }
  | { type: "secret_scanning_alert"; payload: S[`webhook-secret-scanning-alert${string}` & keyof S] }
  | { type: "secret_scanning_alert_location"; payload: S[`webhook-secret-scanning-alert-location${string}` & keyof S] }
  | { type: "secret_scanning_scan"; payload: S[`webhook-secret-scanning-scan${string}` & keyof S] }
  | { type: "security_advisory"; payload: S[`webhook-security-advisory${string}` & keyof S] }
  | { type: "security_and_analysis"; payload: S[`webhook-security-and-analysis${string}` & keyof S] }
  | { type: "sponsorship"; payload: S[`webhook-sponsorship${string}` & keyof S] }
  | { type: "star"; payload: S[`webhook-star${string}` & keyof S] }
  | { type: "status"; payload: S[`webhook-status${string}` & keyof S] }
  | { type: "sub_issues"; payload: S[`webhook-sub-issues${string}` & keyof S] }
  | { type: "team"; payload: S[`webhook-team${string}` & keyof S] }
  | { type: "team_add"; payload: S[`webhook-team-add${string}` & keyof S] }
  | { type: "watch"; payload: S[`webhook-watch${string}` & keyof S] }
  | { type: "workflow_dispatch"; payload: S[`webhook-workflow-dispatch${string}` & keyof S] }
  | { type: "workflow_job"; payload: S[`webhook-workflow-job${string}` & keyof S] }
  | { type: "workflow_run"; payload: S[`webhook-workflow-run${string}` & keyof S] };
