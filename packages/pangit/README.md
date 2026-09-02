# PanGit

PanGit is a typed TypeScript library for Git hosts. It exposes two deliberately separate APIs:

| API                           | Use it for                                                   | Provider coverage                                            |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `PanGit.api`                  | Portable, immutable Git workflows through a provider adapter | Gitea 1.26.4 and 1.27.2                                      |
| `PanGit.createProviderClient` | The complete generated, provider-native REST surface         | Azure DevOps, Bitbucket, Codeberg, Gitea, GitHub, and GitLab |

The fluent API is not a renamed raw client. It defines shared behavior, bounded work, cancellation,
normalized errors, immutable entities, optional capability metadata, narrow provider extensions, and
typed native escape doors.

## Imports

Import the package as a namespace so portable and raw calls remain visually distinct:

```ts
import * as PanGit from "@mannsion/pangit";
```

| Entry point                                       | Purpose                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `PanGit.api`                                      | Fluent API, authentication, entities, contracts, errors, and support types |
| `PanGit.createProviderClient`                     | Lazy generated raw-client factory                                          |
| `@mannsion/pangit/api`                            | Direct fluent API import                                                   |
| `@mannsion/pangit/providers/<provider>/<version>` | One generated client and its exact native types                            |

## Fluent Gitea example

```ts
import * as PanGit from "@mannsion/pangit";

const connection = PanGit.api.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});
const git = await connection.auth.token("example-token");

const owner = await git.container("acme");
const repository = await owner.repository("website");

const branches = await repository.branches.list({ limit: 25 });
const readme = await repository.content.read("README.md", { ref: "main" });
const issues = await repository.issues.list({ state: "open", limit: 25 });
const profile = await git.currentUserProfile.current();

console.log(branches.items, readme.kind, issues.items, profile.username);
```

Repository-owning scopes are called containers: a Gitea user or organization today, and the
equivalent organization, group, workspace, or project when another fluent adapter is added.
`repository(name)`, `findRepository(name)`, and `hasRepository(name)` use direct lookup; they do not
list every repository and scan locally.

Every optional handle has frozen local support metadata. Reading `support` performs no feature
probe. Gitea reports deployments/environments and gists/snippets through
`git.unsupportedOptionalCapabilities.support` instead of exposing methods that cannot work.

## Generated raw client example

```ts
const gitea = await PanGit.createProviderClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { Authorization: "token example-token" },
});

const response = await gitea.userGetCurrent();
```

Raw calls retain generated request types, documented response unions, provider operation names, and
exact HTTP status behavior. Selecting one provider/version loads only that client.

## Architecture and ownership

```text
consumer
  -> hand-written fluent API
  -> universal GitHostAdapter concern contracts
  -> hand-written Gitea adapter
  -> selected generated Gitea REST client
  -> HTTP
```

```text
src/
├── fluent-api/             HAND-WRITTEN portable API and adapter contract
├── git-host-adapters/      HAND-WRITTEN provider implementations
├── generated-rest-clients/ GENERATED from checked-in OpenAPI inputs
└── mod.ts                  Small public barrel
```

The generator replaces only marker-owned generated clients, raw-client E2E suites, Docker
environments, and site artifacts. It never writes the fluent API, provider adapters, or hand-written
fluent contracts.

See the [fluent provider-adapter architecture](docs/fluent-api-provider-adapter-architecture.md) for
the complete 52-operation core inventory, optional Gitea capabilities, extensions, native doors,
request-cost rules, and generated-versus-authored E2E tree.

PanGit is licensed under the MIT License.
