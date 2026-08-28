# Set up the raw client

[All examples](../../../../examples.md) ·
[Next: Create a private repository](../repository-setup/repository-setup.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 1 of 8**

Use PanGit from your own Deno project against an existing Gitea 1.27.2 instance. You need Deno, your
server's API URL, and a personal access token for your account.

## 1. Add the JSR package to your project

For this tutorial, assume the package is published on JSR as `@mannsion/pangit`. Start in an empty
directory, or run the `deno add` command in your existing Deno project:

```bash
mkdir -p my-gitea-workflows
cd my-gitea-workflows
deno add jsr:@mannsion/pangit
```

`deno add` records the dependency in your project's `deno.json`. The TypeScript imports below use
the resulting `@mannsion/pangit` alias. Run all tutorial commands from this project directory, and
save the example files here. You do not need a checkout of the package source.

## 2. Point it at your Gitea instance

Replace the URL and username below. The API URL must include `/api/v1`; an instance served under
`/gitea` would use `https://example.com/gitea/api/v1`.

```bash
export GITEA_API_URL='https://git.example.com/api/v1'
read -rs -p 'Gitea token: ' GITEA_TOKEN
echo
export GITEA_TOKEN

export GITEA_OWNER='your-user'
export GITEA_REPO='client-examples'
```

These commands use Bash. Paste your existing token at the prompt. Keep this terminal open so later
commands inherit the variables. `GITEA_OWNER` and `GITEA_REPO` identify the repository for later
lessons; the first request only needs the API URL and token.

## 3. Make your first raw client request

Save this as [`check-connection.ts`](check-connection.ts) in your project:

```ts
import { loadRestClient, unwrapRestResponse } from "@mannsion/pangit";

const baseUrl = Deno.env.get("GITEA_API_URL");
const token = Deno.env.get("GITEA_TOKEN");
if (!baseUrl || !token) throw new Error("Set GITEA_API_URL and GITEA_TOKEN.");

const client = await loadRestClient("gitea", "1.27.2", {
  baseUrl,
  headers: { Authorization: `token ${token}` },
});

const result = await client.userGetCurrent();
const user = unwrapRestResponse(result);
console.log({ status: result.status, login: user.login });
```

`loadRestClient("gitea", "1.27.2", …)` selects the Gitea 1.27.2 API client and infers its methods
and types. `1.27.2` is the **Gitea API version**, not the JSR package version. Authentication is
sent as Gitea's `Authorization: token …` header.

Run the file with permission to read the environment and contact your server:

```bash
deno run --allow-env=GITEA_API_URL,GITEA_TOKEN --allow-net check-connection.ts
```

A successful request prints status `200` and the login belonging to your token:

```text
{ status: 200, login: "your-user" }
```

This request reads your account; it creates or changes nothing on the server.

## 4. Understand the raw request and response

The client exposes Gitea operations directly, such as `userGetCurrent` and `repoCreatePullRequest`.
Methods accept `path` for route parameters, `query` for query parameters, and
`body: { mediaType, value }` for request bodies. The later lessons show each of these in use.

A method returns a response envelope with `status`, `body`, `documented`, `ok`, `headers`, and the
native `response`. `unwrapRestResponse(result)` returns the typed body of a documented success. It
throws `RestApiError` for a non-2xx response and `RestUndocumentedResponseError` for an undocumented
success. A thrown HTTP error retains the envelope in its `result` property.

When an HTTP outcome is part of the workflow, inspect `result.status` before unwrapping. The
[content PR lesson](../content-pull-requests/content-pull-requests.md) uses a missing file's `404`
to choose between creating and updating it.

## 5. Reuse the connection in the remaining lessons

Save the following four TypeScript blocks, in order, as [`client.ts`](client.ts) beside
`check-connection.ts`. These are small helpers you own in your application; only `loadRestClient`
and `unwrapRestResponse` come from the JSR package. Every later workflow imports the public
`unwrapRestResponse` helper from the package and the setup helpers from your local `./client.ts`.

### Read settings and require fields needed by later requests

`env` rejects a missing setting. Gitea's schema makes many response fields optional, so `required`
checks fields such as IDs before a later request uses them.

```ts
/** Save as client.ts in your own Deno project; these are tutorial helpers, not package exports. */
import { loadRestClient } from "@mannsion/pangit";

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined || value.trim() === "") {
    throw new Error(`Set ${name} before running this example.`);
  }
  return value;
}

/** Response fields are often optional in Gitea's schema, including IDs needed by later steps. */
export function required<T>(value: T | null | undefined, field: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Gitea did not return ${field}.`);
  }
  return value;
}
```

### Create a client for the selected server

Each request gets a fresh 30-second timeout. `repositoryPath()` reads the owner and repository you
selected in the shell. The returned client still exposes the provider's raw methods.

```ts
export function createClient() {
  return loadRestClient("gitea", "1.27.2", {
    // Include /api/v1 and any reverse-proxy prefix in this URL.
    baseUrl: env("GITEA_API_URL"),
    headers: { Authorization: `token ${env("GITEA_TOKEN")}` },
    headerForwarding: "same-origin",
    beforeRequest: (request) =>
      new Request(request, {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
      }),
  });
}

export function repositoryPath() {
  return { owner: env("GITEA_OWNER"), repo: env("GITEA_REPO") };
}
```

### Read all pages of a list

For operations that accept `page` and `limit`, continue until an empty page. A server may cap the
requested limit, so a page containing fewer than 50 items does not necessarily mean the list is
complete.

```ts
/** Stop on an empty page: a server may cap the requested page size. */
export async function* paginate<T>(
  readPage: (page: number, limit: number) => Promise<readonly T[]>,
): AsyncGenerator<T> {
  for (let page = 1;; page++) {
    const items = await readPage(page, 50);
    if (items.length === 0) return;
    yield* items;
  }
}
```

### Print large IDs without rounding them

The transport can return large `int64` IDs as `bigint`. Pass these values back to the client
unchanged; convert them to strings only when printing JSON.

```ts
/** Large int64 IDs can be bigint; stringify them without rounding or throwing. */
export function printJson(value: unknown): void {
  console.log(
    JSON.stringify(value, (_key, item) => typeof item === "bigint" ? String(item) : item, 2),
  );
}
```

Your project now contains `deno.json`, `check-connection.ts`, and `client.ts`. In each later lesson,
save that lesson's TypeScript blocks as its named file **beside `client.ts`**, then run the shown
command from your project directory. The folders in these docs organize the tutorials; you do not
need to recreate that folder tree in your application.

Continue with repository setup, or choose a workflow from the index. Each guide states its required
access, the changes it makes, and what happens when you run it again.

[All examples](../../../../examples.md) ·
[Next: Create a private repository](../repository-setup/repository-setup.md)
