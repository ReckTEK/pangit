import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";
import {
  FluentOperationError,
  NotFoundError,
  OperationAbortedError,
  ProviderInvariantError,
  ProviderOperationError,
} from "../../../../fluent-api/adapter-contract/errors.ts";

import type { ForgejoAdapterContext } from "../ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../../native/ForgejoEntityNative.ts";
import {
  type ForgejoOperation,
  type ForgejoSuccessResponse,
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
export async function requestForgejo<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<ForgejoSuccessResponse> {
  const result = await executeForgejo(context, operation, execute, signal);
  if (!result.documented) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned undocumented HTTP ${result.status}`,
      errorContext(context, operation, result),
    );
  }
  return result as ForgejoSuccessResponse;
}

/**
 * Read a documented provider raw-text mode whose conditional media type is absent from OpenAPI.
 * Status failures retain normal adapter mapping; only a successful text body is accepted.
 */
export async function requestForgejoText<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<string> {
  const result = await executeForgejo(context, operation, execute, signal);
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
export async function requestForgejoBytes<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<ForgejoSuccessResponse & { readonly body: Uint8Array }> {
  const result = await executeForgejo(context, operation, execute, signal);
  if (result.status !== 200 || !(result.body instanceof Uint8Array)) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed or incomplete binary success body`,
      errorContext(context, operation, result),
    );
  }
  return result as ForgejoSuccessResponse & { readonly body: Uint8Array };
}

/** Run one generated operation and return its body after optional shape validation. */
export async function requestForgejoBody<TBody, TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
  validate?: (value: unknown) => value is TBody,
): Promise<TBody> {
  const result = await requestForgejo(context, operation, execute, signal);
  if (validate !== undefined && !validate(result.body)) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed success body`,
      errorContext(context, operation, result),
    );
  }
  return result.body as TBody;
}

/** Convert only a confirmed provider 404 to absence. */
export async function requestOptionalForgejoBody<TBody, TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
  validate?: (value: unknown) => value is TBody,
): Promise<TBody | undefined> {
  try {
    return await requestForgejoBody(context, operation, execute, signal, validate);
  } catch (error) {
    if (error instanceof NotFoundError) return undefined;
    throw error;
  }
}

async function executeForgejo<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
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
