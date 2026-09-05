import type { TokenAuthorizationInput } from "../../../fluent-api/adapter-contract/authentication.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requireSecret, validationError, verifyForgejoCredentials } from "./credentials.ts";

/** Attach and verify a Forgejo PAT or OAuth access token in one identity request. */
export async function authorizeForgejoToken<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  input: TokenAuthorizationInput,
  options: OperationOptions = {},
): Promise<ForgejoAdapterContext<TVersion>> {
  const operation = { universal: "authorizeToken", native: "userGetCurrent" } as const;
  requireSecret(context, operation, input.token, "token");
  const tokenType = input.tokenType ?? "token";
  if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(tokenType)) {
    throw validationError(context, operation, "tokenType must be a valid authorization scheme");
  }
  return await verifyForgejoCredentials(
    context.withHeaders({ Authorization: `${tokenType} ${input.token}` }),
    operation,
    options,
  );
}
