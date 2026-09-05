import type { LoaderFunctionArgs } from "react-router";
import { createExampleOAuth } from "../oauth.ts";
import { callbackUrl, giteaClientId, oauthCookieSecret } from "../server/config.server.ts";

export async function loader({ request }: LoaderFunctionArgs) {
  const oauth = await createExampleOAuth({
    clientId: giteaClientId(),
    callbackUrl: callbackUrl(request),
    cookieSecret: oauthCookieSecret(),
  });
  return await oauth.start("gitea");
}
