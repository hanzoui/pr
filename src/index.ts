import "dotenv/config";
import { checkComfyActivated } from "./checkComfyActivated";
import { updateEmailTasks } from "./EmailTasks";
import { initializeFollowRules } from "./initializeFollowRules";
import { createLogger } from "./logger";
import { updateAuthors } from "./updateAuthors";
import { updateCNRepos } from "./updateCNRepos";
import { runFollowRuleSet } from "./updateFollowRuleSet";
import { updateSlackMessages } from "./updateSlackMessages";
import { tLog } from "./utils/tLog";

const logger = createLogger("main");

if (import.meta.main) {
  await Promise.all([
    // try send msgs that didn't send in last run
    updateSlackMessages(),
    checkComfyActivated(), // needed if making pr
    updateCNRepos(),
    updateAuthors(),
    updateEmailTasks(),

    // 2025-03-14 temporary disable due to the standard has updated:
    // updateTomlLicenseTasks(),
  ]);
  await initializeFollowRules();
  await tLog("runFollowRuleSet", runFollowRuleSet);
  logger.info("All done");
  process.exit(0);
}
