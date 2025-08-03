import { db } from "@/src/db"
import { gh } from "@/src/gh"
import { parseUrlRepoOwner } from "@/src/parseOwnerRepo"
import DIE from "@snomiao/die"
import sflow from "sflow"
import parseGithubUrl from "parse-github-url"
import { slack } from "@/src/slack"
import { getSlackChannel } from "@/src/slack/channels"
import { slackMessageUrlParse, slackMessageUrlStringify } from "../gh-design/gh-design"
import isCI from "is-ci"
// workflow
/**
 * 1. fetch repos latest releases
 * 2. save the release info to the database
 * 3. if it's stable, notify the release to slack
 * 4. if it's a pre-release, do nothing
 */
const config = {
    repos: [
        'https://github.com/comfyanonymous/ComfyUI',
        'https://github.com/Comfy-Org/desktop',
    ],
    slackChannel: 'desktop',
    slackMessage: '🔮 {repo} <{url}|Release {version}> is stable! ',
    sendSince: new Date('2025-08-02T00:00:00Z').toISOString(), // only send notifications for releases after this date (UTC)
}

type GithubReleaseNotificationTask = {
    url: string, // github release url
    version?: string, // released version, e.g. v1.0.0, v2.0.0-beta.1
    releasedAt?: Date,
    isStable?: boolean, // true if the release is stable, false if it's a pre-release
    slackMessage?: {
        text: string
        channel: string
        url?: string // set after sent
    }
}

const GithubReleaseNotificationTask = db.collection<GithubReleaseNotificationTask>('GithubReleaseNotificationTask')
await GithubReleaseNotificationTask.createIndex({ url: 1 }, { unique: true })
const save = async (task: GithubReleaseNotificationTask) => await GithubReleaseNotificationTask.findOneAndUpdate(
    { url: task.url },
    { $set: task },
    { upsert: true, returnDocument: 'after' }
) || DIE('never')

if (import.meta.main) {
    await runGithubDesktopReleaseNotificationTask()
    if (isCI) {
        await db.close()
        process.exit(0); // exit if running in CI
    }
}

async function runGithubDesktopReleaseNotificationTask() {
    const pSlackChannelId = getSlackChannel(config.slackChannel).then(e => e.id || DIE(`unable to get slack channel ${config.slackChannel}`))
    // patch
    await GithubReleaseNotificationTask.deleteMany({
        url: /https:\/\/comfy-organization\.slack\.com\/.*/,
    })
    await GithubReleaseNotificationTask.findOneAndUpdate({
        version: "v0.4.60"
    }, {
        $set: {
            // channel: "C07H3GLKDPF",
            slackMessage: {
                url: "https://comfy-organization.slack.com/archives/C07H3GLKDPF/p1754217152324349",
                channel: await pSlackChannelId,
                text: 'TODO',
            }
        }
    })

    await sflow(config.repos)
        .map(parseUrlRepoOwner)
        .flatMap(({ owner, repo }) => gh.repos.listReleases({
            owner,
            repo,
            per_page: 3,
        }).then(e => e.data))
        .map(async (release) => {
            const url = release.html_url
            // create task
            let task = await save({
                url,
                isStable: !release.prerelease,
                version: release.tag_name,
                releasedAt: new Date(release.published_at || DIE('no published_at in release')),
            })
            if (!task.isStable) return task // not a stable release, skip
            if (+task.releasedAt! < +new Date(config.sendSince)) return task // skip releases before the sendSince date

            const draftSlackMessage = {
                channel: config.slackChannel,
                text: config.slackMessage
                    .replace('{url}', task.url)
                    .replace('{repo}', parseGithubUrl(task.url)?.repo || DIE(`unable parse REPO from URL ${task.url}`))
                    .replace('{version}', task.version || DIE(`unable to parse version from task ${JSON.stringify(task)}`)),
            }
            console.log(task)
            if (task.slackMessage?.url) {
                // already notified, check if we need to update the text
                if (task.slackMessage.text !== draftSlackMessage.text) {
                    // update message content
                    const ts = slackMessageUrlParse(task.slackMessage.url).ts
                    console.log(draftSlackMessage)
                    // console.log('slack.chat.update: ')
                    const msg = await slack.chat.update({
                        channel: task.slackMessage.channel,
                        ts,
                        text: draftSlackMessage.text,
                    })
                    // save updated message
                    task = await save({
                        url,
                        slackMessage: {
                            ...task.slackMessage!,
                            url: slackMessageUrlStringify({ channel: task.slackMessage!.channel, ts: msg.ts || DIE('missing ts in edited slack message') }),
                            text: draftSlackMessage.text!, // update text
                        }
                    }) // save the task with updated slack message
                } else {
                    // no need to update, pass
                }
            } else {
                // not yet notified, send a new message
                const channel = await pSlackChannelId
                // notify the slack channel
                const msg = await slack.chat.postMessage({
                    text: draftSlackMessage.text,
                    channel,
                })
                const slackUrl = slackMessageUrlStringify({ channel, ts: msg.ts! })
                task = await save({
                    url,
                    slackMessage: {
                        ...draftSlackMessage,
                        url: slackUrl, // set the url after sent
                    }
                }) // save the task with slack message
            }
            return task
        })
        .log()
        .run()
}

export default runGithubDesktopReleaseNotificationTask;
