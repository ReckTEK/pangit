import { type LoaderFunctionArgs, redirect } from "react-router";
import { createExampleOAuth } from "../oauth.ts";
import { callbackUrl, giteaClientId } from "../server/config.server.ts";
import { setTransactionCookie } from "../server/transaction-cookie.server.ts";

export async function loader({ request }: LoaderFunctionArgs) {
  const oauth = createExampleOAuth({
    clientId: giteaClientId(),
    callbackUrl: callbackUrl(request),
  });
  const { url, transaction } = await oauth.start("gitea");
  return redirect(url.href, {
    headers: { "Set-Cookie": await setTransactionCookie(transaction) },
  });
}
