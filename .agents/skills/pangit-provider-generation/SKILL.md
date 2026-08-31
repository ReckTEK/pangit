---
name: pangit-provider-generation
description: Change PanGit REST providers, generated runtime contracts, provider exports, or provider E2E assets through the schema- and manifest-driven generator. Use when work touches codegen or packages/pangit/src/providers and must preserve self-contained output, one REST-client module per provider/version, barrel entrypoints, lazy loading, marker ownership, and package exclusion of E2E/Docker assets.
---

# PanGit Provider Generation

The generator owns complexity. Its output must be predictable, modular at the stable boundaries, and
safe for humans to import.

## Generated source contract

`packages/pangit/src/providers` is the only generated provider source root. There is no directory
named `generated`. Never hand-edit emitted files.

Each provider/version directory contains exactly:

```text
.generated
<Provider>RestClient.ts
mod.ts
```

- `<Provider>RestClient.ts` is the single generated OpenAPI client module for that version. Keep its
  operations and schema types together; do not explode one client into thousands of files.
- `mod.ts` contains only the generated notice and a re-export of that REST-client module.
- `.generated` states generator ownership. Publication may replace only marker-owned output and must
  not overwrite authored directories.

The generated root also owns focused registry/version/type modules and `runtime/`. Split reusable
base runtime contracts by stable concern where that improves navigation; do not split every
provider-native OpenAPI type.

## Hard dependency boundary

- Every import made by generated provider code resolves inside `src/providers`, including runtime
  types and transport. If generated code needs a dependency, generate it inside this tree.
- Authored client/auth code may depend on providers; providers never depend back on authored code.
- Keep the generator's dependency-graph validation and non-literal dynamic-import rejection active.
  A typecheck alone does not prove this boundary.
- The generated registry uses one literal dynamic import per provider/version. Do not use eager
  provider imports, glob imports, or a central import that evaluates every client.

## Authorities and placement

- Change schemas, manifests, layout helpers, renderers, runtime templates, or test templates—the
  responsible generator source—not emitted output.
- `codegen/pangit/provider-layout.ts` owns package and E2E paths. The raw manifest owns
  provider/version artifact entries. Renderers fan output into those declared locations.
- `codegen/pangit/pangit-generator.ts` owns library generation.
  `codegen/pangit-site/pangit-site-generator.ts` owns site generation, and root
  `codegen/generate.ts` runs both in dependency order.
- Generated provider E2E/Docker suites live at `tests/providers/<provider>/<version>`, never under
  `packages/pangit`, `src/providers`, or the publish set.
- Generation owns suite assets but never runs Docker, reads or writes E2E results, publishes result
  Markdown, or rewrites a README. `tests/e2e-runner.ts` owns fresh containers, manifest-authorized
  raw results, complete-tree Markdown replacement, and validation of human-authored README links.
- Raw evidence lives at `tests/providers/<provider>/<version>/results/`; deterministic Markdown
  lives at `packages/pangit/docs/test-results/<provider>/<version>/test-result.md`. Both roots
  require their E2E ownership markers, and a successful E2E publication must leave no obsolete files
  or directories.
- Package export generation points `providers/<provider>/<version>` subpaths to each generated
  barrel while keeping `createProviderClient` deferred. Generated runtime modules and a bare
  `providers` barrel are not public package paths.
- `createProviderClient(provider, version, input)` accepts a base URL string/URL for the common case
  and full generated client options or an existing transport for advanced use.

## Change and prove generation

For a provider-output-only change, avoid unrelated documentation/site churn:

```bash
deno eval 'import { generateRestClients } from "./codegen/pangit/generator/rest-client-generator.ts"; await generateRestClients();'
deno eval 'import { generateRestClients } from "./codegen/pangit/generator/rest-client-generator.ts"; await generateRestClients({ check: true });'
deno check --config deno.json codegen/pangit/generator/rest-client-generator.ts
deno task --cwd packages/pangit build
deno task --cwd packages/pangit lint
(cd packages/pangit && deno publish --dry-run --allow-dirty)
```

Verify the generated tree contains one marker, one client module, and one barrel per version; every
generated `mod.ts`/`index.ts` is definition-free; the provider graph never leaves `src/providers`;
and the registry retains the expected literal lazy loaders. Respect explicit instructions not to run
tests, Docker, full generation, or documentation work.
