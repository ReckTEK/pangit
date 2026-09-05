import type { Adapter } from "../adapter.ts";
import type { GitLabVersion } from "../versions.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import { authorizeGitLabBasic } from "./basic.ts";
import { authorizeGitLabToken } from "./token.ts";
import { beginGitLabOAuth, exchangeGitLabOAuthCode } from "./oauth.ts";

export function createOperations<V extends GitLabVersion>(
  context: GitLabAdapterContext<V>,
  withContext: (context: GitLabAdapterContext<V>) => Adapter<V>,
): Pick<Adapter<V>, "authorizeToken" | "authorizeBasic" | "beginOAuth" | "exchangeOAuthCode"> {
  return {
    authorizeToken: async (input, options) =>
      withContext(await authorizeGitLabToken(context, input, options)),
    authorizeBasic: async (input, options) =>
      withContext(await authorizeGitLabBasic(context, input, options)),
    beginOAuth: (input) => beginGitLabOAuth(context, input),
    exchangeOAuthCode: (input, options) => exchangeGitLabOAuthCode(context, input, options),
  };
}
