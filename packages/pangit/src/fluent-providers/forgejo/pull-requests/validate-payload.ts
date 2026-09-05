import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";

import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoEntityPayload, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoOperationIdentity } from "../transport/response/mod.ts";
import type {
  AnyForgejoChangedFile,
  AnyForgejoIssue,
  AnyForgejoPrBranchInfo,
  AnyForgejoPullRequest,
} from "./payload-types.ts";

export function requirePullRequestArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  response: AnyRestResponse,
): readonly AnyForgejoPullRequest[] {
  if (Array.isArray(response.body) && response.body.every(isPullRequestPayload)) {
    return response.body;
  }
  throw malformedArray(context, operation, response, "pull-request");
}

export function requirePullRequestSearchArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  response: AnyRestResponse,
): readonly AnyForgejoIssue[] {
  if (
    Array.isArray(response.body) &&
    response.body.every(isPullRequestSearchPayload)
  ) {
    return response.body as readonly AnyForgejoIssue[];
  }
  throw malformedArray(context, operation, response, "pull-request search result");
}

function isPullRequestSearchPayload(value: unknown): value is AnyForgejoIssue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const issue = value as AnyForgejoIssue;
  const repository = issue.repository;
  return isPositiveInteger(issue.number) && repository !== null &&
    typeof repository === "object" && !Array.isArray(repository) &&
    typeof repository.name === "string" && typeof repository.owner === "string" &&
    issue.pull_request !== null && typeof issue.pull_request === "object" &&
    !Array.isArray(issue.pull_request);
}

export function requireCommitArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  response: AnyRestResponse,
): readonly ForgejoEntityPayload<ForgejoVersion, "commit">[] {
  if (Array.isArray(response.body) && response.body.every(isCommitPayload)) return response.body;
  throw malformedArray(context, operation, response, "commit");
}

export function requireChangedFileArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  response: AnyRestResponse,
): readonly AnyForgejoChangedFile[] {
  if (Array.isArray(response.body) && response.body.every(isChangedFilePayload)) {
    return response.body;
  }
  throw malformedArray(context, operation, response, "changed-file");
}

function malformedArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  response: AnyRestResponse,
  entity: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation.universal} returned malformed ${entity} data`, {
    provider: "forgejo",
    version: context.version,
    operation: operation.universal,
    status: response.status,
    cause: response,
  });
}

export function isPullRequestPayload(value: unknown): value is AnyForgejoPullRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const pullRequest = value as AnyForgejoPullRequest;
  return hasScalar(pullRequest.id) && isPositiveInteger(pullRequest.number) &&
    hasText(pullRequest.title) &&
    (pullRequest.state === "open" || pullRequest.state === "closed") &&
    typeof pullRequest.merged === "boolean" && hasPullRequestRefShape(pullRequest.head) &&
    hasPullRequestRefShape(pullRequest.base);
}

function hasPullRequestRefShape(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const branch = value as AnyForgejoPrBranchInfo;
  return hasText(branch.ref) && branch.repo !== null && typeof branch.repo === "object" &&
    !Array.isArray(branch.repo) && hasText(branch.repo.name) && hasText(branch.repo.owner?.login);
}

function isCommitPayload(value: unknown): value is ForgejoEntityPayload<ForgejoVersion, "commit"> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    hasText((value as { readonly sha?: unknown }).sha);
}

function isChangedFilePayload(value: unknown): value is AnyForgejoChangedFile {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    hasText((value as AnyForgejoChangedFile).filename);
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

export function validationError<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "forgejo",
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
