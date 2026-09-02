---
name: pangit-code-quality
description: Implement or refactor authored PanGit Deno/TypeScript with human-readable filenames, barrel-only entrypoints, explicit exports, generated-contract reuse, one-way provider dependencies, and a clean publish surface. Use for package architecture, auth/client work, module naming, imports, exports, or structural cleanup in this repository; generated provider output is handled by pangit-provider-generation.
---

# PanGit Code Quality

Keep `packages/pangit` understandable from Ctrl+P, import statements, and the published package.

## File and module shape

- `mod.ts` and `index.ts` are entrypoint barrels only: module comments, imports, and re-exports.
  Move every declaration, implementation, initialization, and side effect into a concern-named file.
- Name implementation files for the symbol or responsibility they own, such as `FluentClient.ts`,
  `oauth-handler.ts`, or `OAuthCallbackError.ts`. Avoid ambiguous names such as `core.ts`,
  `flow.ts`, `errors.ts`, or `utils.ts` when Ctrl+P would not reveal the concern.
- Keep one cohesive responsibility per module. Group tightly related contracts; do not create one
  file per trivial type, and do not hide unrelated concerns in a mega-file.
- Split unrelated error classes into files named for the error. Keep private helpers with their
  owner unless they have an independent consumer or lifecycle.

## Dependency direction

- Authored code may import generated contracts, registries, and runtime from `src/providers`.
  Nothing under `src/providers` may import authored code outside that tree. `src/providers` is
  immutable once generated, and updates to it must be made through the generator.
- Reuse generated provider/version/client types in the high-level API. Do not redeclare a type that
  can be derived from the manifest, schema, generated registry, or generated REST client.
- Keep provider implementations lazy. Runtime value imports must not eagerly load every provider;
  provider/version selection uses literal deferred imports.
- Select one provider adapter when the fluent client is created and delegate the whole domain
  contract to it. Provider endpoint names and mapping logic belong in that provider's adapter, not
  in shared entities or repeated per-operation switches.
- Keep reusable modules import-safe: importing PanGit must not start I/O, read environment state, or
  initialize a provider.

## Public and published shape

- Deno does not implicitly resolve a directory to `mod.ts` or `index.ts`. Every internal import and
  package export must name its target explicitly.
- Public root and subpath exports land on barrels; barrels re-export named implementation modules.
  Keep internal-only factories out of public barrels.
- The package root exports only the `api` namespace and `createProviderClient` factory. Fluent types
  stay under `api`; generated provider-native types stay in a provider/version module.
- Treat usability as a hard API constraint: singular nouns fetch real entities, plural nouns list
  them, verbs mutate them, and required identities are direct parameters. Do not expose generic
  `get`, `in`, container-locator, or terminal `execute` ceremony in fluent domain flows.
- Provider switches are optional `native` escape hatches. Only the branch matching the client's
  selected provider may execute; unselected branches must not load provider modules.
- Model the repository owner as a fetched `RepositoryContainer`: a user, organization, group,
  workspace, project, or provider equivalent. Repository listing is always container-scoped, never
  global or access-wide, and exact lookup/existence must use an efficient provider operation rather
  than listing every repository.
- All package runtime source lives under `packages/pangit/src`. Tests, generated E2E/Docker assets,
  reports, and maintainer documentation stay outside the published package.
- Add concise JSDoc to authored public abstractions and non-obvious boundaries. Do not hand-document
  emitted OpenAPI types or churn narrative documentation during code-only structural work.

## Working rule

Before editing, identify whether each touched file is authored or generator-owned and inspect its
callers and export path. Change only the responsible layer. For generated files, stop and use
`pangit-provider-generation`.

After an authored structural change, run the smallest relevant checks:

```bash
deno fmt --check packages/pangit/src
deno task --cwd packages/pangit build
deno task --cwd packages/pangit lint
(cd packages/pangit && deno publish --dry-run --allow-dirty)
```

Also inspect every in-scope `mod.ts`/`index.ts` for declarations and inspect the module graph for
imports escaping `packages/pangit/src`. Respect explicit instructions not to add or run tests,
Docker, documentation generation, or unrelated workspace gates.
