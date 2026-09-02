# PanGit

PanGit is a typed TypeScript library for Git hosts. Its hand-written fluent API provides
Git-host-neutral workflows, while generated raw REST clients preserve each host's native API.

## Imports

Import the package as a namespace so the fluent API stays visually distinct from direct raw
REST-client creation:

```ts
import * as PanGit from "@mannsion/pangit";
```

| Entry point                                       | Purpose                                                    |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `PanGit.api`                                      | Git-host-neutral fluent API and authentication.            |
| `PanGit.createProviderClient`                     | Lazily create one generated raw REST client.               |
| `@mannsion/pangit/api`                            | Direct import of the fluent API.                           |
| `@mannsion/pangit/providers/<provider>/<version>` | One generated provider-native client and its native types. |

Create a provider-neutral fluent client:

```ts
const git = PanGit.api.createClient(
  "gitea",
  "1.27.2",
  "https://git.example.com/api/v1",
);

const authorized = await git.auth.token("example");

const container = await authorized.container("acme");
const repositories = await container.repositories();
const repository = await container.repository("website");
const existing = await container.findRepository("optional-repository");
const exists = await container.hasRepository("website");
```

A repository container is the Git host's repository-owning scope: a Gitea user or organization,
GitHub organization, GitLab group, Bitbucket workspace, Azure DevOps project, or equivalent. Exact
lookup and existence checks call the hand-written Git-host adapter directly; they do not download
every repository first.

Create exactly one raw REST client without evaluating the other Git hosts:

```ts
import * as PanGit from "@mannsion/pangit";

const publicGitea = await PanGit.createProviderClient(
  "gitea",
  "1.27.2",
  "https://git.example.com/api/v1",
);
```

Pass full client options when you need authentication or transport controls:

```ts
const gitea = await PanGit.createProviderClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { authorization: "token example" },
});

const response = await gitea.userGetCurrent();
```

Fluent types live under `PanGit.api`. Generated native types live with the selected Git-host/version
module. The root does not spill authentication, transport, or raw-client types.

Each Git-host/version implementation is loaded only after `PanGit.createProviderClient` selects it.
Importing PanGit does not eagerly import every generated client.

## Source layout

```text
src/
├── fluent-api/             HAND-WRITTEN portable API and authentication
├── git-host-adapters/      HAND-WRITTEN translations to host-specific APIs
├── generated-rest-clients/ GENERATED FROM OPENAPI, including Fetch runtime
└── mod.ts                  Minimal public barrel
```

`src/generated-rest-clients/` contains a `.generated` ownership marker and is replaced on
generation. The generator never writes `src/fluent-api/` or `src/git-host-adapters/`. Generated
raw-client code is self-contained and never imports either hand-written tree. Tests, Docker assets,
reports, codegen, and repository documentation are outside the package publish set.

PanGit is licensed under the MIT License.
