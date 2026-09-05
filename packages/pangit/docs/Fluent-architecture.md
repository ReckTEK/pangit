# Fluent architecture

The universal contract and its provider implementations have separate dependency boundaries:

```text
src/fluent-client/                 Provider catalog and async createClient factory
  └─ dynamic import ─► fluent-providers/<provider>/mod.ts
                         ├─ implements ─► fluent-api/adapter-contract/
                         ├─ composes ───► fluent-api/client/
                         └─ dynamic import ─► generated-rest-clients/<provider>/<version>/
```

`fluent-api/` contains portable contracts and behavior. It imports no concrete provider, provider
catalog, or generated provider client. Providers never import each other. Each provider owns its
versions, capability declarations, authentication, extension validation, native payload mappings,
and transport. Operation folders expose `mod.ts` barrels; `create-adapter.ts` composes their
contract implementations.

## Construction and loading

```ts
import { createClient } from "@mannsion/pangit/api";

const connection = await createClient("gitlab", "19.3.1", "https://gitlab.example.com");
const git = await connection.auth.token(token);
```

`createClient` is asynchronous. Awaiting it loads only the selected provider implementation, with no
network request. Its generated REST client loads on the first operation that needs that exact
version. Authentication returns a separate immutable client.

A provider can also be imported independently of the catalog:

```ts
import { createClient } from "@mannsion/pangit/fluent/gitea";

const connection = createClient("1.27.2", { baseUrl: "https://git.example.com/api/v1" });
```

The standalone entry already imports its implementation, so its factory is synchronous. Its
version-specific REST transport remains lazy.

## Provider extensions

Portable operations retain portable inputs. Extra options live behind the selected provider's
explicit operation callback, such as `operation.gitea(...)`, `operation.gitlab(...)`, or
`operation.forgejo(...)`. Raw access uses `client.native.gitlab(({ client }) => ...)`; entity native
callbacks also expose the original response payload. Both preserve the exact selected version's
generated types.

Provider-specific types are exported from `@mannsion/pangit/fluent/<provider>`. They are not
exported from the universal API. Provider-owned `registration.ts` files augment the abstract type
registries; these imports are erased at runtime. Runtime extension availability and validation live
beside the provider's extension types.

## Adding a provider

1. Add a standalone folder with `versions.ts`, `registration.ts`, and `mod.ts`.
2. Implement `GitHostAdapter` through concern modules; compose them in `create-adapter.ts`.
3. Register native type families and operation extensions in that provider's `registration.ts`.
4. Add its dynamic loader and type-only registration at the `fluent-client/` composition boundary.
5. Add its standalone package export, contract tests, and exact-version loading checks.

The universal contract needs no concrete provider names or switches. Architecture tests reject
cross-provider dependencies, provider leakage into the core, static runtime import cycles, and
oversized implementation modules. Fresh-process coverage tests verify actual module evaluation
before selection, after selection, and after native access.

Hosted deployments use provider-local configuration. For example, `createCodebergClient(version)`
selects Forgejo with Codeberg URLs; it does not introduce a second fluent implementation.
