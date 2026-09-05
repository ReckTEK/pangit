import { authorizeForgejoBasic } from "./basic.ts";
import { authorizeForgejoToken } from "./token.ts";
import { beginForgejoOAuth, exchangeForgejoOAuthCode } from "./oauth.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  withContext: (context: ForgejoAdapterContext<V>) => Adapter<V>,
): Pick<Adapter<V>, "authorizeToken" | "authorizeBasic" | "beginOAuth" | "exchangeOAuthCode"> {
  return {
    authorizeToken: async (input, options) =>
      withContext(await authorizeForgejoToken(context, input, options)),
    authorizeBasic: async (input, options) =>
      withContext(await authorizeForgejoBasic(context, input, options)),
    beginOAuth: (input) => beginForgejoOAuth(context, input),
    exchangeOAuthCode: (input, options) => exchangeForgejoOAuthCode(context, input, options),
  };
}
