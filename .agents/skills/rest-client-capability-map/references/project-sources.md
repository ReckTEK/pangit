# Project sources and inventory

## Source responsibilities

Paths below are relative to this module root, not the outer BranchPress checkout. Read
`codegen/workspace.ts` if package locations have moved.

| Source                                                                                  | Responsibility                                                                                          | What it cannot establish alone                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `codegen/specs/providers.json`                                                          | All configured provider IDs, versions, selected releases, source URLs, naming metadata                  | The contents of the fetched snapshot                            |
| `codegen/specs/raw/manifest.json`                                                       | Fetched raw paths, byte counts, checksums, version/ref provenance, artifact locations                   | Semantic equivalence                                            |
| `codegen/specs/raw/<provider>/<version>.*`                                              | Original source contract, descriptions, provider extensions                                             | Actual generated public method names                            |
| `codegen/specs/normalized/<provider>/<version>.json`                                    | OpenAPI 3.0.3 operations and request/response schemas used by generation                                | Current deployed service behavior                               |
| `codegen/generator/operations.ts`                                                       | `collectOperations`: effective operation models, inherited parameters/security, original operation keys | A semantic mapping between providers                            |
| `codegen/generator/render.ts`                                                           | `describeClientOperations`: exact emitted method names and original schema collection/path              | Full request/response detail in its descriptors                 |
| `codegen/generator/public-names.json`                                                   | Reviewed naming locks for selected versions                                                             | A complete operation list for older versions                    |
| `packages/pangit/src/generated/<provider>/<version>/client.ts`                          | Actual callable methods, typed inputs/responses, native operation registries                            | Capabilities absent from this snapshot                          |
| `packages/pangit/src/generated/mod.ts`                                                  | Registered providers, versions, selection, lazy client loaders                                          | Only selected versions being in scope                           |
| `packages/pangit-site/app/documentation/generated/<provider>/<version>/operations.json` | A compact method/route index                                                                            | Full descriptions: the docs generator deliberately removes them |
| `packages/pangit-site/app/documentation/generated/<provider>/<version>/openapi.json`    | Published schema copy for navigation                                                                    | A separate provider or extra operation inventory                |
| `packages/pangit/src/rest/mod.ts` and its sibling modules                               | Shared transport, cancellation, serialization, raw-fetch escape hatch                                   | Provider capabilities merely because generic HTTP can be sent   |

The raw manifest's `destination` and `artifacts.normalized` are module-relative. Its
`artifacts.client` begins with `src/generated/` and is **package-relative**. Do not look for it in
the module root's nonexistent `src/generated/`.

Use both schemas and clients where available. Schema descriptions and recursively referenced shapes
establish behavior; the generated class establishes which function users actually call. Type names,
transport helpers, constructors, metadata exports, example functions, and test utilities are not
additional provider REST operations. Do not use raw `fetch` to invent a missing typed-client method.

## Current snapshot guide, not a fixed denominator

Observed during skill creation on 2026-08-28; recompute on every run:

| Scan order | Provider     | Version          | Operations |
| ---------- | ------------ | ---------------- | ---------: |
| 1          | Gitea        | 1.27.2, selected |        482 |
| 2          | Gitea        | 1.26.4           |        471 |
| 3          | Codeberg     | latest           |        506 |
| 4          | GitHub       | latest           |      1,222 |
| 5          | GitLab       | 19.3.1, selected |      1,148 |
| 6          | GitLab       | 18.11.11         |      1,126 |
| 7          | Bitbucket    | latest           |        297 |
| 8          | Azure DevOps | latest           |        112 |

This snapshot has 6 providers, 8 clients, and 5,364 operations. Restricting to selected versions
would drop 1,597 operations from the requested all-client analysis. The helper discovers new
providers and versions rather than relying on this table.

### Gitea

Start with `providers.gitea.selected`, then visit every other Gitea version. Never combine versions
by method name without reviewing schema differences. The 1.26.4 raw source is a Swagger-era source
while the normalized source has the common OpenAPI shape; use the normalizer for provenance
questions. Saved E2E results describe test execution, not complete semantic equivalence or evidence
that a different provider can perform the same task.

### Codeberg

The checked-in Codeberg source is a Forgejo schema with Gitea ancestry, not an alias of either Gitea
client. Its observed `info.version` is `16.0.0-dev-714-11075108+gitea-1.22.0`. Similar methods are
good search candidates; compare inputs, scope, feature flags, and results independently. A `latest`
folder does not grant permission to refresh it during analysis.

### GitHub

Use the checked-in REST specification and its generated client, not GraphQL or a general GitHub
feature list. Tags and operation IDs often provide useful domain vocabulary, but the callable names
come from the generator's allocation rules. Separate repository, organization, enterprise, and user
scope even where their resource names resemble one another.

### GitLab

Include both configured versions. The selected-version public-name lock omits six source operations
present in the observed older client; `describeClientOperations` allocates their real fallback
names. Do not filter inventory by lock membership. Optional route groups and wildcard segments are
material: the selected schema has 81 such operations. Keep original schema paths alongside
normalized request paths. A GitLab “project” is a candidate for a repository task, not automatic
equivalence to another provider's planning project or organization container.

### Bitbucket

This source is **Bitbucket Cloud**, not Bitbucket Server/Data Center. Keep workspace, project, and
repository scopes distinct. Inspect pagination and filtering contracts instead of assuming that
similar list/search operation names imply the same reachable result set.

### Azure DevOps

The configured source covers **Azure DevOps Git**, observed schema version `7.2-preview`, not every
Azure DevOps service. An absent build, work-item, or organization operation is a boundary of this
raw client inventory, not proof that Azure DevOps lacks the product feature.

The observed 112 operations include 108 under `paths` and **4 under `x-ms-paths`**. Some variants
share the same normalized verb and path. Preserve the original collection and query-bearing path; do
not deduplicate by `METHOD + normalizedPath`. Compare `api-version`, selector queries, optional
scope, body variants, and async response semantics.

## Stable identities and exact names

The generator's key is:

```text
<collection>:<lowercase HTTP method>:<original schema path>
```

The skill's globally unique operation ID is:

```text
<provider>@<version>::<generator operation key>
```

For example, `gitea@1.27.2::paths:get:/repos/{owner}/{repo}` identifies a particular source
operation, not a normalized task. Preserve source collection, case, query selectors, and path
punctuation.

Use `describeClientOperations(document, publicNames.providers[provider])` to find the actual public
method name. Do not camel-case `operationId` yourself, lowercase names for joining, or strip hash
suffixes. The naming allocator handles collisions, reserved names, truncation, and version fallback.

The inventory helper also imports operation metadata and inspects class prototypes. It does not
construct a client or make a request. Cross-check:

```text
schema source keys <-> descriptors <-> operation registry keys <-> generated class methods
```

Preserve mappings even if public method names differ between versions. Published documentation
copies, tests, and multiple exports of one class do not add extra operations to the count.

## Inventory output and evidence

`scripts/inventory.ts` emits:

- `sourceFingerprint`: deterministic SHA-256 fingerprint of source manifests and client/spec bytes.
- `providers`: ordered IDs, display names, and selected versions.
- `clients`: every versioned client, operation count, class/registry names, source paths and hashes.
- `operations`: stable IDs, exact methods, native operation models, and source pointers/line
  numbers.

The fingerprint does not include shared transport, normalizer implementations, or external
documentation. If those sources support a semantic conclusion, record their hashes/provenance in the
checkpoint as specified in `ledger-and-workbook.md` and recheck them separately.

Full component schemas remain in the normalized files. Follow `$ref` targets there; an inventory
record is an entry point, not a replacement for reading referenced bodies and responses. The helper
emits a JSON Pointer beginning `/paths/` or `/x-ms-paths/`; prepend `#` for a document-fragment
link.

For each semantic decision, save the normalized file plus JSON Pointer, the client method line, and
the decisive description/field/response fact. If raw normalization changes matter, cite the raw file
and normalizer too. For external clarification, record the official URL, relevant version/section,
and whether it confirms the checked-in contract or only provides contextual evidence.

Do not assert current hosting behavior from schemas. Use “not represented in the analyzed client
snapshot” for inventory absence; reserve “documented unsupported” for explicit version-matched
evidence. Missing descriptions, unresolved references, and contradictory sources remain open issues.

## Local skill location

This skill is repository-scoped under `.agents/skills/rest-client-capability-map`, consistent with
[Codex local skill discovery](https://developers.openai.com/codex/skills#where-to-save-skills).
