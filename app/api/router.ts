import pkg from "@/package.json";
import { CNRepos } from "@/src/CNRepos";
import { getWorkerInstance } from "@/src/WorkerInstances";
import { analyzePullsStatus } from "@/src/analyzePullsStatus";
import { zPullsStatus } from "@/src/zod/zPullsStatus";
import { initTRPC } from "@trpc/server";
import DIE from "phpdie";
import sflow from "sflow";
import { type OpenApiMeta } from "trpc-openapi";
import z from "zod";
import { GithubContributorAnalyzeTask } from "../tasks/github-contributor-analyze/GithubContributorAnalyzeTask";

export const t = initTRPC.meta<OpenApiMeta>().create(); /* 👈 */
export const router = t.router({
  sayHello: t.procedure
    .meta({ openapi: { method: "GET", path: "/say-hello", description: "say hello" } })
    .input(z.object({ name: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .query(({ input }) => {
      return { greeting: `Hello ${input.name} 1!` };
    }),
  version: t.procedure
    .meta({ openapi: { method: "GET", path: "/version", description: "Get version of ComfyPR" } })
    .input(z.object({}))
    .output(z.object({ version: z.string() }))
    .query(({}) => ({ version: pkg.version })),
  dumpCsv: t.procedure
    .meta({ openapi: { method: "GET", path: "/dump.csv", description: "Get csv dump" } })
    .input(z.object({}))
    .output(z.string())
    .query(() => DIE("Should impl in nextjs route.")),
  dumpYaml: t.procedure
    .meta({ openapi: { method: "GET", path: "/dump.yaml", description: "Get yaml dump" } })
    .input(z.object({}))
    .output(z.string())
    .query(() => DIE("Should impl in nextjs route.")),
  getWorker: t.procedure
    .meta({ openapi: { method: "GET", path: "/worker", description: "Get current worker" } })
    .input(z.object({}))
    .output(z.any())
    .query(async () => await getWorkerInstance()),
  analyzePullsStatus: t.procedure
    .meta({ openapi: { method: "GET", path: "/analyze-pulls-status", description: "Get current worker" } })
    .input(z.object({ skip: z.number(), limit: z.number() }).partial())
    .output(zPullsStatus)
    .query(async ({ input: { limit = 0, skip = 0 } }) => (await analyzePullsStatus({ limit, skip })) as any),
  getRepoUrls: t.procedure
    .meta({ openapi: { method: "GET", path: "/repo-urls", description: "Get repo urls" } })
    .input(z.object({}))
    .output(z.array(z.string()))
    .query(
      async () =>
        await sflow(CNRepos.find({}, { projection: { repository: 1 } }))
          .map((e) => (e as unknown as { repository: string }).repository)
          .toArray(),
    ),
  GithubContributorAnalyzeTask: t.procedure
    .meta({
      openapi: {
        method: "GET",
        path: "/github-contributor-analyze-task",
        description: "Get github contributor analyze task",
      },
    })
    .input(z.object({}))
    .output(z.array(z.object({
      repoUrl: z.string(),
      contributors: z
        .array(
          z.object({
            count: z.number(),
            name: z.string(),
            email: z.string(),
          }),
        )
        .optional(),
      updatedAt: z.date().optional(),
      error: z.string().optional(),
      errorAt: z.date().optional(),
    })))
    .query(async () => {
      return await GithubContributorAnalyzeTask.find({}).toArray();
    }),

  githubContributorAnalyze: t.procedure
    .meta({
      openapi: { method: "GET", path: "/github-contributor-analyze", description: "Get github contributor analyze" },
    })
    .input(z.object({ url: z.string() }))
    .output(z.any())
    .query(async ({ input: { url } }) => {
      // await import { githubContributorAnalyze } from "../tasks/github-contributor-analyze/githubContributorAnalyze";
      const { githubContributorAnalyze } = await import("../tasks/github-contributor-analyze/githubContributorAnalyze");
      const result = await githubContributorAnalyze(url);
      return result;
    }),
});
