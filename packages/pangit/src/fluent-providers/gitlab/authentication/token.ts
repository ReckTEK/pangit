import type { TokenAuthorizationInput } from "../../../fluent-api/adapter-contract/authentication.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { requireSecret, validationError, verifyGitLabCredentials } from "./credentials.ts";

/** Attach and verify a GitLab PAT or OAuth access token in one identity request. */
export async function authorizeGitLabToken<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  input: TokenAuthorizationInput,
  options: OperationOptions = {},
): Promise<GitLabAdapterContext<TVersion>> {
  const operation = { universal: "authorizeToken", native: "gitlab-supplement:GET:/user" } as const;
  requireSecret(context, operation, input.token, "token");
  const tokenType = input.tokenType ?? "Bearer";
  if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(tokenType)) {
    throw validationError(context, operation, "tokenType must be a valid authorization scheme");
  }
  return await verifyGitLabCredentials(
    context.withHeaders({ Authorization: `${tokenType} ${input.token}` }),
    operation,
    options,
  );
}
