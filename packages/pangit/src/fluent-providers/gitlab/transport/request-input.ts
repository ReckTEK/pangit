import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";

import type { GitLabClient } from "../native/GitLabNative.ts";

export type Client = GitLabClient<"18.11.11">;

export type Method = {
  [K in keyof Client]: Client[K] extends (...a: never[]) => Promise<AnyRestResponse> ? K : never;
}[keyof Client];

export type Input<M extends Method> = M extends "postApiV4ProjectsIdRepositoryCommits" ? {
    path: { id: string };
    body: {
      mediaType: "application/json";
      value: {
        branch: string;
        commit_message: string;
        start_branch?: string;
        start_sha?: string;
        force?: boolean;
        author_name?: string;
        author_email?: string;
        actions: {
          action: "create" | "update" | "delete" | "move";
          file_path: string;
          previous_path?: string;
          content?: string;
          encoding?: "base64";
          last_commit_id?: string;
        }[];
      };
    };
  }
  : M extends "getApiV4ProjectsIdRepositoryBranchesBranch"
    ? { path: { id: string; branch: string } }
  : Parameters<Client[M]>[0];
