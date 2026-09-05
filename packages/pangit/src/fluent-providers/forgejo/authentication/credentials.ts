import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { ForgejoUserPayload } from "../native/ForgejoRepositoryContainerNative.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { type ForgejoOperation, requestForgejoBody } from "../transport/response/mod.ts";
import { isRecord } from "./token-payload.ts";

type AnyForgejoUser = ForgejoUserPayload<ForgejoVersion>;

export async function verifyForgejoCredentials<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  options: OperationOptions,
): Promise<ForgejoAdapterContext<TVersion>> {
  const client = await context.client();
  const currentUser = await requestForgejoBody<AnyForgejoUser, TVersion>(
    context,
    operation,
    () => client.userGetCurrent({}, requestOptions(options)),
    options.signal,
    isForgejoUser,
  );
  return await context.withCurrentUser(currentUser as ForgejoUserPayload<TVersion>);
}

function requestOptions(options: OperationOptions): { readonly signal?: AbortSignal } {
  return options.signal === undefined ? {} : { signal: options.signal };
}

export function requireSecret<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  value: string,
  name: string,
): void {
  if (value.length === 0 || value.trim().length === 0) {
    throw validationError(context, operation, `${name} cannot be blank`);
  }
}

export function validationError<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "forgejo",
    version: context.version,
    operation: operation.universal,
  });
}

function isForgejoUser(value: unknown): value is AnyForgejoUser {
  return isRecord(value) && typeof value.login === "string" && value.login.trim().length > 0;
}
