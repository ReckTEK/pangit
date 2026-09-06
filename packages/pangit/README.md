# PanGit

![PanGit — baby Git providers cooking together in a pan — @recktek/pangit](https://raw.githubusercontent.com/ReckTEK/pangit/main/packages/pangit/docs/images/pangit-banner.png)

PanGit by ReckTEK provides one fluent TypeScript API for Git hosting workflows, alongside generated
REST clients that preserve each provider's request fields, response bodies, status codes, and API
version.

> [!IMPORTANT]
> **Status: alpha development.** Fluent and raw REST APIs are live-tested for Gitea, GitLab, and
> Forgejo. GitLab has
> [explicit capability gaps and confirmed server defects](https://github.com/ReckTEK/pangit/blob/main/packages/pangit/docs/GitLab.md#provider-differences).
> Raw clients are generated for every provider below. Public APIs may change between alpha releases.

## Install

```bash
deno add jsr:@recktek/pangit@0.1.0-alpha.3
```

Use Deno 2 and select the alpha version explicitly; stable version ranges do not include
prereleases. The command registers `@recktek/pangit` for the imports below. See
[available versions](https://jsr.io/@recktek/pangit/versions) on JSR.

[Deno 2.9+ waits 24 hours](https://docs.deno.com/runtime/packages/supply_chain/#minimum-dependency-age)
before installing new releases by default. To install a trusted release sooner, add
`--minimum-dependency-age=0` to that `deno add` command.

## Documentation

From the source workspace root, run `deno task generate:pangit-site` and `deno task dev` to open
[the handbook](http://localhost:5173/docs). The fluent guides cover setup, all repository workflows,
authentication, pagination, errors, and provider differences. The same site includes searchable
method indexes and interactive OpenAPI references for every generated REST client.

## Create a client

```ts
import * as PanGit from "@recktek/pangit";

const token = Deno.env.get("GITEA_TOKEN");
if (!token) throw new Error("Set GITEA_TOKEN.");

const gitea = await PanGit.createProviderClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { Authorization: `token ${token}` },
});

const response = await gitea.userGetCurrent();
if (!response.documented || !response.ok) {
  throw new Error(`Gitea returned ${response.status}`);
}

console.log(response.body.login);
```

Selecting a provider and API version loads only that generated client. The version selects the
provider contract; it is separate from the PanGit package version.

Pass a base URL directly when no other client options are needed:

```ts
const gitea = await PanGit.createProviderClient(
  "gitea",
  "1.27.2",
  "https://git.example.com/api/v1",
);
```

## Standalone fluent providers

The async `PanGit.api.createClient(provider, version, options)` factory loads only the selected
provider implementation. Its generated REST client loads only when an operation needs it. Each
provider can also be imported directly:

```ts
import { createClient } from "@recktek/pangit/fluent/gitea";

const connection = createClient("1.27.2", { baseUrl: "https://git.example.com/api/v1" });
```

The direct factory is synchronous because that provider is already imported. Provider-specific
extension and native types are exported from its own `fluent/<provider>` entry point.

## Fluent file reads

The provider-neutral fluent API supports Gitea, GitLab, and Forgejo. This example uses Gitea; see
the [GitLab guide](https://github.com/ReckTEK/pangit/blob/main/packages/pangit/docs/GitLab.md) for
its versions, setup and capability differences:

```ts
const connection = await PanGit.api.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});
const git = await connection.auth.token(token);
const owner = await git.container("acme");
const repository = await owner.repository("website");

const image = await repository.content.readBlob("logo.png", { ref: "main" });
console.log(image.type, image.size); // image/png, size in bytes

// Response uses the Blob's MIME type automatically. Open http://127.0.0.1:8000 to see the image.
Deno.serve({ hostname: "127.0.0.1", port: 8000 }, () => new Response(image));
```

Run with Deno's network and environment permissions, then open `http://127.0.0.1:8000` to view the
image. The Blob is fetched once; serving it requires no further provider requests.

`readText()`, `readBytes()`, and `readJson()` are also available. Loaded content has synchronous
`text()`, `json()`, `arrayBuffer()`, and `blob()` conversions with no further requests. Web Blob
MIME resolution uses a reliable provider type, then the standard filename-extension registry;
unresolved types throw `PanGit.api.errors.ContentReadError`. Supply `{ type: "image/png" }` to
override the type or a `fileName` hint when reading a filename-free Git blob with
`repository.blobs.readBlob(sha, options)`.

For Forgejo and Codeberg setup, version differences, and Docker E2E, see the
[Forgejo guide](https://github.com/ReckTEK/pangit/blob/main/packages/pangit/docs/Forgejo.md).

## Provider clients

| Provider           | Key            | API versions         |
| ------------------ | -------------- | -------------------- |
| Gitea              | `gitea`        | `1.26.4`, `1.27.2`   |
| Forgejo            | `forgejo`      | `15.0.7`, `16.0.3`   |
| GitLab             | `gitlab`       | `18.11.11`, `19.3.1` |
| GitHub             | `github`       | `latest`             |
| Codeberg (Forgejo) | `codeberg`     | `latest`             |
| Bitbucket Cloud    | `bitbucket`    | `latest`             |
| Azure DevOps Git   | `azure-devops` | `latest`             |

`latest` identifies the checked-in specification snapshot used to generate that client. It does not
download or negotiate a newer contract at runtime.

The package root exports the lazy `createProviderClient` factory. Exact generated clients and their
native types are also available through provider/version entry points:

```ts
import { GiteaRestClient, type GiteaUser } from "@recktek/pangit/providers/gitea/1.27.2";
```

## Response model

Calls return typed response envelopes. Documented status codes narrow to their generated body and
header contracts; undocumented responses remain visible instead of being silently coerced into a
documented shape. Request options include headers, cancellation, transport hooks, and the generated
operation's native path, query, and body inputs.

## Generated source

```text
src/generated-rest-clients/
├── runtime/                  shared Fetch transport and response handling
├── <provider>/<version>/     generated client, operations, and native types
├── create-rest-client.ts     lazy provider/version factory
└── mod.ts                    generated provider/version registry
```

Generated clients are rebuilt from checked-in OpenAPI inputs with `deno task generate --cached` at
the repository root. Do not edit `src/generated-rest-clients/` directly.

PanGit is licensed under the [MIT License](LICENSE). Upstream schema sources, license status, and
available license texts are included in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
