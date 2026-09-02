# PanGit

PanGit provides generated, typed TypeScript REST clients for Git hosting providers. Each client
preserves its provider's request fields, response bodies, status codes, operation names, and API
version.

## Install

```bash
deno add jsr:@mannsion/pangit
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

PanGit is licensed under the MIT License.
