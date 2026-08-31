# PanGit

PanGit is a typed TypeScript library for Git-hosting providers. It combines a small handwritten API
with provider-native REST clients generated from reviewed API specifications.

## Imports

The package exposes a small high-level surface plus explicit raw-provider entry points:

| Import                                        | Purpose                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `@mannsion/pangit`                            | Managed client, authentication helpers, and the lazy raw-client loader. |
| `@mannsion/pangit/auth`                       | Provider authentication contracts and flows.                            |
| `@mannsion/pangit/providers`                  | Provider/version metadata and typed lazy REST-client loading.           |
| `@mannsion/pangit/providers/<name>/<version>` | One provider-native generated REST client.                              |
| `@mannsion/pangit/providers/runtime`          | Generated shared REST contracts and native-Fetch runtime.               |

Use the root entry for normal application code:

```ts
import { loadRestClient } from "@mannsion/pangit";

const gitea = await loadRestClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { authorization: "token example" },
});

const response = await gitea.userGetCurrent();
```

Each provider/version implementation is loaded only after `loadRestClient` selects it. Importing the
package or provider registry does not eagerly import every generated client.

## Source layout

```text
src/
├── auth/       Authored authentication contracts and flows
├── client/     Authored managed client API
├── providers/  Generated clients, lazy registry, contracts, and Fetch runtime
└── mod.ts      Definition-free root barrel
```

Generator-owned provider/version directories contain a `.generated` ownership marker. Changes inside
those directories are replaced on generation. Generated provider code is self-contained under
`src/providers` and never imports authored code outside that tree. Tests, Docker assets, reports,
codegen, and repository documentation are outside the package publish set.

PanGit is licensed under the MIT License.
