import { data, Link, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { createExampleOAuth } from "../oauth.ts";
import { callbackUrl, giteaClientId, oauthCookieSecret } from "../server/config.server.ts";

export async function loader({ request }: LoaderFunctionArgs) {
  const oauth = createExampleOAuth({
    clientId: giteaClientId(),
    callbackUrl: callbackUrl(request),
    cookieSecret: oauthCookieSecret(),
  });
  const completed = await oauth.complete(request);
  if (completed.ok) {
    const authorized = completed.authorized;
    return data(
      {
        result: "success" as const,
        provider: authorized.provider,
        version: authorized.version,
        tokenType: authorized.authorization.tokenType,
      },
      { headers: completed.headers },
    );
  }
  return data(
    {
      result: "error" as const,
      error: completed.error.message,
    },
    { headers: completed.headers, status: 400 },
  );
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
