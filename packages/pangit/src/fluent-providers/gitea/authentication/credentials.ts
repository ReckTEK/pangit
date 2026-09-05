import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { GiteaUserPayload } from "../native/GiteaRepositoryContainerNative.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { type GiteaOperation, requestGiteaBody } from "../transport/response/mod.ts";
import { isRecord } from "./token-payload.ts";

type AnyGiteaUser = GiteaUserPayload<GiteaVersion>;

export async function verifyGiteaCredentials<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  options: OperationOptions,
): Promise<GiteaAdapterContext<TVersion>> {
  const client = await context.client();
  const currentUser = await requestGiteaBody<AnyGiteaUser, TVersion>(
    context,
    operation,
    () => client.userGetCurrent({}, requestOptions(options)),
    options.signal,
    isGiteaUser,
  );
  return await context.withCurrentUser(currentUser as GiteaUserPayload<TVersion>);
}

function requestOptions(options: OperationOptions): { readonly signal?: AbortSignal } {
  return options.signal === undefined ? {} : { signal: options.signal };
}

export function requireSecret<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  value: string,
  name: string,
): void {
  if (value.length === 0 || value.trim().length === 0) {
    throw validationError(context, operation, `${name} cannot be blank`);
  }
}

export function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
  });
}

function isGiteaUser(value: unknown): value is AnyGiteaUser {
  return isRecord(value) && typeof value.login === "string" && value.login.trim().length > 0;
}
