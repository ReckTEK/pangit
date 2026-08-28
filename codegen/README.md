# Code generation

Start with [generate.ts](generate.ts). It lists the complete pipeline in execution order:
specifications, clients, documentation, E2E support, saved-result publication, and site assets.
These stages are functions; the public command remains `deno task generate`.

For a generator refactor, run `deno task generate --cached` from the repository root. It uses
checked-in specifications and does not start containers. The command without `--cached` refreshes
upstream inputs. Real provider execution remains a separate `deno task e2e`.

## Change the owner, regenerate the output

| Concern                                | Authored owner                                                                     | Derived output                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Providers, versions, and source URLs   | [specs/providers.json](specs/providers.json), [specs/sources.ts](specs/sources.ts) | Raw-spec manifest and downstream inventories                 |
| OpenAPI conversion                     | [specs/normalizers](specs/normalizers/mod.ts)                                      | `specs/normalized/`                                          |
| REST clients and lazy provider loaders | [generator/generate.ts](generator/generate.ts)                                     | `packages/pangit/src/generated/`                             |
| Documentation and tutorial catalog     | [docs/generate.ts](docs/generate.ts), package-authored guides                      | `packages/pangit/src/documentation/generated/`               |
| E2E scenarios and sandboxes            | [tests](tests/generate.ts), [docker/generate.ts](docker/generate.ts)               | Generated client test directories                            |
| Saved-result publication               | [reports/generate.ts](reports/generate.ts), [readme.ts](readme.ts)                 | Package Markdown reports and the root README results section |
| Site assets and route types            | [site/assets.ts](site/assets.ts), [site/routes.ts](site/routes.ts)                 | `packages/pangit-site/public/` and `.react-router/`          |

Output paths above are repository-relative. [workspace.ts](workspace.ts) resolves the configured
package locations. The site's React components, layouts, styles, and configuration are authored in
`packages/pangit-site/`; only its data/assets and route types are generated.

## Follow one client through the generator

1. [generate.ts](generator/generate.ts) coordinates the complete provider/version set.
2. [client-manifests.ts](generator/client-manifests.ts) validates inputs and the reviewed
   public-name allocations. [naming.ts](generator/naming.ts) owns deterministic identifier
   allocation.
3. [operations.ts](generator/operations.ts) collects provider-native operations, parameters, path
   groups, bodies, responses, security, and media policy from normalized OpenAPI.
4. [render.ts](generator/render.ts) renders client source, operation metadata, and the lazy loader
   registry. [schema.ts](generator/schema.ts) renders schema types.
5. [output.ts](generator/output.ts) formats and type-checks staged files before publishing them,
   preserving raw results and rolling back failed replacements.

The established exports in `generator/generate.ts` remain available to callers. Internal work
belongs in the module that owns it, not in another orchestration layer.

## Independent audit

[audit.ts](generator/audit.ts) coordinates an independent specification audit. Its
[operations](generator/audit/operations.ts), [media](generator/audit/media.ts), and
[document](generator/audit/document.ts) modules inspect use sites, wire branches, and schema facts;
the [model](generator/audit/model.ts) defines metrics and stable diagnostic ordering.

The audit's reviewed [media oracle](generator/media_oracle.ts) is deliberately independent of client
rendering. Do not DRY those policies into a shared implementation: that would let the same mistake
generate an output and approve it. Preserve provider-specific wire semantics, status/media
distinctions, and exact use-site diagnostics.

## Refactor checks

Run focused tests before and after moving a responsibility, then `deno task check`,
`deno task test`, and `deno task lint`. Cached regeneration should leave tracked generated artifacts
unchanged for a behavior-preserving refactor; repeat it to verify determinism. Client output, audit
inventories, saved E2E evidence, and site assets are separate proof surfaces. An unchanged generated
file is not a new live-provider E2E result.
