import { type GitLabUserPayload, supplementalOperation } from "../supplemental.ts";

import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import { type GitLabOperation, requestGitLabBody } from "../transport/response/mod.ts";
import { isRecord } from "./token-payload.ts";

type AnyGitLabUser = GitLabUserPayload;

export async function verifyGitLabCredentials<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  options: OperationOptions,
): Promise<GitLabAdapterContext<TVersion>> {
  const client = await context.client();
  const currentUser = await requestGitLabBody<AnyGitLabUser, TVersion>(
    context,
    operation,
    () => client.rest.request(supplementalOperation("GET", "/user"), {}, requestOptions(options)),
    options.signal,
    isGitLabUser,
  );
  return await context.withCurrentUser(currentUser as GitLabUserPayload);
}

function requestOptions(options: OperationOptions): { readonly signal?: AbortSignal } {
  return options.signal === undefined ? {} : { signal: options.signal };
}

export function requireSecret<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  value: string,
  name: string,
): void {
  if (value.length === 0 || value.trim().length === 0) {
    throw validationError(context, operation, `${name} cannot be blank`);
  }
}

export function validationError<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitlab",
    version: context.version,
    operation: operation.universal,
  });
}

function isGitLabUser(value: unknown): value is AnyGitLabUser {
  return isRecord(value) && typeof value.username === "string" && value.username.trim().length > 0;
}
