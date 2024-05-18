import { Octokit } from "octokit";
const GH_TOKEN = process.env.GH_TOKEN;
if (!GH_TOKEN) throw new Error('Missing GH_TOKEN from https://github.com/settings/tokens?type=beta')
const octokit = new Octokit({ auth: GH_TOKEN });
export const gh = octokit.rest;
