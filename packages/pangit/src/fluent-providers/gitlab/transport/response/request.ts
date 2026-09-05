import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";
import {
  FluentOperationError,
  OperationAbortedError,
  ProviderInvariantError,
  ProviderOperationError,
} from "../../../../fluent-api/adapter-contract/errors.ts";

import type { GitLabAdapterContext } from "../GitLabAdapterContext.ts";
import type { GitLabVersion } from "../../native/GitLabNative.ts";
import {
  type GitLabOperation,
  type GitLabSuccessResponse,
  universalOperation,
} from "./operation.ts";

import {
  assertNotAborted,
  baseContext,
  errorContext,
  errorFromResponse,
  isAbortError,
} from "./errors.ts";

/** Run one generated operation and normalize every failure at the adapter boundary. */
export async function requestGitLab<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<GitLabSuccessResponse> {
  const result = await executeGitLab(context, operation, execute, signal);
  // GitLab's pinned schema omits documented success statuses on several endpoints (for
  // example commit creation is 201 in the REST docs but 200 in OpenAPI). Each caller
  // validates its actual response shape; generated documented flags remain untouched.
  return result as GitLabSuccessResponse;
}

/** Run one generated operation and return its body after optional shape validation. */
export async function requestGitLabBody<TBody, TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
  validate?: (value: unknown) => value is TBody,
): Promise<TBody> {
  const result = await requestGitLab(context, operation, execute, signal);
  if (validate !== undefined && !validate(result.body)) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed success body`,
      errorContext(context, operation, result),
    );
  }
  return result.body as TBody;
}

async function executeGitLab<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<AnyRestResponse & { readonly ok: true }> {
  assertNotAborted(context, operation, signal);
  try {
    const result = await execute();
    if (!result.ok) throw errorFromResponse(context, operation, result);
    return result as AnyRestResponse & { readonly ok: true };
  } catch (cause) {
    if (cause instanceof FluentOperationError) throw cause;
    if (signal?.aborted || isAbortError(cause)) {
      throw new OperationAbortedError(
        `${universalOperation(operation)} was aborted`,
        baseContext(context, operation, cause),
      );
    }
    throw new ProviderOperationError(
      `${universalOperation(operation)} failed before receiving a provider response`,
      baseContext(context, operation, cause),
    );
  }
}
