# PanGit

PanGit provides generated, typed TypeScript REST clients for Git hosting providers. Each client
preserves its provider's request fields, response bodies, status codes, operation names, and API
version.

> [!IMPORTANT]
> **Status: alpha development.** The fluent API is implemented and live-tested for Gitea only. Raw
> REST clients are generated for every provider listed below, with live E2E coverage for Gitea. The
> package is not published to JSR yet.

## Use from source

```bash
git clone https://github.com/mannsion/pangit.git
cd pangit
deno task check
```

## Create a client

```ts
import * as PanGit from "@mannsion/pangit";

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

## Fluent file reads

The provider-neutral fluent API currently supports Gitea:

```ts
const connection = PanGit.api.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});
const git = await connection.auth.token(token);
const owner = await git.container("acme");
const repository = await owner.repository("website");

const readme = await repository.content.readText("README.md", { ref: "main" });
const image = await repository.content.readBlob("logo.png", { ref: "main" });
console.log(readme, image.type, image.size); // image is a standard web Blob
```

`readBytes()` and `readJson()` are also available. Loaded content has synchronous `text()`,
`json()`, `arrayBuffer()`, and `blob()` conversions with no further requests. Web Blob MIME
resolution uses a reliable provider type, then the standard filename-extension registry; unresolved
types throw `PanGit.api.errors.ContentReadError`. Supply `{ type: "image/png" }` to override the
type or a `fileName` hint when reading a filename-free Git blob with
`repository.blobs.readBlob(sha, options)`.

## Provider clients

| Provider           | Key            | API versions         |
| ------------------ | -------------- | -------------------- |
| Gitea              | `gitea`        | `1.26.4`, `1.27.2`   |
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
import { GiteaRestClient, type GiteaUser } from "@mannsion/pangit/providers/gitea/1.27.2";
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
