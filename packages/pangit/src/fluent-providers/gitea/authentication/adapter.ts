import type {} from "../registration.ts";

import { authorizeGiteaBasic } from "./basic.ts";
import { authorizeGiteaToken } from "./token.ts";
import { beginGiteaOAuth, exchangeGiteaOAuthCode } from "./oauth.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
  withContext: (context: GiteaAdapterContext<V>) => Adapter<V>,
): Pick<Adapter<V>, "authorizeToken" | "authorizeBasic" | "beginOAuth" | "exchangeOAuthCode"> {
  return {
    authorizeToken: async (input, options) =>
      withContext(await authorizeGiteaToken(context, input, options)),
    authorizeBasic: async (input, options) =>
      withContext(await authorizeGiteaBasic(context, input, options)),
    beginOAuth: (input) => beginGiteaOAuth(context, input),
    exchangeOAuthCode: (input, options) => exchangeGiteaOAuthCode(context, input, options),
  };
}
