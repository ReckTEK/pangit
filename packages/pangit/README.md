# PanGit

PanGit is a typed TypeScript library for Git-hosting providers. Its fluent API provides
provider-neutral workflows, while generated provider clients preserve each provider's native API.

## Imports

Import the package as a namespace so the fluent API stays visually distinct from direct provider
client creation:

```ts
import * as PanGit from "@mannsion/pangit";
```

| Entry point                                       | Purpose                                                    |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `PanGit.api`                                      | Provider-neutral fluent API and authentication.            |
| `PanGit.createProviderClient`                     | Lazily create one generated provider/version client.       |
| `@mannsion/pangit/api`                            | Direct import of the fluent API.                           |
| `@mannsion/pangit/providers/<provider>/<version>` | One generated provider-native client and its native types. |

Create a provider-neutral fluent client:

```ts
const git = PanGit.api.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});

const authorized = await git.auth.token({ token: "example" });
```

Create exactly one provider-native client without evaluating the other providers:

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

Fluent types live under `PanGit.api`. Generated provider-native types live with the selected
provider/version module. The root does not spill authentication, transport, or provider types.

Each provider/version implementation is loaded only after `PanGit.createProviderClient` selects it.
Importing PanGit does not eagerly import every generated client.

## Source layout

```text
src/
├── api/        Authored fluent API and authentication
├── providers/  Generated clients, lazy factory, contracts, and Fetch runtime
└── mod.ts      Minimal public barrel
```

Generator-owned provider/version directories contain a `.generated` ownership marker. Changes inside
those directories are replaced on generation. Generated provider code is self-contained under
`src/providers` and never imports authored code outside that tree. Tests, Docker assets, reports,
codegen, and repository documentation are outside the package publish set.

PanGit is licensed under the MIT License.
