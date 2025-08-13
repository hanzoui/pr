import { GithubReleaseNotificationTask } from ".";

if (import.meta.main) {
  console.log(await GithubReleaseNotificationTask.find().toArray());
}
