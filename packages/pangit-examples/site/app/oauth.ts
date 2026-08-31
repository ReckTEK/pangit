import * as PanGit from "@mannsion/pangit";
import {
  createExampleOAuth as createLowLevelExampleOAuth,
  type ExampleOAuthOptions,
} from "../../oauth/config.ts";

export function createExampleOAuth(
  options: ExampleOAuthOptions & { readonly cookieSecret: string },
) {
  return PanGit.api.auth.createOAuthCookieFlow(createLowLevelExampleOAuth(options), {
    cookie: { secret: options.cookieSecret },
  });
}
