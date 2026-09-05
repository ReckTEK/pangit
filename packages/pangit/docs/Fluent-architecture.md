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
import { createClient } from "@recktek/pangit/api";

const connection = await createClient("gitlab", "19.3.1", "https://gitlab.example.com");
const git = await connection.auth.token(token);
```

`createClient` is asynchronous. Awaiting it loads only the selected provider implementation, with no
network request. URL and default-query options are copied before the provider import yields. Its
generated REST client loads on the first operation that needs that exact version. Authentication
returns a separate immutable client.

A provider can also be imported independently of the catalog:

```ts
import { createClient } from "@recktek/pangit/fluent/gitea";

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

Deferred operations copy their inputs when constructed, including file bytes. Extension callbacks
receive copied context and return structured-cloneable option data; nested records and arrays are
copied and frozen when configured. Later changes to caller-owned inputs cannot change the prepared
operation. Cancellation signals are supplied to `execute({ signal })`.

Provider-specific types are exported from `@recktek/pangit/fluent/<provider>`. They are not exported
from the universal API. Each implementation declares its versions, operation extensions, and native
type families in `provider-types.ts`, then supplies that definition to the shared contract's
`TRegistry` parameter. Native families retain the selected version through a type-level mapping.
Importing a provider never changes the universal contract or another provider's types.

The `fluent-client/provider-types.ts` composition combines these definitions using type-only
imports. Its `contracts/` barrel binds the registry for public types such as
`Repository<Provider, Version>`; its `auth/` factories bind the same registry for shared
authentication helpers. Callers never need to provide the registry themselves. Contract bindings are
erased at runtime; authentication factories delegate to the shared helpers. Runtime extension
availability and validation remain beside each provider's extension types.

Module and global augmentation are prohibited, including by JSR. Architecture tests enforce this
constraint and check that each standalone provider's complete type graph excludes other providers.

Pagination cursors retain the provider page size so continuation cannot skip or repeat offsets.
Bounded scans reject `maxItems` below that size before starting HTTP. Invalid, backward, or empty
continuations fail with provider evidence. Concurrent reads cancel sibling requests on failure and
retain the first error.

Contributor aggregation groups authors by case-insensitive email, falling back to exact name when
email is absent. Missing identities are omitted; the first occurrence supplies display fields.

## Adding a provider

1. Add a standalone folder with `versions.ts`, `provider-types.ts`, and `mod.ts`.
2. Implement `GitHostAdapter` through concern modules; compose them in `create-adapter.ts`.
3. Define its versions, native type families, and operation extensions in `provider-types.ts`;
   supply that definition to its shared contract types.
4. Add its dynamic loader and type-only definition at the `fluent-client/` composition boundary.
5. Add its standalone package export, contract tests, and exact-version loading checks.

The universal contract needs no concrete provider names or switches. Architecture tests reject
cross-provider dependencies, provider leakage into the core, static runtime import cycles, and
oversized implementation modules. Fresh-process coverage tests verify actual module evaluation
before selection, after selection, and after native access.

Hosted deployments use provider-local configuration. For example, `createCodebergClient(version)`
selects Forgejo with Codeberg URLs; it does not introduce a second fluent implementation.
