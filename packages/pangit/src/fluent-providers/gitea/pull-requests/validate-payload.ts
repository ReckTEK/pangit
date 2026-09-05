import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";

import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaOperationIdentity } from "../transport/response/mod.ts";
import type {
  AnyGiteaChangedFile,
  AnyGiteaIssue,
  AnyGiteaPrBranchInfo,
  AnyGiteaPullRequest,
} from "./payload-types.ts";

export function requirePullRequestArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly AnyGiteaPullRequest[] {
  if (Array.isArray(response.body) && response.body.every(isPullRequestPayload)) {
    return response.body;
  }
  throw malformedArray(context, operation, response, "pull-request");
}

export function requirePullRequestSearchArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly AnyGiteaIssue[] {
  if (
    Array.isArray(response.body) &&
    response.body.every(isPullRequestSearchPayload)
  ) {
    return response.body as readonly AnyGiteaIssue[];
  }
  throw malformedArray(context, operation, response, "pull-request search result");
}

function isPullRequestSearchPayload(value: unknown): value is AnyGiteaIssue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const issue = value as AnyGiteaIssue;
  const repository = issue.repository;
  return isPositiveInteger(issue.number) && repository !== null &&
    typeof repository === "object" && !Array.isArray(repository) &&
    typeof repository.name === "string" && typeof repository.owner === "string" &&
    issue.pull_request !== null && typeof issue.pull_request === "object" &&
    !Array.isArray(issue.pull_request);
}

export function requireCommitArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly GiteaEntityPayload<GiteaVersion, "commit">[] {
  if (Array.isArray(response.body) && response.body.every(isCommitPayload)) return response.body;
  throw malformedArray(context, operation, response, "commit");
}

export function requireChangedFileArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly AnyGiteaChangedFile[] {
  if (Array.isArray(response.body) && response.body.every(isChangedFilePayload)) {
    return response.body;
  }
  throw malformedArray(context, operation, response, "changed-file");
}

function malformedArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
  entity: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation.universal} returned malformed ${entity} data`, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
    status: response.status,
    cause: response,
  });
}

export function isPullRequestPayload(value: unknown): value is AnyGiteaPullRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const pullRequest = value as AnyGiteaPullRequest;
  return hasScalar(pullRequest.id) && isPositiveInteger(pullRequest.number) &&
    hasText(pullRequest.title) &&
    (pullRequest.state === "open" || pullRequest.state === "closed") &&
    typeof pullRequest.merged === "boolean" && hasPullRequestRefShape(pullRequest.head) &&
    hasPullRequestRefShape(pullRequest.base);
}

function hasPullRequestRefShape(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const branch = value as AnyGiteaPrBranchInfo;
  return hasText(branch.ref) && branch.repo !== null && typeof branch.repo === "object" &&
    !Array.isArray(branch.repo) && hasText(branch.repo.name) && hasText(branch.repo.owner?.login);
}

function isCommitPayload(value: unknown): value is GiteaEntityPayload<GiteaVersion, "commit"> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    hasText((value as { readonly sha?: unknown }).sha);
}

function isChangedFilePayload(value: unknown): value is AnyGiteaChangedFile {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    hasText((value as AnyGiteaChangedFile).filename);
}

export function optionalIdentity(value: string | undefined, name: string): string | undefined {
  return value === undefined ? undefined : requireIdentity(value, name);
}

export function requireNonNegativeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

export function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
  });
}

export function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

export function requiredScalarText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

export function requiredPositiveInteger(value: unknown, name: string): number {
  if (!isPositiveInteger(value)) throw new TypeError(`${name} is missing or invalid`);
  return value;
}

export function optionalNonNegativeInteger(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${name} is invalid`);
  }
  return value as number;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasScalar(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 ||
    typeof value === "number" && Number.isSafeInteger(value) || typeof value === "bigint";
}
