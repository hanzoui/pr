"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gh = void 0;
var octokit_1 = require("octokit");
var GH_TOKEN = process.env.GH_TOKEN;
if (!GH_TOKEN)
    throw new Error('Missing GH_TOKEN from https://github.com/settings/tokens?type=beta');
var octokit = new octokit_1.Octokit({ auth: GH_TOKEN });
exports.gh = octokit.rest;
