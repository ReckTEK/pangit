import { unavailable } from "../transport/mod.ts";
import type { BasicAuthorizationInput } from "../../../fluent-api/adapter-contract/authentication.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

/** GitLab REST accepts token/OAuth credentials, so reject Basic locally. */
export async function authorizeGitLabBasic<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  input: BasicAuthorizationInput,
  options: OperationOptions = {},
): Promise<GitLabAdapterContext<TVersion>> {
  await Promise.resolve();
  void input;
  void options;
  return unavailable(
    context,
    "authorizeBasic",
    "GitLab REST does not accept HTTP Basic authentication; use a personal access token or OAuth",
  );
}
