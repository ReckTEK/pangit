import { data, Link, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { createExampleOAuth } from "../oauth.ts";
import { callbackUrl, giteaClientId } from "../server/config.server.ts";
import {
  clearTransactionCookie,
  readTransactionCookie,
} from "../server/transaction-cookie.server.ts";

export async function loader({ request }: LoaderFunctionArgs) {
  const transaction = await readTransactionCookie(request);
  if (!transaction) {
    throw new Response("No Gitea login is in progress", { status: 400 });
  }

  const oauth = createExampleOAuth({
    clientId: giteaClientId(),
    callbackUrl: callbackUrl(request),
  });
  try {
    const authorized = await oauth.authorize(
      request,
      transaction as Parameters<typeof oauth.authorize>[1],
    );
    return data(
      {
        result: "success" as const,
        provider: authorized.provider,
        version: authorized.version,
        tokenType: authorized.authorization.tokenType,
      },
      { headers: { "Set-Cookie": clearTransactionCookie() } },
    );
  } catch (cause) {
    return data(
      {
        result: "error" as const,
        error: cause instanceof Error ? cause.message : String(cause),
      },
      { headers: { "Set-Cookie": clearTransactionCookie() } },
    );
  }
}

export default function CallbackPage() {
  const result = useLoaderData<typeof loader>();
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="card">
        {result.result === "success"
          ? (
            <>
              <p className="text-sm font-semibold text-emerald-700">Login succeeded</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Connected to Gitea
              </h1>
              <p className="mt-4 text-slate-600">
                PanGit exchanged the OAuth code and verified the token through the Gitea REST
                client.
              </p>
              <p className="mt-4 font-mono text-sm text-slate-700">
                {result.provider} {result.version} · {result.tokenType}
              </p>
            </>
          )
          : (
            <>
              <p className="text-sm font-semibold text-red-700">Login failed</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Gitea did not authorize the request
              </h1>
              <p role="alert" className="mt-4 text-red-700">{result.error}</p>
            </>
          )}
        <Link to="/" className="button-secondary mt-8">Back to login</Link>
      </div>
    </main>
  );
}
