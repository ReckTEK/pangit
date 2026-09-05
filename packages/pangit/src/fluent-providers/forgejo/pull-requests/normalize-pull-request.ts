import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  PullRequestData,
  PullRequestRef,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";

import {
  createForgejoEntityNative,
  type ForgejoClient,
  type ForgejoEntityPayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";

import type { AnyForgejoPrBranchInfo, AnyForgejoPullRequest } from "./payload-types.ts";
import {
  optionalText,
  requiredPositiveInteger,
  requiredScalarText,
  requiredText,
} from "./validate-payload.ts";

/** Normalize one exact generated Forgejo pull-request payload. */
export function normalizeForgejoPullRequest<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  pullRequest: AnyForgejoPullRequest,
): PullRequestData<"forgejo", TVersion, ForgejoProviderTypes> {
  const number = requiredPositiveInteger(pullRequest.number, "pull-request number");
  const state = pullRequest.state;
  if (state !== "open" && state !== "closed") throw new TypeError("pull-request state is missing");
  if (typeof pullRequest.merged !== "boolean") {
    throw new TypeError(`pull-request ${number} merged state is missing`);
  }
  const description = optionalText(pullRequest.body);
  const author = optionalText(pullRequest.user?.login);
  const mergeBaseSha = optionalText(pullRequest.merge_base);
  const mergeCommitSha = optionalText(pullRequest.merge_commit_sha);
  const url = optionalText(pullRequest.html_url) ?? optionalText(pullRequest.url);
  return Object.freeze({
    id: requiredScalarText(pullRequest.id, "pull-request id"),
    number,
    title: requiredText(pullRequest.title, "pull-request title"),
    ...(description === undefined ? {} : { description }),
    state,
    source: normalizePullRequestRef(pullRequest.head, "pull-request source"),
    target: normalizePullRequestRef(pullRequest.base, "pull-request target"),
    ...(author === undefined ? {} : { author }),
    merged: pullRequest.merged,
    ...(typeof pullRequest.mergeable !== "boolean" ? {} : { mergeable: pullRequest.mergeable }),
    ...(mergeBaseSha === undefined ? {} : { mergeBaseSha }),
    ...(mergeCommitSha === undefined ? {} : { mergeCommitSha }),
    ...(url === undefined ? {} : { url }),
    native: createForgejoEntityNative(
      "pullRequest",
      client,
      pullRequest as ForgejoEntityPayload<TVersion, "pullRequest">,
    ),
  });
}

export function normalizePullRequestRef(value: unknown, name: string): PullRequestRef {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} is missing`);
  }
  const branch = value as AnyForgejoPrBranchInfo;
  const repository = branch.repo;
  if (repository === null || typeof repository !== "object" || Array.isArray(repository)) {
    throw new TypeError(`${name} repository is missing`);
  }
  const sha = optionalText(branch.sha);
  return Object.freeze({
    owner: requiredText(repository.owner?.login, `${name} owner`),
    repository: requiredText(repository.name, `${name} repository`),
    branch: requiredText(branch.ref, `${name} branch`),
    ...(sha === undefined ? {} : { sha }),
  });
}
