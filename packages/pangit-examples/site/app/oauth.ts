import { createOAuthCookieFlow } from "@mannsion/pangit";
import {
  createExampleOAuth as createLowLevelExampleOAuth,
  type ExampleOAuthOptions,
} from "../../oauth/config.ts";

export function createExampleOAuth(
  options: ExampleOAuthOptions & { readonly cookieSecret: string },
) {
  return createOAuthCookieFlow(createLowLevelExampleOAuth(options), {
    cookie: { secret: options.cookieSecret },
  });
}
