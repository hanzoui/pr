// 1. bot matches label "bug-cop:ask-for-info", and if user have added context, remove "bug-cop:ask-for-info" and add "bug-cop:answered"
// for repo
import { db } from "@/src/db";
import { TaskMetaCollection } from "@/src/db/TaskMeta";
import { gh, type GH } from "@/src/gh";
import { parseIssueUrl } from "@/src/parseIssueUrl";
import { parseUrlRepoOwner } from "@/src/parseOwnerRepo";
import DIE from "@snomiao/die";
import chalk from "chalk";
import { compareBy } from "comparing";
import fastDiff from "fast-diff";
import hotMemo from "hot-memo";
import isCI from "is-ci";
import sflow, { pageFlow } from "sflow";
import z from "zod";
import { createTimeLogger } from "../gh-design/createTimeLogger";
// import Lock from 'async-sema';
// import deferClose from "defer-close";
export const REPOLIST = [
  "https://github.com/Comfy-Org/Comfy-PR",
  "https://github.com/comfyanonymous/ComfyUI",
  "https://github.com/Comfy-Org/ComfyUI_frontend",
  "https://github.com/Comfy-Org/desktop",
];
export const ASKING_LABEL = "bug-cop:ask-for-info";
export const ANSWERED_LABEL = "bug-cop:answered";
export const GithubBugcopTaskDefaultMeta = {
  repoUrls: REPOLIST,
  matchLabel: [ASKING_LABEL],
};

export type GithubBugcopTask = {
  url: string; // the issue URL

  status?: "ask-for-info" | "answered" | "closed";
  statusReason?: string; // reason for the status, for example, "no new comments" or "body updated"
  updatedAt?: Date; // the last updated time of the issue, for diff checking

  body?: string; // body of the issue, for diff checking

  // caches
  user?: string; // the user who created the issue
  labels?: string[]; // labels of the issue, just cache
  timeline?: (GH["labeled-issue-event"] | GH["timeline-comment-event"] | GH["unlabeled-issue-event"])[]; // timeline events of the issue, just cache

  // task status for task scheduler
  taskStatus?: "processing" | "ok" | "error";
  taskAction?: string; // if processing, can be use for rollback or undo
  lastChecked?: Date; // last updated time of the issue
};
export const zGithubBugcopTaskMeta = z.object({
  repoUrls: z.url().array(),
});
export const GithubBugcopTaskMeta = TaskMetaCollection("GithubBugcopTask", zGithubBugcopTaskMeta);
export const GithubBugcopTask = db.collection<GithubBugcopTask>("GithubBugcopTask");

const tlog = createTimeLogger();

if (import.meta.main) {
  await runGithubBugcopTask();
  if (isCI) db.close();
}

export default async function runGithubBugcopTask() {
  const isDryRun = process.env.DRY_RUN === "true" || process.argv.slice(2).includes("--dry");
  tlog("Running Github Bugcop Task...");
  await sflow(REPOLIST)
    // list issues for each repo
    .map((url) => {
      // tlog(`Fetching issues for ${url}...`);
      return pageFlow(1, async (page) => {
        const { data: issues } = await hotMemo(gh.issues.listForRepo, [
          {
            ...parseUrlRepoOwner(url),
            state: "open" as const,
            page,
            per_page: 100,
            labels: ASKING_LABEL,
          },
        ]);
        tlog(`Found ${issues.length} matched issues in ${url}`);
        return { data: issues, next: issues.length >= 100 ? page + 1 : undefined };
      });
    })
    .confluenceByParallel() // order does not matter, so we can run in parallel
    .filter((e) => e.length) // filter out empty pages
    .flat() // flatten the page results
    .by((issueFlow) => {
      const tr = new TransformStream<GH["issue"], GH["issue"]>();
      const writer = tr.writable.getWriter();
      issueFlow
        // pipe downstream, but do not close the writer so that we can write to it later
        .forkTo((s) => s.forEach((issue) => writer.write(issue)).run())
        // collect all scanned issues in an array
        .toArray()
        // once a full scan for all repos is done
        // there might be a few issues that are not in the list
        // e.g. recently closed issue, will not be found in the list since we are filtering by "open" issues
        // but they are still in db, as they were opened before the scan started
        // so we need to update it
        .then(async (openingIssues) => {
          const scannedUrls = openingIssues.map((i) => i.html_url);
          await sflow(GithubBugcopTask.find({ url: { $nin: scannedUrls } }, { projection: { url: 1 } }))
            .map((e) => e as { url: string })
            .map(
              async ({ url }) =>
                await gh.issues.get({
                  ...parseIssueUrl(url),
                }),
            )
            .map((e) => e.data)
            .forEach((issue) => writer.write(issue))
            .run();
          await writer.close();
        });
      return tr.readable;
    })
    .uniqBy((issue) => issue.html_url) // remove duplicates by issue URL, maybe not necessary, but good for redability
    .map(async (issue) => {
      const url = issue.html_url; // ?? ("issue.html_url is required")    ;
      let task = await GithubBugcopTask.findOne({ url });
      const saveTask = async (data: Partial<GithubBugcopTask>) =>
        (task =
          (await GithubBugcopTask.findOneAndUpdate(
            { url },
            { $set: data },
            { returnDocument: "after", upsert: true },
          )) || DIE("never"));
      task = await saveTask({
        taskStatus: "processing",
        user: issue.user?.login,
        labels: issue.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))).filter(Boolean),
        updatedAt: new Date(issue.updated_at),
      });

      if (issue.state === "closed") {
        await saveTask({
          status: "closed",
          statusReason: "issue closed",
          updatedAt: new Date(issue.updated_at),
          lastChecked: new Date(),
        });
        return;
      }

      if (!task.labels?.includes(ASKING_LABEL)) {
        await saveTask({ updatedAt: new Date(issue.updated_at), labels: [...(task.labels ?? []), ASKING_LABEL] });
      }

      // check if the issue body is updated since last successful scan
      if (!task.body) await saveTask({ body: issue.body ?? undefined });
      const isBodyAddedContent =
        issue.body &&
        task.body &&
        issue.body !== task.body &&
        fastDiff(task.body ?? "", issue.body ?? "").filter(([op, val]) => op === fastDiff.INSERT).length > 0; // check if the issue body has added new content after the label added time

      tlog(chalk.bgBlackBright("Issue: " + issue.html_url));

      const timeline = await pageFlow(1, async (page) => {
        const { data: events } = await hotMemo(gh.issues.listEventsForTimeline, [
          {
            ...parseIssueUrl(issue.html_url),
            page,
            per_page: 100,
          },
        ]);
        return { data: events, next: events.length >= 100 ? page + 1 : undefined };
      })
        .filter((e) => e.length)
        .flat()
        .toArray();

      // list all label events
      const labelEvents = await sflow(timeline)
        .forEach((_e) => {
          if (_e.event === "labeled") {
            const e = _e as GH["labeled-issue-event"];
            tlog(`#${issue.number} ${new Date(e.created_at).toISOString()} @${e.actor.login} + label:${e.label.name}`);
            return e;
          }
          if (_e.event === "unlabeled") {
            const e = _e as GH["unlabeled-issue-event"];
            tlog(`#${issue.number} ${new Date(e.created_at).toISOString()} @${e.actor.login} - label:${e.label.name}`);
            return e;
          }
          if (_e.event === "commented") {
            const e = _e as GH["timeline-comment-event"];
            tlog(`#${issue.number} ${new Date(e.created_at).toISOString()} @${e.actor?.login} ${e.body?.slice(0, 20)}`);
            return e;
          }

          tlog(`#${issue.number} ${new Date((_e as any).created_at ?? new Date()).toISOString()} ? ${_e.event}`);
          // ignore other events
        })
        .toArray();
      tlog("Found " + labelEvents.length + " timeline events");
      await saveTask({ timeline: labelEvents as any });

      const latestLabeledEvent =
        labelEvents
          .filter((e) => e.event === "labeled")
          .map((e) => e as GH["labeled-issue-event"])
          .filter((e) => e.label?.name === ASKING_LABEL)
          .sort(compareBy((e) => e.created_at))
          .reverse()[0] ||
        DIE("No labeled event found, this should not happen since we are filtering issues by this label");
      // last added time of this label
      const labelLastAddedTime = new Date(latestLabeledEvent?.created_at);
      tlog('Last added time of label "' + ASKING_LABEL + '" is ' + labelLastAddedTime.toISOString());

      // checkif it's answered
      const hasNewComment = await (async function () {
        // 1. list issue comments that is updated/created later than this label last added
        const comments = await pageFlow(1, async (page) => {
          const { data: comments } = await hotMemo(gh.issues.listComments.bind(gh.issues), [
            {
              ...parseIssueUrl(issue.html_url),
              page,
              per_page: 100,
            },
          ]);
          return { data: comments, next: comments.length >= 100 ? page + 1 : undefined };
        })
          .filter((page) => page.length)
          .flat()
          .filter((e) => e.user) // filter out comments without user
          .filter((e) => !e.user!.login.match(/\[bot\]$|-bot/)) // no bots
          .filter((e) => e.user!.login !== latestLabeledEvent.actor.login) // ignore the user who added the label
          .filter((e) => +new Date(e.updated_at) > +new Date(labelLastAddedTime)) // only comments that is updated later than the label added time
          .toArray();
        tlog("Found " + comments.length + " comments after last added time for " + issue.html_url);
        tlog("Found " + JSON.stringify(comments));
        return !!comments.length;
      })();
      // // TODO: maybe search in notion db about this issue, if it's answered in notion, then mark as answered
      // tlog('issue body not updated after last added time, checking comments...');

      const isAnswered = hasNewComment || isBodyAddedContent; // TODO: check if the issue body is updated after the label added time, if so, then it's answered

      if (isAnswered) {
        tlog(chalk.bgBlue(`Issue ${url} is answered, removing label and adding answered label...`));
        await saveTask({
          status: "answered",
          statusReason: isBodyAddedContent ? "body updated" : hasNewComment ? "new comment" : "unknow
          n",
        });
        if (!isDryRun) {
          task = await saveTask({ taskAction: "- " + ASKING_LABEL + ", + " + ANSWERED_LABEL });
          await gh.issues.removeLabel({
            ...parseIssueUrl(issue.html_url),
            name: ASKING_LABEL,
          });
          if (!task.labels?.includes(ANSWERED_LABEL))
            await gh.issues.addLabels({
              ...parseIssueUrl(issue.html_url),
              labels: [ANSWERED_LABEL],
            });
          // 
          task = await saveTask({
            labels: [...(task.labels?.filter((e) => e !== ASKING_LABEL) || []), ANSWERED_LABEL],
          });
          tlog('Removed "bug-cop:ask-for-info" label and added "bug-cop:answered" label to ' + issue.html_url);
          await saveTask({ body: issue.body ?? undefined });
        }
      } else {
        await saveTask({ status: "ask-for-info", statusReason: "nothing changed" });
        if (task.labels?.includes(ANSWERED_LABEL)) {
          tlog(chalk.bgRed(`Issue ${url} has answered label, but is not answered, removing answered label...`));
          if (!isDryRun) {
            task = await saveTask({ taskAction: "- " + ANSWERED_LABEL });
            await gh.issues.removeLabel({
              ...parseIssueUrl(issue.html_url),
              name: ANSWERED_LABEL,
            });
            task = await saveTask({
              status: "ask-for-info",
              taskStatus: "processing",
              labels: task.labels?.filter((l) => l !== ANSWERED_LABEL) || [],
            });
          }
        } else {
          tlog(`Issue ${url} is not answered, doing nothing...`);
        }
      }

      // still not answered, do nothing
      await saveTask({ lastChecked: new Date(), taskStatus: "ok" });
    })
    .run();
}
