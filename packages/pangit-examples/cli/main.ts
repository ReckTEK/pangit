import { createExampleOAuth } from "../oauth/config.ts";

const callbackPath = "/auth/callback";
const hostname = "127.0.0.1";

interface AuthorizationSummary {
  readonly provider: string;
  readonly version: string;
  readonly method: string;
  readonly tokenType: string;
  readonly expiresIn?: number;
  readonly scope?: string;
}

await run();

async function run(): Promise<void> {
  const noOpen = parseArguments(Deno.args);
  const clientId = requiredEnvironment("PANGIT_GITEA_CLIENT_ID");
  const abort = new AbortController();
  const listening = Promise.withResolvers<Deno.NetAddr>();
  const completed = Promise.withResolvers<AuthorizationSummary>();
  let callback: ((request: Request) => Promise<Response>) | undefined;
  let callbackClaimed = false;

  const server = Deno.serve(
    {
      hostname,
      port: 0,
      signal: abort.signal,
      onListen: listening.resolve,
    },
    async (request) => {
      const url = new URL(request.url);
      if (url.pathname !== callbackPath) {
        return new Response("Waiting for the PanGit OAuth callback.", { status: 200 });
      }
      if (callback === undefined) {
        return new Response("OAuth login is not ready yet.", { status: 503 });
      }
      if (callbackClaimed) {
        return new Response("This OAuth callback was already used.", { status: 409 });
      }
      callbackClaimed = true;
      return await callback(request);
    },
  );

  try {
    const address = await listening.promise;
    if (address.transport !== "tcp") throw new Error("Expected a TCP callback listener");
    const callbackUrl = new URL(`http://${hostname}:${address.port}${callbackPath}`);
    const oauth = createExampleOAuth({ clientId, callbackUrl });
    const start = await oauth.start("gitea");

    callback = async (request) => {
      try {
        const authorized = await oauth.authorize(request, start.transaction);
        const summary = summarize(authorized);
        completed.resolve(summary);
        return htmlResponse(
          "PanGit login complete",
          "Gitea authorized successfully. You can close this browser window.",
          200,
        );
      } catch (error) {
        completed.reject(error);
        return htmlResponse(
          "PanGit login failed",
          "The OAuth callback could not be authorized. Return to the terminal for details.",
          400,
        );
      }
    };

    console.log("Gitea login:");
    console.log("  Username: sandbox");
    console.log("  Password: gitea-sandbox-password");
    console.log(`\nOpen this URL to authorize Gitea:\n${start.url}`);
    if (!noOpen) await openBrowser(start.url);

    const authorized = await completed.promise;
    console.log("\nAuthorized:");
    console.log(JSON.stringify(authorized, null, 2));
  } finally {
    await shutdown(server, abort);
  }
}

function parseArguments(args: readonly string[]): boolean {
  for (const argument of args) {
    if (argument !== "--no-open") throw new TypeError(`Unknown CLI option: ${argument}`);
  }
  return args.includes("--no-open");
}

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is required; start the CLI through the sandbox launcher`);
  return value;
}

function summarize(authorized: {
  readonly provider: string;
  readonly version: string;
  readonly authorization: {
    readonly method: string;
    readonly tokenType: string;
    readonly expiresIn?: number;
    readonly scope?: string;
  };
}): AuthorizationSummary {
  return {
    provider: authorized.provider,
    version: authorized.version,
    method: authorized.authorization.method,
    tokenType: authorized.authorization.tokenType,
    ...(authorized.authorization.expiresIn === undefined
      ? {}
      : { expiresIn: authorized.authorization.expiresIn }),
    ...(authorized.authorization.scope === undefined
      ? {}
      : { scope: authorized.authorization.scope }),
  };
}

async function openBrowser(url: URL): Promise<void> {
  const command = browserCommand(url.href);
  try {
    const status = await new Deno.Command(command.executable, {
      args: command.args,
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).spawn().status;
    if (!status.success) {
      console.warn("The browser did not open automatically; use the printed URL.");
    }
  } catch {
    console.warn("No system browser opener was available; use the printed URL.");
  }
}

function browserCommand(url: string): { readonly executable: string; readonly args: string[] } {
  switch (Deno.build.os) {
    case "darwin":
      return { executable: "open", args: [url] };
    case "windows":
      return {
        executable: "rundll32",
        args: ["url.dll,FileProtocolHandler", url],
      };
    default:
      return { executable: "xdg-open", args: [url] };
  }
}

function htmlResponse(title: string, message: string, status: number): Response {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>${title}</title>` +
      `<body><main><h1>${title}</h1><p>${message}</p></main></body></html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

async function shutdown(
  server: { shutdown(): Promise<void>; finished: Promise<void> },
  abort: AbortController,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      server.shutdown().catch((error) => {
        if (!(error instanceof Deno.errors.BadResource)) throw error;
      }),
      new Promise<void>((resolve, reject) => {
        timeout = setTimeout(() => {
          try {
            abort.abort();
          } catch (error) {
            if (!(error instanceof Deno.errors.BadResource)) {
              reject(error);
              return;
            }
          }
          resolve();
        }, 2_000);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    await server.finished.catch((error) => {
      if (
        !(error instanceof Deno.errors.BadResource) &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) throw error;
    });
  }
}
