import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";
import {
  FluentOperationError,
  NotFoundError,
  OperationAbortedError,
  ProviderInvariantError,
  ProviderOperationError,
} from "../../../../fluent-api/adapter-contract/errors.ts";

import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaVersion } from "../../native/GiteaEntityNative.ts";
import { type GiteaOperation, type GiteaSuccessResponse, universalOperation } from "./operation.ts";

import {
  assertNotAborted,
  baseContext,
  errorContext,
  errorFromResponse,
  isAbortError,
} from "./errors.ts";

/** Run one generated operation and normalize every failure at the adapter boundary. */
export async function requestGitea<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<GiteaSuccessResponse> {
  const result = await executeGitea(context, operation, execute, signal);
  if (!result.documented) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned undocumented HTTP ${result.status}`,
      errorContext(context, operation, result),
    );
  }
  return result as GiteaSuccessResponse;
}

/**
 * Read a documented provider raw-text mode whose conditional media type is absent from OpenAPI.
 * Status failures retain normal adapter mapping; only a successful text body is accepted.
 */
export async function requestGiteaText<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<string> {
  const result = await executeGitea(context, operation, execute, signal);
  if (typeof result.body !== "string") {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed text success body`,
      errorContext(context, operation, result),
    );
  }
  return result.body;
}

/**
 * Read a complete raw file whose actual MIME type is more specific than OpenAPI's binary type.
 * The caller selects byte parsing on the generated operation; no text decoding may alter its body.
 */
export async function requestGiteaBytes<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<GiteaSuccessResponse & { readonly body: Uint8Array }> {
  const result = await executeGitea(context, operation, execute, signal);
  if (result.status !== 200 || !(result.body instanceof Uint8Array)) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed or incomplete binary success body`,
      errorContext(context, operation, result),
    );
  }
  return result as GiteaSuccessResponse & { readonly body: Uint8Array };
}

/** Run one generated operation and return its body after optional shape validation. */
export async function requestGiteaBody<TBody, TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
  validate?: (value: unknown) => value is TBody,
): Promise<TBody> {
  const result = await requestGitea(context, operation, execute, signal);
  if (validate !== undefined && !validate(result.body)) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed success body`,
      errorContext(context, operation, result),
    );
  }
  return result.body as TBody;
}

/** Convert only a confirmed provider 404 to absence. */
export async function requestOptionalGiteaBody<TBody, TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
  validate?: (value: unknown) => value is TBody,
): Promise<TBody | undefined> {
  try {
    return await requestGiteaBody(context, operation, execute, signal, validate);
  } catch (error) {
    if (error instanceof NotFoundError) return undefined;
    throw error;
  }
}

async function executeGitea<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
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
