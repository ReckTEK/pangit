import * as PanGit from "@mannsion/pangit";
import {
  createExampleOAuth as createLowLevelExampleOAuth,
  type ExampleOAuthOptions,
} from "../../oauth/config.ts";

export async function createExampleOAuth(
  options: ExampleOAuthOptions & { readonly cookieSecret: string },
) {
  return PanGit.api.auth.createOAuthCookieFlow(await createLowLevelExampleOAuth(options), {
    cookie: { secret: options.cookieSecret },
  });
}
