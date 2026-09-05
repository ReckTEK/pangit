import type {
  PullRequestData,
  PullRequestRef,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";

import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "../native/GiteaEntityNative.ts";

import type { AnyGiteaPrBranchInfo, AnyGiteaPullRequest } from "./payload-types.ts";
import {
  optionalText,
  requiredPositiveInteger,
  requiredScalarText,
  requiredText,
} from "./validate-payload.ts";

/** Normalize one exact generated Gitea pull-request payload. */
export function normalizeGiteaPullRequest<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  pullRequest: AnyGiteaPullRequest,
): PullRequestData<"gitea", TVersion> {
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
    native: createGiteaEntityNative(
      "pullRequest",
      client,
      pullRequest as GiteaEntityPayload<TVersion, "pullRequest">,
    ),
  });
}

export function normalizePullRequestRef(value: unknown, name: string): PullRequestRef {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} is missing`);
  }
  const branch = value as AnyGiteaPrBranchInfo;
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
