import type { TokenAuthorizationInput } from "../../../fluent-api/adapter-contract/authentication.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requireSecret, validationError, verifyGiteaCredentials } from "./credentials.ts";

/** Attach and verify a Gitea PAT or OAuth access token in one identity request. */
export async function authorizeGiteaToken<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  input: TokenAuthorizationInput,
  options: OperationOptions = {},
): Promise<GiteaAdapterContext<TVersion>> {
  const operation = { universal: "authorizeToken", native: "userGetCurrent" } as const;
  requireSecret(context, operation, input.token, "token");
  const tokenType = input.tokenType ?? "token";
  if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(tokenType)) {
    throw validationError(context, operation, "tokenType must be a valid authorization scheme");
  }
  return await verifyGiteaCredentials(
    context.withHeaders({ Authorization: `${tokenType} ${input.token}` }),
    operation,
    options,
  );
}
