import { db } from "@/src/db";

export type Contributor = {
  count: number;
  name: string;
  email: string;
};

export type GithubContributorAnalyzeTask = {
  repoUrl: string; // unique task id
  contributors?: Contributor[];
  updatedAt?: Date;
  error?: string;
  errorAt?: Date;
};

export const GithubContributorAnalyzeTask = db.collection<GithubContributorAnalyzeTask>("GithubContributorAnalzyeTask"); // git shortlog --summary --numbered --email
// todo: rename GithubContributorAnalzyeTask => GithubContributorAnalyzeTask

