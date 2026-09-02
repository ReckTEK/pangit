# PanGit Gitea-First Fluent Provider Adapter Completion Plan

Status: complete\
Scope owner: `@mannsion/pangit`\
Provider implemented by this plan: Gitea 1.26.4 and 1.27.2\
Plan completion state: complete — implemented and live-proven on both pinned Gitea versions

## 1. Mission

Finish the high-level PanGit fluent API and its provider-adapter contract, then implement that
complete contract for Gitea. Work through this file in order. Every section ends with independent,
live Gitea E2E proof before it may be checked complete.

This plan covers:

- the 52 reviewed common-core methods;
- the already-public repository-container operations and authentication surface;
- the optional shared capability families identified by the API analysis;
- operation-specific Gitea extensions where Gitea has stronger behavior;
- typed Gitea native escape doors for functionality that does not belong in a shared contract;
- request efficiency, pagination, cancellation, error semantics, public exports, documentation,
  deterministic generation, and live proof on both supported Gitea versions.

This plan does **not** implement high-level adapters for Codeberg, GitHub, GitLab, Bitbucket, or
Azure DevOps. Their generated raw REST clients remain available. Their checked-in clients may be
read only when an optional capability's shared semantics must be verified; no external repository
survey is required.

“Finish the Gitea adapter” does not mean hand-wrapping every generated Gitea endpoint. The complete
generated client remains available through typed `native.gitea` doors. Adapter work is complete when
every advertised fluent operation is implemented and proven, every provider-only enhancement has an
intentional extension or native location, and no unsupported capability is advertised.

## 2. Definition of done

- [x] All 52 reviewed common-core methods have a stable universal contract.
- [x] All 52 common-core methods are implemented for Gitea 1.26.4 and 1.27.2, or a reviewed semantic
      correction is recorded when the old method map cannot satisfy its stated contract.
- [x] The existing repository slice is corrected to include fork-parent identity and arbitrary
      caller-supplied initial files.
- [x] Token, Basic/TOTP, and OAuth authentication work through the adapter boundary; universal auth
      contains no Gitea endpoint or header logic.
- [x] Lists are bounded and page-oriented. No default operation drains a whole collection.
- [x] Direct get/find/exists/delete operations use direct Gitea endpoints and never list then scan.
- [x] Composite operations declare and enforce limits, bounded concurrency, cancellation, and
      request budgets.
- [x] Every network operation accepts an `AbortSignal` through one trailing options object.
- [x] Only confirmed not-found responses become `undefined` or `false`; authorization and transport
      failures remain errors.
- [x] Optional capability support is static adapter/version metadata and performs no HTTP probing.
- [x] Every operation-specific Gitea extension is narrowly typed; it never hands a generic raw
      client to the extension callback.
- [x] Full exact-version raw access is available at the correct client, container, repository, and
      entity native scopes.
- [x] The public fluent provider type exposes only providers with implemented adapters; during this
      plan that set is `"gitea"`.
- [x] Every capability section has an independent hand-written contract and independent Gitea
      fixtures.
- [x] Each section passes live E2E on Gitea 1.26.4 and 1.27.2 before its completion box is checked.
- [x] The final unfiltered E2E run passes the generated raw REST-client suite and every hand-written
      fluent contract for both versions.
- [x] `deno task generate --cached` is deterministic and changes no hand-written adapter or test.
- [x] Format, check, lint, unit tests, public API tests, documentation tests, and publish dry-run
      all pass.

## 3. Authoritative inputs and change rules

Use these files as the design baseline:

1. `packages/pangit/docs/api-analysis/core.md` — reviewed common semantics.
2. `packages/pangit/docs/api-analysis/core-method-map.md` — reviewed native binding starting point.
3. `packages/pangit/docs/api-analysis/supplements.md` — optional and provider-only families.
4. `packages/pangit/docs/api-analysis/repository-containers-fluent-api.md` — implemented first
   slice.
5. The two checked-in generated Gitea clients — exact request/response truth for each version.
6. Live Gitea E2E — final runtime truth for behavior the OpenAPI documents do not prove.

Rules:

- [x] Do not edit the frozen API-surface tables in `core.md` or `api-analysis/README.md`.
- [x] Treat `core-method-map.md` as a reviewed baseline, not unquestionable runtime truth. Several
      more direct Gitea operations exist and are named in this plan.
- [x] Record a binding correction in this plan's decision log; do not silently rewrite historical
      analysis.
- [x] Never edit `packages/pangit/src/generated-rest-clients/**` by hand.
- [x] Never edit `tests/e2e/generated/**` by hand.
- [x] Generator code owns generated raw-client tests and generated Docker environments only.
- [x] Hand-written fluent contracts stay under `tests/e2e/hand-written/**`; regeneration must leave
      that entire tree byte-for-byte unchanged.
- [x] Preserve unrelated worktree changes.

## 4. Current verified baseline

The current code has three real layers:

```text
packages/pangit/src/
├── fluent-api/                    # hand-written universal API
├── git-host-adapters/gitea/       # hand-written Gitea implementation
└── generated-rest-clients/        # generated provider/version clients
```

The current adapter selects Gitea once and domain entities delegate to it. The good direct behavior
already present must be preserved:

- named repository lookup uses one `repoGet`;
- optional lookup and existence use one `repoGet`, with only HTTP 404 treated as absence;
- rename uses one `repoEdit`;
- delete uses one `repoDelete`;
- named container lookup does not enumerate every container;
- Gitea generated clients are loaded only for the selected provider/version.

The current universal adapter implements only these reviewed core operations:

- `listRepositories`
- `getRepository`
- `createRepository`
- `renameRepository`
- `deleteRepository`

It also implements container discovery/lookup, `findRepository`, `hasRepository`, token auth, and
container/repository native doors. Forty-seven reviewed core methods are absent.

Starting defects in the implemented slice, all resolved by this plan:

- [x] Added fork-parent identity to repository normalization.
- [x] Added arbitrary caller-provided initial files to repository creation.
- [x] Replaced eager `containers()` and `repositories()` drains with one-page results.
- [x] Made list continuation use provider pagination metadata rather than a short-page assumption.
- [x] Removed the exact-page-multiple empty request.
- [x] Added cancellation input to every networked fluent operation.
- [x] Rejected whitespace-only identities locally.
- [x] Added a stable fluent error taxonomy around raw transport failures.
- [x] Implemented Basic authentication and the narrow Gitea TOTP extension.
- [x] Moved Gitea OAuth endpoint and exchange mechanics into the Gitea adapter.
- [x] Made unsupported high-level providers fail during client creation.
- [x] Made fluent E2E fixtures independent from the generated raw-client suite.

## 5. Target boundaries and file tree

The architectural dependency direction is fixed:

```text
consumer
   ↓
universal fluent API and immutable entities
   ↓
universal GitHostAdapter concern contracts
   ↓
selected Gitea adapter modules
   ↓
exact generated Gitea REST client for the selected version
```

Universal code defines vocabulary, inputs, normalized results, pagination, cancellation, errors,
capability discovery, and operation-extension mechanics. Gitea code owns endpoint selection,
headers, status interpretation, version differences, native payloads, and bounded compositions.
Generated code owns the raw HTTP contract.

Target source tree:

```text
packages/pangit/src/
├── fluent-api/
│   ├── adapter-contract/
│   │   ├── GitHostAdapter.ts
│   │   ├── operation-options.ts
│   │   ├── pagination.ts
│   │   ├── errors.ts
│   │   ├── authentication.ts
│   │   ├── repository-containers.ts
│   │   ├── repositories.ts
│   │   ├── forks.ts
│   │   ├── branches.ts
│   │   ├── tags.ts
│   │   ├── commits.ts
│   │   ├── content.ts
│   │   ├── pull-requests.ts
│   │   ├── commit-statuses.ts
│   │   └── optional/
│   │       ├── current-user-profile.ts
│   │       ├── issues.ts
│   │       ├── releases.ts
│   │       ├── repository-webhooks.ts
│   │       ├── ci-run-discovery.ts
│   │       ├── packages.ts
│   │       ├── blob-reads.ts
│   │       ├── pull-request-reviews.ts
│   │       └── branch-rules.ts
│   ├── entities/
│   │   ├── RepositoryContainer.ts
│   │   ├── Repository.ts
│   │   ├── Branch.ts
│   │   ├── Tag.ts
│   │   ├── Commit.ts
│   │   ├── Content.ts
│   │   ├── PullRequest.ts
│   │   ├── CommitStatus.ts
│   │   └── optional/
│   │       ├── CurrentUserProfile.ts
│   │       ├── Issue.ts
│   │       ├── Release.ts
│   │       ├── ReleaseAsset.ts
│   │       ├── RepositoryWebhook.ts
│   │       ├── CiRun.ts
│   │       ├── CiJob.ts
│   │       ├── Package.ts
│   │       ├── Blob.ts
│   │       ├── PullRequestReview.ts
│   │       └── BranchRule.ts
│   ├── capabilities/
│   │   ├── RepositoryForks.ts
│   │   ├── RepositoryBranches.ts
│   │   ├── RepositoryTags.ts
│   │   ├── RepositoryCommits.ts
│   │   ├── RepositoryContent.ts
│   │   ├── RepositoryPullRequests.ts
│   │   ├── RepositoryCommitStatuses.ts
│   │   └── optional/
│   │       ├── CurrentUserProfile.ts
│   │       ├── RepositoryIssues.ts
│   │       ├── RepositoryReleases.ts
│   │       ├── RepositoryWebhooks.ts
│   │       ├── RepositoryCiRuns.ts
│   │       ├── RepositoryPackages.ts
│   │       ├── RepositoryBlobs.ts
│   │       ├── PullRequestReviews.ts
│   │       └── RepositoryBranchRules.ts
│   ├── provider-extensions/
│   │   ├── OperationExtension.ts
│   │   └── ProviderExtensionRegistry.ts
│   ├── native-access/
│   │   ├── NativeAccess.ts
│   │   └── ProviderNativeRegistry.ts
│   ├── auth/
│   │   ├── Auth.ts
│   │   ├── TokenAuthorization.ts
│   │   ├── BasicAuthorization.ts
│   │   ├── OAuthAuthorization.ts
│   │   ├── OAuthTransaction.ts
│   │   └── OAuthCookieFlow.ts
│   ├── FluentClient.ts
│   ├── select-git-host-adapter.ts
│   └── mod.ts
├── git-host-adapters/
│   └── gitea/
│       ├── GiteaGitHostAdapter.ts
│       ├── GiteaAdapterContext.ts
│       ├── response.ts
│       ├── authentication.ts
│       ├── repository-containers.ts
│       ├── repositories.ts
│       ├── forks.ts
│       ├── branches.ts
│       ├── tags.ts
│       ├── commits.ts
│       ├── content.ts
│       ├── pull-requests.ts
│       ├── commit-statuses.ts
│       ├── optional-capabilities/
│       │   ├── current-user-profile.ts
│       │   ├── issues.ts
│       │   ├── releases.ts
│       │   ├── repository-webhooks.ts
│       │   ├── ci-run-discovery.ts
│       │   ├── packages.ts
│       │   ├── blob-reads.ts
│       │   ├── pull-request-reviews.ts
│       │   └── branch-rules.ts
│       └── native/
│           ├── GiteaClientNative.ts
│           ├── GiteaRepositoryContainerNative.ts
│           ├── GiteaRepositoryNative.ts
│           ├── GiteaBranchNative.ts
│           ├── GiteaTagNative.ts
│           ├── GiteaCommitNative.ts
│           ├── GiteaContentNative.ts
│           ├── GiteaPullRequestNative.ts
│           ├── GiteaReviewNative.ts
│           └── GiteaCommitStatusNative.ts
└── generated-rest-clients/                    # generated; never hand-edited
```

`GitHostAdapter.ts` is a small composite interface. It extends concern-specific contracts; it must
not become a single thousand-line grab bag. Each Gitea concern module implements only its matching
contract. Shared Gitea plumbing belongs in `GiteaAdapterContext.ts` and `response.ts`, not copied
across concerns.

Target E2E tree:

```text
tests/e2e/
├── hand-written/
│   ├── fluent-api-contracts/                  # provider-neutral behavioral contracts
│   │   ├── contract-catalog.ts
│   │   ├── authentication/
│   │   ├── repositories/
│   │   ├── branches/
│   │   ├── tags/
│   │   ├── commits/
│   │   ├── content/
│   │   ├── pull-requests/
│   │   ├── statuses/
│   │   ├── optional-capabilities/
│   │   │   ├── current-user-profile/
│   │   │   ├── issues/
│   │   │   ├── releases/
│   │   │   ├── repository-webhooks/
│   │   │   ├── ci-run-discovery/
│   │   │   ├── packages/
│   │   │   ├── blob-reads/
│   │   │   ├── pull-request-reviews/
│   │   │   └── branch-rules/
│   │   └── native-access/
│   ├── git-host-adapter-tests/gitea/          # Gitea harness, fixtures, extension contracts
│   │   ├── gitea-fluent-api-e2e_test.ts
│   │   ├── GiteaE2EFixtureDriver.ts
│   │   ├── gitea-contract-catalog.ts
│   │   ├── extensions/                       # Gitea-only operation contracts
│   │   └── native-access/                    # Gitea raw-context contracts
│   ├── raw-rest-client-test-cases/            # authored raw endpoint scenarios
│   └── live-test-plan.json
└── generated/
    ├── raw-rest-client-tests/                 # generated raw-client E2E only
    └── docker-environments/                   # generated environment output only
```

## 6. Public fluent grammar to implement

Keep the existing client → container → repository progression. Attach repository concerns as named
capability objects so the file tree and call site match:

```ts
const connection = PanGit.api.createClient("gitea", "1.27.2", apiUrl);
const git = await connection.auth.token(token);

const owner = await git.container("acme");
const repository = await owner.repository("website");

const branchPage = await repository.branches.list({ limit: 25 });
const branch = await repository.branches.get("main");
const exists = await repository.branches.exists("feature/example");

const commit = await repository.commits.get("deadbeef");
const content = await repository.content.read("README.md", { ref: branch.name });
const pulls = await repository.pullRequests.list({ state: "open", limit: 25 });
const statuses = await repository.statuses.list(commit.sha, { limit: 25 });
```

Selected public naming:

| Public capability         | Public methods                                                                                                                        | Adapter operation IDs                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `client`                  | `containers`, `container`                                                                                                             | `listRepositoryContainers`, `getRepositoryContainer` |
| `container`               | `repositories`, `repository`, `findRepository`, `hasRepository`, `createRepository`                                                   | explicit repository operation names                  |
| `repository`              | `rename`, `delete`                                                                                                                    | `renameRepository`, `deleteRepository`               |
| `repository.forks`        | `list`, `create`                                                                                                                      | `listForks`, `createFork`                            |
| `repository.branches`     | `list`, `get`, `exists`, `create`, `rename`, `delete`, `divergence`, `listDivergences`                                                | the eight reviewed branch IDs                        |
| `repository.tags`         | `list`, `get`, `create`, `delete`                                                                                                     | the four reviewed tag IDs                            |
| `repository.commits`      | `list`, `get`, `getMany`, `compare`, `files`, `mergeBases`, `countReachable`, `findRefs`, `contributors`                              | the nine reviewed commit/reference IDs               |
| `repository.content`      | `read`, `readFiles`, `getDirectory`, `listDirectory`, `readPathMetadataBatch`, `readSymlink`, `readSubmodule`, `commitChanges`        | the eight reviewed content IDs                       |
| `repository.pullRequests` | `list`, `get`, `find`, `isMerged`, `commits`, `files`, `create`, `update`, `close`, `merge`, `requestReviewers`, `approve`, `comment` | the thirteen reviewed PR/review IDs                  |
| `repository.statuses`     | `list`, `get`, `set`                                                                                                                  | the three reviewed status IDs                        |

Public names are concise at the call site; adapter names remain globally explicit for logs, errors,
request-budget assertions, and binding tables.

All fetched entities are immutable snapshots. A mutation returns a new immutable entity when the
operation has a meaningful refreshed entity result; deletion and publication-only operations return
`void` unless the reviewed common contract promises a result. No mutation silently changes an
already-returned object.

## 7. Cross-cutting universal contracts

### 7.1 Operation options and cancellation

- [x] Define `OperationOptions { readonly signal?: AbortSignal }`.
- [x] Every networked method ends in one options object that extends `OperationOptions`.
- [x] Never add positional timeout, retry, page, or signal parameters.
- [x] Check an already-aborted signal before any request.
- [x] Forward the same signal to every request, delay, and readiness poll in a composite operation.
- [x] Normalize cancellation as `OperationAbortedError`; retain the native cause.
- [x] Do not retry ordinary mutations automatically.

### 7.2 Bounded pagination

Define:

```ts
interface PageRequest extends OperationOptions {
  readonly limit?: number;
  readonly cursor?: string;
}

interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
  readonly totalCount?: number;
}
```

- [x] Treat cursors as opaque outside the selected adapter.
- [x] Gitea maps its cursor to a validated positive page number.
- [x] One list call fetches at most one provider page.
- [x] Preserve provider order; PanGit promises no invented ordering.
- [x] Use response pagination metadata when present. Do not infer global completion solely from a
      short page.
- [x] If an endpoint exposes no reliable continuation metadata, return a next cursor only when the
      response proves more data exists; document the limitation.
- [x] Do not provide a convenience that silently materializes every page. Any future iterator must
      fetch one page at a time under consumer control.
- [x] Validate positive integer limits and cursors before the request.
- [x] Unit-test malformed cursors, server caps, exact page-size boundaries, empty pages, and aborts.

This intentionally changes the existing eager `containers()` and `repositories()` return shape. Make
the breaking change once in the foundation phase and update all callers/tests together; do not keep
an efficient API beside a legacy drain-everything API.

### 7.3 Error taxonomy

Define stable fluent errors:

- `AuthenticationError` — invalid or missing authentication, normally HTTP 401.
- `PermissionDeniedError` — authenticated but forbidden, normally HTTP 403.
- `NotFoundError` — confirmed missing target, normally HTTP 404.
- `ConflictError` — name/state/concurrency conflict, normally HTTP 409 or 423.
- `ValidationError` — locally invalid input or provider validation failure, normally HTTP 422.
- `RateLimitError` — HTTP 429, retaining retry metadata.
- `CapabilityUnavailableError` — statically unsupported capability; zero HTTP requests.
- `ProviderAdapterUnavailableError` — no high-level adapter is registered for the requested raw
  provider/version; zero provider requests.
- `OperationAbortedError` — caller cancellation.
- `OperationTimeoutError` — bounded readiness or traversal limit exhausted.
- `ProviderInvariantError` — a successful response lacks data required by the common contract.
- `ProviderOperationError` — other provider/transport failure.

Every error retains safe structured detail: provider, version, universal operation ID, HTTP status,
request ID when present, retry metadata when present, and the native cause/response. Common result
objects do not expose generated DTOs; native doors and error causes retain them.

Rules:

- [x] `find*` and `exists` translate only confirmed `NotFoundError` to `undefined`/`false`.
- [x] A 401, 403, timeout, invalid payload, or network failure is never treated as absence.
- [x] Map errors centrally in Gitea `response.ts`; concern modules do not duplicate status switches.
- [x] Normalize undocumented success responses as `ProviderInvariantError`, not false success.
- [x] Reject empty and whitespace-only identifiers before any request.

### 7.4 Normalized data and native payloads

- [x] Each adapter method returns an internal normalized `*Data` object.
- [x] Entities copy and freeze normalized fields.
- [x] Normalize only shared fields with reviewed semantics.
- [x] Convert provider numeric IDs to stable text without precision loss.
- [x] Keep exact generated payload and client in the entity's typed native context.
- [x] Add `client.native.gitea`, `container.native.gitea`, `repository.native.gitea`, and exact
      entity doors for branches, tags, commits, content, pull requests, reviews, and statuses.
- [x] Keep Gitea version differences inside Gitea native-context types and adapter modules.
- [x] Replace scattered hard-coded conditional native types with one clearly named
      `ProviderNativeRegistry`.

### 7.5 Adapter selection and fluent support

- [x] Rename `RepositoryHostAdapter` to the truthful composite name `GitHostAdapter`.
- [x] Split it into the concern contracts shown in the target tree.
- [x] Rename `select-repository-host-adapter.ts` to `select-git-host-adapter.ts`.
- [x] Keep one adapter selection at client creation and one memoized literal dynamic import.
- [x] Define `FluentProvider` from the implemented adapter registry; it is only `"gitea"` now.
- [x] Keep generated `Provider`/`ProviderVersion` types for raw-client APIs.
- [x] Make `api.createClient("github", ...)` a compile-time error. Guard untyped runtime calls with
      `ProviderAdapterUnavailableError` before a provider operation can run.
- [x] A universal entity/capability method never switches on `provider`.
- [x] Unit-test that creating a Gitea fluent client does not load another provider module.

### 7.6 Capabilities and provider extensions

Capabilities are immutable, local metadata assembled from adapter and version. Reading them makes
zero HTTP requests.

- [x] Core methods are mandatory for an implemented fluent provider.
- [x] Optional modules are explicit capability handles, never unrelated optional fields on core
      entities.
- [x] Unsupported optional modules are reported as unsupported locally.
- [x] Version-limited Gitea enhancements are reflected by version-specific capability metadata.
- [x] No remote feature probing occurs during client creation or capability access.

Provider-specific enhancement uses a reusable operation builder only when an operation has a real
Gitea-specific option:

```ts
await repository.tags
  .create(commonInput)
  .gitea((context) => ({/* tag-specific Gitea options only */}))
  .execute({ signal });
```

- [x] `.gitea(...)` exists only on a Gitea-selected builder type.
- [x] The callback is invoked at most once and only for the selected provider.
- [x] The callback receives an immutable operation-specific context, never the full raw client.
- [x] The callback returns a typed extension object; no `Record<string, unknown>` option bag.
- [x] Full unrestricted provider work remains under `native.gitea`.
- [x] Prototype and lock this grammar in the Tags phase before reusing it elsewhere.

## 8. Non-negotiable efficiency contract

Correct output is insufficient. E2E must also prove the request shape.

| Operation class               | Maximum default work                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| direct get/find/exists        | one direct-address request                                                                             |
| direct delete                 | one direct-address request; no preflight                                                               |
| simple mutation               | one mutation request; one direct refresh only when the mutation response lacks required common state   |
| page list                     | one provider page request                                                                              |
| multi-ID get                  | only the requested IDs, bounded concurrency, stable output order                                       |
| initialized repository create | one create + one batch file commit; at most one batch seed-metadata read when Gitea requires auto-init |
| file-change commit            | one batch mutation; at most one batch metadata read when required SHAs were omitted                    |
| fork create                   | one create + bounded direct lookup of the known destination only                                       |
| branch divergence             | two count-only commit-list probes (`head not base`, then inverse); no history download                 |
| branch divergence page        | one branch page + two count-only probes per returned branch only                                       |
| ancestry/containment fallback | explicit caller limits, bounded concurrency, incomplete-history error at the limit                     |
| merge completion              | one merge + bounded polling of the known PR only; optional direct source-branch cleanup                |
| capability query              | zero network requests                                                                                  |

Implementation rules:

- [x] Never list repositories to locate one repository.
- [x] Never list containers to locate one container.
- [x] Never fetch an entity before delete merely to prove it exists.
- [x] Never enumerate a whole collection by default.
- [x] Never fetch all commits to answer a bounded ancestry question.
- [x] Never perform one request per item when Gitea has a batch endpoint.
- [x] Use bounded concurrency for unavoidable per-ID work; default 4, configurable downward, never
      unbounded.
- [x] Multi-ID methods validate a documented maximum input count before requests.
- [x] Request only required commit facets. Set Gitea `files`, `stat`, and `verification` false
      unless the operation explicitly needs them.
- [x] Reuse already-known identities and mutation response bodies.
- [x] Do not dereference external symlink or submodule targets.
- [x] Poll only the resource just created or mutated, with bounded attempts and abort-aware delay.
- [x] Add a short request-cost note to every composite public method's JSDoc.

Use the existing generated-client `beforeRequest` hook in tests to capture exact raw operation IDs.
Every contract result must state both its behavioral assertion and request-count assertion.

## 9. E2E execution model required before capability work

### 9.1 Independent fixtures

- [x] Add `GiteaE2EFixtureDriver.ts` using the generated raw Gitea client only.
- [x] Give each contract run a unique prefix.
- [x] Create only the repositories, branches, commits, files, PRs, statuses, hooks, and users that
      contract needs.
- [x] Return exact fixture identities to universal contracts.
- [x] Track created resources as they are created and clean them in reverse dependency order.
- [x] Cleanup uses known direct identities. It must not list every repository/branch/hook to find
      test resources.
- [x] Cleanup ignores only confirmed 404 and reports every other failure.
- [x] A universal contract uses only public fluent APIs for the behavior under test; it must not use
      the implementation method to create its own expected proof.
- [x] The generated raw suite and hand-written fluent suite can each run first and can run alone.

### 9.2 Named contract catalog and filters

- [x] Give every contract a stable ID such as `core/branches` or
      `shared-capability/repository-webhooks`.
- [x] Make the Gitea entrypoint run an ordered catalog and emit one result entry per contract.
- [x] Add runner filters:
  - `--git-host gitea`
  - `--version 1.26.4|1.27.2`
  - `--suite raw|fluent|all`
  - `--contract <stable-contract-id>` for fluent runs
- [x] Reject unknown/incompatible filter values before Docker starts.
- [x] A focused run executes only selected suites/contracts.
- [x] Focused results go to a separate non-published result location and never replace full
      evidence.
- [x] Only an unfiltered complete run publishes `packages/pangit/docs/test-results/**`.
- [x] Keep all filter implementation in the authored runner/writer; regenerate generated Docker
      output rather than editing it.

Commands after this runner phase is implemented:

```bash
# Fast section development against latest supported Gitea
deno task e2e --git-host gitea --version 1.27.2 --suite fluent --contract core/branches

# Required section gate on the older supported version
deno task e2e --git-host gitea --version 1.26.4 --suite fluent --contract core/branches

# Final full raw + fluent proof and documentation publication
deno task e2e
```

### 9.3 Standard completion gate for every phase

Do not check a phase complete until all are true:

- [x] Design checklist is complete and public semantics are documented.
- [x] Adapter binding checklist is complete for both Gitea versions.
- [x] Unit tests include success, absence, permission/error, cancellation, malformed response, and
      request-count cases relevant to the phase.
- [x] The focused contract passes on Gitea 1.27.2.
- [x] The same focused contract passes on Gitea 1.26.4.
- [x] `deno fmt --check` passes.
- [x] `deno task check` passes.
- [x] `deno task lint` passes.
- [x] `deno task test` passes.
- [x] Public API type tests are updated for the intentional surface.
- [x] The phase status and evidence log at the end of this file are updated.

## 10. Master execution checklist

Execute in order. A later phase may start only when its dependency phases are complete.

| Phase | Deliverable                                                | Depends on | Status   |
| ----- | ---------------------------------------------------------- | ---------- | -------- |
| 0     | Baseline, E2E isolation, contract filters, request tracing | —          | Complete |
| 1     | Universal adapter foundation and clean source structure    | 0          | Complete |
| 2     | Token, Basic/TOTP, and OAuth adapter contract              | 1          | Complete |
| 3     | Containers and complete repository lifecycle               | 1, 2       | Complete |
| 4     | Forks                                                      | 3          | Complete |
| 5     | Branches and divergence                                    | 3          | Complete |
| 6     | Tags and first operation-specific Gitea extension          | 3          | Complete |
| 7     | Commits, comparison, ancestry, refs, contributors          | 5          | Complete |
| 8     | Content and directory reads                                | 7          | Complete |
| 9     | Atomic file-change commits                                 | 5, 8       | Complete |
| 10    | Pull-request discovery and contents                        | 4, 5, 7    | Complete |
| 11    | Pull-request creation, mutation, close, and merge          | 10         | Complete |
| 12    | Reviewers, approvals, and PR comments                      | 10, 11     | Complete |
| 13    | Commit statuses                                            | 7          | Complete |
| 14    | Optional shared capability modules for Gitea               | 2–13       | Complete |
| 15    | Gitea native scopes and provider-extension closure         | 2–14       | Complete |
| 16    | Complete integration, docs, generation, publish acceptance | 0–15       | Complete |

## 11. Phase 0 — freeze the baseline and make E2E resumable

Goal: prove the starting state, remove hidden fixture coupling, and make every later phase runnable
alone.

### Baseline

- [x] Record `git status --short` without altering unrelated changes.
- [x] Run and record `deno fmt --check`.
- [x] Run and record `deno task check`.
- [x] Run and record `deno task lint`.
- [x] Run and record `deno task test`.
- [x] Run and record `deno publish --dry-run --allow-dirty` from `packages/pangit`.
- [x] Run and record the unfiltered `deno task e2e` result for both Gitea versions.
- [x] Run `deno task generate --cached` twice and prove the second run has no diff.
- [x] Hash `tests/e2e/hand-written/**` before and after generation and prove it is unchanged.

### E2E infrastructure

- [x] Implement the independent fixture driver described in section 9.1.
- [x] Move the current repository-container assertions into
      `fluent-api-contracts/repositories/repository-container-contract.ts`.
- [x] Keep the Gitea entrypoint a thin provider harness; it must not contain universal assertions.
- [x] Implement stable contract IDs and ordered catalogs.
- [x] Implement `--git-host`, `--version`, `--suite`, and `--contract` filters.
- [x] Make filtered runs non-publishing and full runs publishing.
- [x] Thread a request recorder through `ClientOptions.beforeRequest` and expose contract helpers
      for exact operation-count assertions.
- [x] Let contracts reset/snapshot the recorder around the single operation under test so fixture
      setup and explicit verification calls cannot be mistaken for adapter work.
- [x] Unit-test filter parsing, suite selection, focused result isolation, full publication, and
      generator ownership boundaries.
- [x] Delete the old raw-suite-created fixture dependency only after the independent fixture
      contract passes.

### Phase E2E gate

- [x] Run `core/repository-containers` alone on 1.27.2 with `--suite fluent`.
- [x] Run `core/repository-containers` alone on 1.26.4 with `--suite fluent`.
- [x] Run `--suite raw` alone for each version.
- [x] Run the unfiltered suite and verify both report families still publish.

## 12. Phase 1 — universal adapter foundation

Goal: establish the concern-based adapter, efficient paging, stable errors, entity factories,
capability metadata, and provider/native registries before adding operations.

### Design and structure

- [x] Create the target `fluent-api/adapter-contract/` structure.
- [x] Define `GitHostAdapter` as a composite of concern contracts.
- [x] Move existing repository/container types without changing semantics until their dedicated
      phase, except for pagination/options required by this foundation.
- [x] Define `OperationOptions`, `PageRequest`, and `Page<T>`.
- [x] Define the fluent error taxonomy and safe structured detail.
- [x] Define normalized-data factories and immutable entity construction rules.
- [x] Define local capability descriptors keyed by provider and version.
- [x] Define `ProviderNativeRegistry` and `ProviderExtensionRegistry` extension points.
- [x] Define `FluentProvider` from the implemented adapter registry.
- [x] Rename the selector and current adapter types to `GitHostAdapter` terminology.
- [x] Keep one literal dynamic import for Gitea and prove it remains memoized.
- [x] Remove provider conditionals from universal domain/auth methods as their owning phases land.

### Gitea foundation

- [x] Add `GiteaAdapterContext` owning provider, version, base URL, raw client creation,
      credentials, request options, and cached authenticated identity.
- [x] Add one Gitea response/error mapper.
- [x] Add cursor encode/decode helpers and pagination-header interpretation.
- [x] Add bounded-concurrency and abort-aware poll helpers used only by explicit composite methods.
- [x] Ensure helpers never retry mutations or turn non-404 errors into absence.
- [x] Add malformed-success-payload guards rather than unsafe non-null assertions.

### Tests

- [x] Unit-test every error mapping.
- [x] Unit-test one-request paging and cursor round-trip.
- [x] Unit-test bounded concurrency and abort-aware polling with fake operations.
- [x] Unit-test capability reads perform zero requests.
- [x] Unit-test unsupported high-level provider selection fails immediately.
- [x] Compile-test Gitea native/extension type narrowing.

### Phase E2E gate

- [x] `foundation/pagination-errors` passes on 1.27.2.
- [x] `foundation/pagination-errors` passes on 1.26.4.
- [x] The current repository-container contract still passes on both versions.

## 13. Phase 2 — authentication

Goal: universal protocol orchestration with all Gitea transport mechanics inside the Gitea adapter.

### Universal contract

- [x] Split adapter auth into `authorizeToken`, `authorizeBasic`, `beginOAuth`, and
      `exchangeOAuthCode` responsibilities.
- [x] Keep random state, PKCE generation/verification, callback dispatch, and encrypted transaction
      cookies universal.
- [x] Put provider authorization/token URLs, request bodies, response parsing, header schemes, and
      credential verification in the adapter.
- [x] Make token authorization accept operation options without exposing raw header construction.
- [x] Lock Basic grammar as
      `auth.basic({ username, password }).gitea(() => ({ oneTimePassword })).authorize(options)`;
      allow the extension to be omitted when TOTP is not required.
- [x] Keep OAuth transaction data provider-neutral plus an opaque adapter transaction payload.
- [x] Keep credential persistence outside PanGit.
- [x] Never include token, password, TOTP, OAuth code, or verifier in errors, logs, or E2E evidence.

### Gitea binding

- [x] Token: construct `Authorization: token <token>` for PATs and verify with `userGetCurrent`.
- [x] OAuth: honor the returned token type, normally Bearer, and verify with `userGetCurrent`.
- [x] Basic: construct RFC-compliant Basic authorization and optional `X-GITEA-OTP`, then verify
      with `userGetCurrent`.
- [x] Derive Gitea browser OAuth endpoints inside the adapter from validated configuration; support
      an explicit web base URL when the API base cannot be safely inverted.
- [x] Move Gitea authorization URL construction and token exchange out of universal
      `oauth-login.ts`.
- [x] Delete the current Basic provider switch and unimplemented terminal throw.
- [x] Preserve the current authorized-client provider/version and selected-adapter identity.

### E2E contract `core/authentication`

- [x] Valid PAT authorizes and fetches the exact current identity in one verification request.
- [x] Invalid PAT yields `AuthenticationError` without leaking the token.
- [x] Valid Basic credentials authorize.
- [x] Invalid Basic credentials yield `AuthenticationError`.
- [x] Extend the authored Gitea bootstrap with a dedicated two-factor test account using a supported
      deterministic setup path, then prove Basic without `X-GITEA-OTP` is challenged and Basic with
      the current code succeeds. Unit-only header construction is not completion.
- [x] OAuth authorization URL contains correct state, PKCE challenge, callback, and scopes.
- [x] OAuth callback rejects state/provider/version/callback mismatch before token exchange.
- [x] OAuth code exchange returns an authorized fluent client and exact authorization metadata.
- [x] The fixture creates a disposable OAuth2 application through the raw Gitea client, drives the
      real authorization/login/consent redirect with a dedicated test user, captures the callback
      code, and deletes the application directly afterward. A mocked token exchange is not E2E.
- [x] Cancellation before and during verification is proven.
- [x] Request evidence proves no organization/repository enumeration during authentication.

## 14. Phase 3 — containers and complete repository lifecycle

Goal: retain the working direct lookup design, replace eager lists, and finish the two missing
common repository guarantees.

### Normalized contracts

- [x] Add repository fork-parent identity: provider, owner, name, full name, and stable ID when
      available.
- [x] Define initialized repository input with a named default branch, commit message, and arbitrary
      caller-provided files/bytes.
- [x] Define explicit file create modes and reject duplicate/invalid paths before any request.
- [x] Return `Page<RepositoryContainer>` and `Page<Repository>` from list methods.
- [x] Define the Gitea container cursor as opaque staged state: whether the cached current user was
      emitted plus the organization page/offset. Honor the caller limit even on the first mixed
      user/organization page.
- [x] Add operation options to every direct container/repository operation.
- [x] Retain `repository`, `findRepository`, and `hasRepository` as separate required/optional/
      boolean semantics.

### Gitea binding

- [x] `listRepositoryContainers`: current user plus one requested organization page; no drain loop.
- [x] Anonymous `listRepositoryContainers` yields `AuthenticationError`; anonymous direct named
      container/repository reads remain available when Gitea permits them.
- [x] `getRepositoryContainer`: cached current-user match, then `orgGet`, then `userGet` only after
      confirmed organization 404; maximum two direct requests.
- [x] `listRepositories`: exactly one of `userCurrentListRepos`, `userListRepos`, or `orgListRepos`
      for one page.
- [x] `getRepository`/find/exists: one `repoGet`.
- [x] Empty repository creation: one `createCurrentUserRepo` or `createOrgRepo`.
- [x] Before binding initialized creation, live-prove whether `repoChangeFiles` can create the first
      commit/branch in an empty repository on both versions.
- [x] If it can, use one empty create followed by one `repoChangeFiles` batch.
- [x] If it cannot, create with `auto_init: true` and the requested `default_branch`, then apply all
      caller files in one `repoChangeFiles` batch on that branch. If auto-init creates a seed file
      not requested by the caller, read all seed metadata in one batch and delete the seed in the
      same caller-file mutation. Final tree contents must match the common input.
- [x] Set the default branch in the create request. Use `repoEdit` only if live proof shows the
      create option was not honored. Never create caller files one request at a time.
- [x] Organization creation lets Gitea decide authorization; user creation is allowed only for the
      cached authenticated user without an extra lookup.
- [x] Rename: one `repoEdit`, using its body when complete and at most one direct refresh otherwise.
- [x] Delete: one `repoDelete`, no existence preflight.
- [x] Normalize fork parent from the existing Gitea repository payload.

### E2E contract `core/repositories`

- [x] Anonymous direct read of a public repository.
- [x] One-page container and repository listing with provider order preserved.
- [x] Pagination boundary greater than the server page size without eager draining.
- [x] Direct user and organization lookup, including name-collision/fallback behavior.
- [x] Required missing repository throws `NotFoundError`.
- [x] Optional missing repository returns `undefined`; exists returns `false`.
- [x] 401/403 are not converted to absence.
- [x] Create empty user repository and organization repository.
- [x] Create an initialized repository with multiple arbitrary binary/text files and named default
      branch; read the files independently to prove usable completion.
- [x] Reject creation for another user without a list or lookup request.
- [x] Rename returns a fresh immutable entity; old entity remains unchanged.
- [x] Delete uses one request and confirmed later absence uses one separate direct check.
- [x] Fork-parent identity is present for a known fork.
- [x] Whitespace validation and cancellation are proven.

## 15. Phase 4 — forks

Goal: implement bounded fork listing and synchronous-ready fork creation.

### Contract and binding

- [x] Define one-page fork listing with stable destination container identity.
- [x] Define fork creation input with explicit destination container/name.
- [x] Define usable completion: return only after direct destination lookup succeeds.
- [x] Map list to `listForks`, one page per call.
- [x] Map create to `createFork`.
- [x] On HTTP 202, poll only `repoGet(destinationOwner, destinationName)`.
- [x] Use bounded attempts, abort-aware delay, and configurable timeout in operation options.
- [x] Treat only 404 during readiness as “not ready yet”; preserve all other errors.
- [x] Never list destination repositories to locate the fork.

### E2E contract `core/forks`

- [x] Create a fork into a known destination and return it only when directly usable.
- [x] Prove request trace is one create plus direct lookup attempts only.
- [x] List one fork page and preserve order/cursor.
- [x] Prove timeout and cancellation behavior with bounded attempts.
- [x] Prove permission/conflict errors are not converted to readiness retries.

## 16. Phase 5 — branches and divergence

Goal: implement direct branch lifecycle and exact, bounded divergence without hidden history scans.

### Contract

- [x] Define branch identity, name, target SHA, protection indicator, and native payload.
- [x] Define one-page list with optional substring filter.
- [x] Define direct get and exists semantics.
- [x] Define create source as an explicit ref/SHA.
- [x] Define rename/delete default-branch prohibition using already-normalized repository state.
- [x] Define divergence as ahead count, behind count, and an explicit completeness state. Merge-base
      identity belongs to the separate commit-ancestry operation.
- [x] Define `listDivergences` over one requested branch page, not an entire repository.

### Gitea binding

- [x] List: `repoListBranches`; use server-side `q` on 1.27.2.
- [x] On 1.26.4, apply substring filtering only to the fetched provider page and retain its next
      cursor. Do not scan all pages to fill one filtered page.
- [x] Get/exists: one `repoGetBranch`, with only confirmed 404 as absence.
- [x] Create: one `repoCreateBranch`.
- [x] Rename: one `repoRenameBranch`; do not emulate when the direct operation is available.
- [x] Delete: one `repoDeleteBranch`, rejecting the known default branch locally.
- [x] Live-prove `repoGetAllCommits(sha=head, not=base, limit=1)` and its inverse on a diverged DAG.
      Set `files=false`, `stat=false`, and `verification=false`; use `X-Total` for the two counts.
- [x] A missing or invalid `X-Total` is `ProviderInvariantError`; it is not permission to download
      the whole history.
- [x] `listDivergences` fetches one branch page and performs exactly two count-only probes for each
      returned branch, with concurrency at most 4.

### E2E contract `core/branches`

- [x] List pagination and filter behavior on both versions, including the documented 1.26.4/1.27.2
      difference.
- [x] Direct get/exists success and confirmed absence request counts.
- [x] Create from known SHA, rename, then delete.
- [x] Default branch rename/delete rejected before a mutation request.
- [x] Permission, conflict, cancellation, and malformed payload behavior.
- [x] Divergence DAG proves exact ahead/behind for all four cases.
- [x] Divergence page request count remains within its documented formula.

## 17. Phase 6 — tags and the operation-extension pattern

Goal: implement tags and lock the reusable common-plus-Gitea operation builder.

### Contract and binding

- [x] Define tag identity, name, target SHA, message, annotated/lightweight distinction when
      reliably available, and native payload.
- [x] Define one-page list and direct get.
- [x] Define common annotated-tag creation fields supported across the reviewed providers.
- [x] Define direct delete.
- [x] Map list/get/create/delete to `repoListTags`, `repoGetTag`, `repoCreateTag`, and
      `repoDeleteTag`.
- [x] Implement the first operation-specific `.gitea(...).execute()` builder for actual Gitea tag
      options excluded from common input.
- [x] Prove the Gitea callback receives only tag-create context and cannot access a generic raw
      client.
- [x] Prove a callback is not executed for an unmatched provider using a type/runtime fixture.

### E2E contract `core/tags`

- [x] List one tag page.
- [x] Direct get and confirmed missing behavior.
- [x] Create an annotated tag at a known commit and verify normalized/native data.
- [x] Exercise one real Gitea-specific tag extension.
- [x] Delete directly with no get/list preflight.
- [x] Prove duplicate/conflict, permission, and cancellation behavior.

## 18. Phase 7 — commits, comparison, ancestry, refs, and contributors

Goal: implement commit/ref operations without making full-history work implicit.

### Payload and cost contract

- [x] Define lightweight commit fields separately from optional files, stats, and verification.
- [x] List/get inputs explicitly request expensive facets; default them off.
- [x] Define multi-get maximum item count, stable output order, missing-item behavior, and
      concurrency limit.
- [x] Define comparison metadata versus complete diff/patch output; the latter is a Gitea 1.27.2
      extension, not a common promise.
- [x] Define merge-base and reachable-count completeness/failure semantics.
- [x] Distinguish refs whose heads equal a commit from refs that contain it by ancestry.
- [x] Require explicit ref kinds and limits for containment work.
- [x] Require an explicit history boundary for contributor aggregation when no direct provider
      endpoint exists.

### Gitea binding

- [x] `listCommits`: one `repoGetAllCommits` page with `files=false`, `stat=false`, and
      `verification=false` unless requested.
- [x] `getCommit`: one `repoGetSingleCommit`, requesting only selected facets.
- [x] `getCommits`: one direct `repoGetSingleCommit` per requested SHA, bounded concurrency 4,
      stable input order, never unrelated commits.
- [x] `compareCommits`: one `repoCompareDiff` after the Phase 5 live semantics are recorded.
- [x] `listCommitFiles`: one `repoGetSingleCommit` with files enabled and unrelated expensive facets
      disabled.
- [x] `findMergeBases`: Gitea has no direct merge-base endpoint. Fetch bounded pages from
      `repoGetAllCommits(sha=A, not=B)` and the inverse with expensive facets disabled; validate
      maximal common-ancestor candidates with minimal reachability probes. Stop with an explicit
      incomplete-history error when `maxCommits` is reached.
- [x] `countReachableCommits`: one `repoGetAllCommits(sha, not?, limit=1)` with expensive facets
      disabled and count from `X-Total`; invalid/missing total is an invariant error.
- [x] Make `findRefsForCommit` return a page. Its opaque cursor records whether it is scanning
      branch or tag pages and the provider page within that kind.
- [x] `findRefsForCommit` head mode: fetch one bounded `repoListBranches` or `repoListTags` page and
      filter exact target SHAs without commit calls.
- [x] `findRefsForCommit` contains mode: use only candidates in that bounded page, require explicit
      `maxCommitsPerRef`, use bounded concurrency, and retain the continuation cursor rather than
      scanning every ref.
- [x] Keep unpaginated `repoListGitRefs`/`repoListAllGitRefs` native-only, or expose them only as an
      explicitly unbounded Gitea operation with a cost warning; they are not the common default.
- [x] `listContributors`: require a caller-selected history window/maximum; page only within that
      bound and deduplicate using documented attribution keys.

### E2E contract `core/commits`

- [x] List and get omit expensive data by default; request trace and response fixtures prove it.
- [x] Explicit files/stats/verification options return only requested facets.
- [x] Multi-get touches only supplied SHAs, preserves order, and caps concurrency.
- [x] Compare proves same, ahead, behind, and divergent histories.
- [x] Commit-file listing returns exact changed paths.
- [x] Criss-cross/merge fixture proves multiple merge-base behavior or the exact documented Gitea
      limitation.
- [x] Reachable count is exact inside its contract and bounded when history is incomplete.
- [x] Head-equality and ancestry-containment ref modes are tested separately.
- [x] Contributor aggregation stops at its explicit history boundary.
- [x] Abort and limit exhaustion stop further requests.

## 19. Phase 8 — content and directory reads

Goal: use Gitea's direct content APIs, batch paths, and never dereference external links implicitly.

### Contract

- [x] Define content kinds: file, directory, symlink, and submodule.
- [x] Define byte content separately from provider-reported encoding/text.
- [x] Preserve path, size, object/blob SHA, revision, last commit, and first-parent identity only
      where semantics are proven.
- [x] Define batch input/chunk maximum, stable output order, and per-path missing/error result.
- [x] Define recursive directory and single-folder-chain behavior explicitly.
- [x] Define symlink as raw target plus optional internal repository dereference.
- [x] Define submodule as metadata only unless an explicit internal read is requested.

### Gitea binding

- [x] Prefer `repoGetContentsExt` on both 1.26.4 and 1.27.2 for direct file metadata/content,
      directory, symlink, and submodule discrimination.
- [x] Prefer `repoGetFileContentsPost` for multi-file reads. Use bounded chunks and bounded
      concurrency only when the request exceeds the live-proven server batch limit.
- [x] Use direct contents-ext directory results instead of `repoGetSingleCommit → getTree` when its
      live semantics satisfy the contract.
- [x] Use at most one extra commit request only for metadata the direct content response cannot
      provide and the caller explicitly requested.
- [x] For first-parent batch metadata, resolve the requested commit and first parent once, then read
      only unique directory prefixes required by requested paths; never request a recursive whole
      repository tree.
- [x] Do not fetch download URLs, external symlink targets, or external submodule repositories.
- [x] Treat Gitea null content for oversized/unavailable files as an explicit content-unavailable
      result, not an empty file.

### E2E contract `core/content-reads`

- [x] Read known text, binary, empty, Unicode-name, and nested files by direct path.
- [x] Batch read proves one request and stable per-input output.
- [x] Missing path is distinguished from unavailable/oversized content.
- [x] Get/list directory uses one direct content request and does not traverse descendants unless
      explicitly requested.
- [x] Recursive and single-folder-chain modes stop at documented bounds.
- [x] Symlink returns raw target; internal dereference is explicit; external target is never
      fetched.
- [x] Submodule returns metadata without fetching its remote.
- [x] First-parent/last-commit metadata is tested against a multi-parent fixture.
- [x] Cancellation and malformed encoding are proven.

## 20. Phase 9 — atomic file-change commits

Goal: commit a requested batch as one commit, with Gitea concurrency/authoring enhancements kept in
an operation-specific extension.

### Contract and binding

- [x] Define create, update, upsert, delete, and move changes.
- [x] Define branch, optional new branch, message, and common author information.
- [x] Validate duplicate paths, conflicting source/destination paths, empty batches, and invalid
      modes before any request.
- [x] Guarantee one batch maps to one commit.
- [x] Map the mutation to one `repoChangeFiles` request.
- [x] If required existing SHAs are omitted, obtain all affected existing paths with one
      `repoGetFileContentsPost` batch before the mutation; never prefetch one path at a time.
- [x] Add a Gitea extension for SHA guards, force push, signoff, exact author/committer, and dates.
- [x] Keep the extension input typed to file-change commit only.
- [x] Preserve provider conflict detail when an SHA guard fails.

### E2E contract `core/file-change-commits`

- [x] One mixed batch creates, updates, moves, and deletes files in exactly one commit.
- [x] Optional new branch is created without prelisting branches.
- [x] Resulting tree and parent commit are exact.
- [x] Gitea SHA guard success and stale-SHA conflict are proven.
- [x] Signoff/author/committer extension is visible in the created commit.
- [x] One raw mutation is recorded for the file batch; at most one batch pre-read is allowed when
      the caller omitted required existing SHAs.
- [x] Invalid local batches make zero requests; cancellation and permission errors are proven.

## 21. Phase 10 — pull-request discovery and contents

Goal: direct PR identity operations and bounded PR collections without advanced-search leakage.

### Contract and binding

- [x] Define PR identity, number, state, title, description, source/target repository and branch,
      author, merge state, merge-base/merge-commit identities, and native payload.
- [x] Define one-page list filters only for the reviewed portable intersection: container,
      source/target branch, state, and basic text where exact semantics are proven.
- [x] Do not invent a common advanced search grammar.
- [x] Map list to one `repoListPullRequests` page.
- [x] Map direct get to one `repoGetPullRequest`.
- [x] Map base/head find to one `repoGetPullRequestByBaseHead`; do not list all PRs and filter.
- [x] Define snapshot `isMerged` from the already-normalized PR. For a fresh answer, use one
      `repoGetPullRequest`; the nominal `repoPullRequestIsMerged` 404 cannot distinguish an unmerged
      PR from a missing PR unless existence is already established.
- [x] Map PR commit/file lists to one page using `repoGetPullRequestCommits` and
      `repoGetPullRequestFiles`.
- [x] Disable expensive commit facets not required by the PR-commit contract.
- [x] Preserve native list limits; do not promise a complete diff.

### E2E contract `core/pull-request-discovery`

- [x] One-page list preserves provider order and cursor.
- [x] Direct get and base/head find use one request each.
- [x] Confirmed missing PR and permission failures remain distinct.
- [x] Merged state is checked directly without loading PR collections.
- [x] PR commits/files paginate and preserve provider limits.
- [x] Cross-fork and same-repository source identities normalize correctly.
- [x] Cancellation and malformed response behavior are proven.

## 22. Phase 11 — pull-request creation, mutation, close, and merge

Goal: implement the PR lifecycle with explicit identities, bounded completion, and no hidden source
cleanup.

### Contract and binding

- [x] Define creation with explicit source repository/branch and target repository/branch.
- [x] Define shared mutation fields: title, description, and target branch only where allowed.
- [x] Define close as an explicit state transition.
- [x] Define common merge choices: provider default or squash, plus optional source cleanup.
- [x] Map create to `repoCreatePullRequest`.
- [x] Map update/close to `repoEditPullRequest`.
- [x] Map merge to `repoMergePullRequest`.
- [x] Treat a normal successful Gitea merge response as terminal. Poll only the known PR for an
      explicitly selected scheduled/asynchronous Gitea extension, with bounded attempts and signal.
- [x] Source cleanup is a separate direct branch deletion after confirmed merge; report cleanup
      failure separately rather than hiding a successful merge.
- [x] Add operation-specific Gitea extensions for merge modes, `force_merge`, `head_commit_id`,
      scheduled merge, exact title/message, and Gitea-only PR fields proven useful.
- [x] Never pass a raw client into PR extension callbacks.

### E2E contracts

`core/pull-request-mutation`:

- [x] Create same-repository and cross-fork PRs.
- [x] Update allowed common fields and return fresh immutable snapshots.
- [x] Close an open PR and preserve invalid-state errors.
- [x] Prove direct operation counts and cancellation.

`core/pull-request-merge`:

- [x] Merge with provider default and squash.
- [x] Exercise each exposed Gitea merge mode supported by both versions; mark version-limited modes
      in static capabilities.
- [x] Prove stale `head_commit_id` conflict where supported.
- [x] Prove bounded completion polling touches only the PR.
- [x] Prove optional source-branch cleanup is one separate direct delete.

## 23. Phase 12 — reviewers, approvals, and PR comments

Goal: finish the reviewed review actions and publication-only comment contract.

### Contract and binding

- [x] Define reviewer identities and request semantics without implying portable approval policy.
- [x] Define approval as an action, not a common submitted-review object.
- [x] Define text comment and one old/new file-line inline comment.
- [x] Do not promise a common public comment ID, replies, edit, or delete.
- [x] Map reviewer request to `repoCreatePullReviewRequests`.
- [x] Map approval to the live-proven choice of `repoCreatePullReview` or `repoSubmitPullReview`.
- [x] Map text publication to `issueCreateComment`.
- [x] Map inline publication to `repoCreatePullReview` with exact validated position conversion.
- [x] Keep complete Gitea review objects in the optional review-object capability.
- [x] Add narrow Gitea extensions for richer review events/inline positions only when they do not
      change common semantics.

### E2E contract `core/pull-request-reviews-comments`

- [x] Request known reviewers and verify the PR state directly.
- [x] Approve and verify the action without claiming portable approval-policy behavior.
- [x] Publish text and old-line/new-line inline comments.
- [x] Verify exact file/line placement through Gitea native payloads.
- [x] Prove invalid reviewer, invalid line, permission, and cancellation behavior.
- [x] Request traces contain only the direct action and explicit verification requests.

## 24. Phase 13 — commit statuses

Goal: implement status list/get/set using direct by-ref operations and keep Gitea-only states out of
the common state union.

### Contract and binding

- [x] Define common states `pending`, `success`, and `failure`.
- [x] Define context, description, target URL, creator, timestamps, and native payload only where
      portable.
- [x] Lock `get` semantics explicitly: combined state versus one named context. Do not leave the old
      method-map ambiguity in code.
- [x] Use `repoListStatusesByRef` for one-page status lists on both versions.
- [x] If `get` means combined state, use one `repoGetCombinedStatusByRef`.
- [x] If `get` means a named context, require a bounded page/cursor contract; never drain all
      statuses to search for one context.
- [x] Use `repoCreateStatus` for set.
- [x] Add a Gitea extension for `error`, `warning`, and `skipped` without widening common states.
- [x] Support explicit commit ref, latest branch/tag ref, and PR-head ref resolution without a
      repository-wide scan.

### E2E contract `core/commit-statuses`

- [x] Set and list all common states on a known commit.
- [x] Get semantics match the recorded design decision and use the direct/bounded endpoint.
- [x] Branch/tag/commit and PR-head ref modes resolve correctly.
- [x] Gitea-only states work only through the Gitea extension.
- [x] Pagination, missing ref/context, permission, validation, and cancellation behavior are proven.
- [x] Request counts prove no preliminary full ref/status enumeration.

## 25. Phase 14 — optional shared capability modules

Goal: implement the optional shared families Gitea actually supports without pretending the
family-level analysis already proved a portable method-level contract.

For **each** subsection below, complete this same design gate first:

- [x] Record what the existing provider matrix proves and what it does not prove.
- [x] Inspect only the checked-in generated clients for providers marked supported in the matrix.
- [x] Build a method-level intersection: inputs, results, errors, pagination, concurrency,
      asynchronous completion, and excluded semantics.
- [x] Classify every candidate behavior as direct, bounded composite, provider extension, native
      only, or unsupported.
- [x] Add an explicit optional capability contract; do not add optional fields to unrelated core
      entities.
- [x] Implement the Gitea binding for both versions with local static capability metadata.
- [x] Add unit request-count tests and a separately named live Gitea contract.
- [x] Label the evidence “Gitea conformance to the shared capability contract”; it is not evidence
      that unimplemented providers conform.

### 25.1 Current-user profile

- [x] Define the reviewed normalized identity fields and direct `current()` operation.
- [x] Keep the exact Gitea `User` behind an identity native door.
- [x] E2E `shared-capability/current-user-profile`: authorized direct fetch, normalized/native data,
      unauthorized error, cancellation, one request.

### 25.2 Issues

- [x] Define only the proven common issue intersection for list/get/create/update/state transition
      and comments.
- [x] Keep Gitea time tracking, dependencies, reactions, attachments, and watcher behavior out of
      the common contract.
- [x] Add a Gitea issue-update extension for the `content_version` concurrency guard.
- [x] E2E `shared-capability/issues`: create disposable issue, direct get, bounded list, each common
      mutation, close/reopen if included, and deterministic cleanup.
- [x] E2E `gitea-extension/issue-content-version`: correct version succeeds and stale version
      conflicts without an overwrite.

### 25.3 Releases

- [x] Define release list/get-by-ID/get-by-tag/create/update/delete semantics.
- [x] Define release assets as a separate sub-capability: list/get/upload/update/delete only where
      the cross-provider contract is proven.
- [x] Keep signing and provider asset distinctions in extensions/native access.
- [x] E2E `shared-capability/releases`: create tag and disposable release, direct gets, bounded
      list, update, asset lifecycle if included, and direct delete.

### 25.4 Repository webhooks

- [x] Define common repository webhook list/get/create/update/delete fields.
- [x] Keep provider hook kinds, raw payload configuration, delivery inspection, and test-delivery
      mechanics in Gitea extensions/native access unless portable semantics are proven.
- [x] Add an isolated journal receiver service to the hand-written Gitea environment definition.
- [x] E2E `shared-capability/repository-webhooks`: create hook, direct get/update, trigger known
      event, bounded poll of the receiver for that hook/event, and direct delete.
- [x] E2E `gitea-extension/webhook-test-delivery` only if `repoTestHook` is exposed as an extension.

### 25.5 CI run discovery

- [x] Limit the common capability to read-only workflow/run/job/artifact discovery that the
      method-level review proves.
- [x] Keep dispatch, rerun, cancellation, secrets, variables, runner management, and artifact
      mutation in Gitea native access unless separately proven portable.
- [x] E2E `shared-capability/ci-run-discovery`: commit a known workflow, identify its run without
      global history scans, list one page, direct-get known run/job, and normalize state.

### 25.6 Package metadata and lifecycle

- [x] Define only the proven metadata/version/file listing and lifecycle intersection.
- [x] Keep upload/download protocols and repository/package linking native unless proven portable.
- [x] E2E `shared-capability/packages`: use one disposable package fixture, direct identity reads,
      bounded lists, supported lifecycle mutation, and direct cleanup.

### 25.7 SHA-addressed blob reads

- [x] Define one direct `get(sha)` returning exact bytes plus proven metadata.
- [x] E2E `shared-capability/blob-reads`: create known binary bytes, resolve the SHA once in fixture
      setup, read that SHA directly, prove byte equality, confirmed absence, and one-request cost.

### 25.8 Submitted PR review objects

- [x] Keep this distinct from core reviewer-request/approval actions.
- [x] Define only the proven review object list/get/create/submit lifecycle.
- [x] Keep dismissal, replies, resolution, and rich positions in Gitea extensions when they are not
      portable.
- [x] E2E `shared-capability/pull-request-reviews`: create PR, submit review, direct get/bounded
      list, normalize state, and retain exact native payload.

### 25.9 Branch protection and rules

- [x] Define configured rules and effective protection as two separate capabilities.
- [x] Do not infer effective enforcement merely from configuration fields.
- [x] Define direct list/get/create/update/delete for configured rules where portable.
- [x] Add Gitea ordered-priority mutation as an operation-specific extension.
- [x] E2E `shared-capability/branch-rules`: create disposable branch/rule, direct get, prove one
      enforcement behavior, update/delete, and verify absence.
- [x] E2E `gitea-extension/branch-rule-priority`: prove ordered priority independently.

### 25.10 Explicitly unsupported optional families

Gitea lacks the analyzed deployments/environments and gists/snippets families.

- [x] Capability metadata reports both unsupported for 1.26.4 and 1.27.2.
- [x] Type-level Gitea access does not advertise usable capability methods.
- [x] `shared-capability/unsupported-gitea-modules` proves both checks make zero HTTP requests.

## 26. Phase 15 — Gitea extensions and native-scope closure

Goal: make every provider-specific switch obvious and scoped, while retaining complete raw access.

### Operation-specific extension inventory

- [x] Repository creation: Gitea templates/readme/license/gitignore/object-format/trust options only
      if their behavior is intentionally offered beyond the arbitrary-files common path.
- [x] File-change commit: SHA guards, force push, signoff, exact author/committer, and dates.
- [x] Compare: complete diff/patch output on 1.27.2 only.
- [x] Pull requests: Gitea merge modes, force merge, head SHA guard, scheduled merge, exact merge
      title/message, and other intentionally supported Gitea-only fields.
- [x] Reviews/comments: Gitea review events and richer inline positions.
- [x] Statuses: `error`, `warning`, and `skipped`.
- [x] Issues: `content_version` and intentionally supported Gitea extensions.
- [x] Branch rules: ordered priority.
- [x] Webhooks: Gitea hook types/configuration/test delivery when exposed fluently.
- [x] Every extension has a dedicated type test, unit test, and live Gitea contract.

### Native scope inventory

Provider-only functionality with no useful shared operation remains on a typed native door:

| Scope                  | Gitea-only families                                                              |
| ---------------------- | -------------------------------------------------------------------------------- |
| client/instance        | instance administration, user administration badges, global notifications        |
| authenticated identity | tokens, keys, identity/access administration, user notifications                 |
| container              | organizations, teams, members, container-level access administration             |
| repository             | settings, mirrors, collaborators, keys, wikis, repository notifications          |
| Actions                | workflow control, dispatch, secrets, variables, runners, logs, artifacts, reruns |
| issues                 | dependencies, reactions, time tracking, watches, attachment-specific behavior    |

- [x] Add a top-level `client.native.gitea` context; current container/repository-only doors cannot
      reach client/instance operations cleanly.
- [x] Retain current container/repository doors under the new registry.
- [x] Give each new core/optional entity an exact-version native context.
- [x] Native callbacks receive the selected generated client and already-fetched payload where one
      exists.
- [x] Native access does not re-fetch an already-held payload.
- [x] Document that native operations use raw generated errors/types, not universal guarantees.
- [x] Do not create hundreds of thin wrappers around the generated client.

### E2E contracts

- [x] `gitea/native-client-access` proves the exact-version raw client at client scope.
- [x] `gitea/native-entity-access` proves container, repository, branch, tag, commit, content, PR,
      review, and status payload types/identity.
- [x] `gitea/extensions` proves the complete advertised extension catalog by stable sub-step.
- [x] Request traces prove native payload access itself makes no additional request.

## 27. Phase 16 — integration and release acceptance

Goal: close every ledger item, publish accurate documentation, and prove generation cannot damage
authored code/tests.

### Contract and source audit

- [x] Search the universal fluent tree for `gitea`, Gitea endpoint names, provider header names, and
      provider-specific status switches. Allow only registry/type references whose location is
      intentional.
- [x] Search Gitea concern modules for cross-concern duplication and move only real shared plumbing
      into `GiteaAdapterContext`/`response.ts`.
- [x] Search for eager page-drain loops and unbounded `Promise.all` calls.
- [x] Search for list-then-find implementations of direct operations.
- [x] Search for non-null assertions on provider payload fields required by common contracts.
- [x] Search for advertised capability methods with placeholder/unimplemented throws.
- [x] Verify every public operation has JSDoc covering semantics, request cost when composite,
      errors, cancellation, and native/extension boundary.
- [x] Verify every normalized entity is immutable and every mutation returns the documented shape.
- [x] Verify both Gitea versions compile through every concern module and native type.

### Public API and documentation

- [x] Export the intended fluent API only; keep adapter implementation classes internal.
- [x] Keep `createProviderClient` as the explicit generated raw-client entrypoint for all generated
      providers.
- [x] Make `api.createClient` advertise only implemented fluent providers.
- [x] Add public compile tests for every capability, extension, and native door.
- [x] Add negative compile tests showing other fluent providers and wrong provider extensions are
      unavailable.
- [x] Update package README and API docs with the architecture tree, common/optional/native split,
      Gitea support matrix, paging examples, cancellation, errors, and efficiency guarantees.
- [x] State that only Gitea has a complete fluent adapter; do not imply six-provider E2E.
- [x] Preserve the frozen API-analysis tables exactly.

### Generation and test ownership

- [x] Run `deno task generate --cached` twice.
- [x] Prove the second run is a no-op.
- [x] Prove hashes of `packages/pangit/src/fluent-api/**`,
      `packages/pangit/src/git-host-adapters/**`, and `tests/e2e/hand-written/**` are unchanged by
      generation.
- [x] Verify generated raw-client tests remain under `tests/e2e/generated/raw-rest-client-tests/**`
      only.
- [x] Verify hand-written fluent contracts remain under
      `tests/e2e/hand-written/fluent-api-contracts/**` only.

### Final validation

- [x] `deno fmt --check`
- [x] `deno task check`
- [x] `deno task lint`
- [x] `deno task test`
- [x] `deno publish --dry-run --allow-dirty` from `packages/pangit`
- [x] Every focused fluent contract passes on Gitea 1.26.4.
- [x] Every focused fluent contract passes on Gitea 1.27.2.
- [x] Unfiltered `deno task e2e` passes both generated raw suites and all fluent contracts.
- [x] Generated reports list every stable contract ID with behavioral and request-budget evidence.
- [x] No Docker E2E resources remain after the final run.
- [x] `git diff --check` passes.
- [x] The definition-of-done checklist in section 2 is fully checked.

## 28. Complete 52-method implementation ledger

This is the authoritative completion ledger for the reviewed common core. Check an item only after
its phase's design, implementation, unit tests, both-version focused E2E, and request-budget proof
are complete.

### Repositories — 7

- [x] **01 `listRepositories` — Phase 3; currently partial.** Select exactly one of
      `userCurrentListRepos`, `userListRepos`, or `orgListRepos` from the already-known container
      kind; fetch one page; normalize fork parent.
- [x] **02 `getRepository` — Phase 3; currently partial.** One `repoGet` by owner/name; add an
      explicit ID overload with `repoGetById` only if the public contract includes ID lookup;
      normalize fork parent.
- [x] **03 `createRepository` — Phase 3; currently partial.** One user/org create; initialized path
      uses the live-proven first-commit strategy: preferably one empty create plus one batch, or
      Gitea auto-init on the requested default branch plus one batch mutation and at most one batch
      seed-metadata read. The final tree must equal the caller input.
- [x] **04 `renameRepository` — Phase 3; current direct behavior exists.** One `repoEdit`; use its
      response or at most one direct refresh if required fields are absent.
- [x] **05 `deleteRepository` — Phase 3; current direct behavior exists.** One `repoDelete`; no
      preflight.
- [x] **06 `listForks` — Phase 4.** One `listForks` page.
- [x] **07 `createFork` — Phase 4.** One `createFork`; bounded `repoGet` readiness probes of the
      returned/known destination only.

### Branches — 8

- [x] **08 `listBranches` — Phase 5.** One `repoListBranches` page; server `q` on 1.27.2, page-local
      filtering with preserved cursor on 1.26.4.
- [x] **09 `getBranch` — Phase 5.** One direct `repoGetBranch`.
- [x] **10 `branchExists` — Phase 5.** One `repoGetBranch`; false only on confirmed 404.
- [x] **11 `createBranch` — Phase 5.** One `repoCreateBranch`; no source prefetch.
- [x] **12 `renameBranch` — Phase 5.** One `repoRenameBranch`; default-branch guard from repository
      snapshot, no branch list.
- [x] **13 `deleteBranch` — Phase 5.** One `repoDeleteBranch`; same local default-branch guard.
- [x] **14 `getDivergence` — Phase 5.** Two `repoGetAllCommits(limit=1)` count probes using inverse
      `sha`/`not`, all expensive facets disabled, counts from `X-Total`.
- [x] **15 `listBranchDivergences` — Phase 5.** One `repoListBranches` page plus the two count
      probes for each returned branch, concurrency at most 4; no other branches or commit bodies.

### Tags — 4

- [x] **16 `listTags` — Phase 6.** One `repoListTags` page.
- [x] **17 `getTag` — Phase 6.** One `repoGetTag`; call `getAnnotatedTag` only when explicitly
      requested fields require it.
- [x] **18 `createTag` — Phase 6.** One `repoCreateTag`; common annotated behavior plus narrow Gitea
      extension.
- [x] **19 `deleteTag` — Phase 6.** One `repoDeleteTag`; no prefetch.

### Commits and references — 9

- [x] **20 `listCommits` — Phase 7.** One `repoGetAllCommits` page with server filters and expensive
      facets off unless requested.
- [x] **21 `getCommit` — Phase 7.** One `repoGetSingleCommit`; expensive facets opt-in.
- [x] **22 `getCommits` — Phase 7.** Deduplicate requested IDs, then one direct
      `repoGetSingleCommit` per unique ID with bounded concurrency and stable input order.
- [x] **23 `compareCommits` — Phase 7.** One `repoCompareDiff`; 1.27.2 raw diff/patch output remains
      a Gitea version-specific extension.
- [x] **24 `listCommitFiles` — Phase 7.** One `repoGetSingleCommit` with files enabled and unrelated
      expensive facets off.
- [x] **25 `findMergeBases` — Phase 7.** Explicitly bounded two-sided commit-page traversal plus
      minimal reachability probes; stop with incomplete-history error at `maxCommits`.
- [x] **26 `countReachableCommits` — Phase 7.** One `repoGetAllCommits(sha, not?, limit=1)` count
      probe using `X-Total`.
- [x] **27 `findRefsForCommit` — Phase 7.** Head mode scans one paged branch/tag collection segment
      and filters exact SHAs with no commit reads; contains mode adds bounded reachability only for
      that page. Unpaginated Git-ref endpoints remain native/explicitly unbounded.
- [x] **28 `listContributors` — Phase 7.** Bounded `repoGetAllCommits` pages on the already-known
      default branch with expensive facets off; explicit history cap and incomplete indicator.

### Files and directories — 8

- [x] **29 `readContent` — Phase 8.** One `repoGetContentsExt` with only required includes; explicit
      oversized-content behavior.
- [x] **30 `readFiles` — Phase 8.** `repoGetFileContentsPost`; one request within the proven batch
      limit, otherwise bounded chunks.
- [x] **31 `getDirectory` — Phase 8.** One exact-path `repoGetContentsExt`; no full tree.
- [x] **32 `listDirectory` — Phase 8.** One exact-path `repoGetContentsExt` using `dir_contents` on
      both versions; no stale version split.
- [x] **33 `readPathMetadataBatch` — Phase 8.** Resolve requested commit and first parent once, then
      only unique directory prefixes needed by requested paths; use POST file batch when
      first-parent comparison is not needed; never request a recursive full tree.
- [x] **34 `readSymlink` — Phase 8.** One `repoGetContentsExt`; return raw target and never follow
      by default.
- [x] **35 `readSubmodule` — Phase 8.** One `repoGetContentsExt`; return URL/SHA metadata; explicit
      internal-only dereference, never external fetch.
- [x] **36 `commitFileChanges` — Phase 9.** One `repoChangeFiles` mutation; at most one
      `repoGetFileContentsPost` pre-read when required SHAs were omitted.

### Pull requests and reviews — 13

- [x] **37 `listPullRequests` — Phase 10.** One `repoListPullRequests` page for supported filters;
      exact base/head uses the direct base-head endpoint; text search uses server-side
      `issueSearchIssues(type="pulls")` with only bounded direct enrichment when required;
      unsupported head-only filtering is page-bounded.
- [x] **38 `getPullRequest` — Phase 10.** One `repoGetPullRequest`.
- [x] **39 `findPullRequest` — Phase 10.** One `repoGetPullRequestByBaseHead`; undefined only
      on 404.
- [x] **40 `isMerged` — Phase 10.** Snapshot answer from normalized PR or one `repoGetPullRequest`
      for fresh state; do not conflate unmerged and missing through the ambiguous 404-only
      merge-check endpoint.
- [x] **41 `listPullRequestCommits` — Phase 10.** One `repoGetPullRequestCommits` page with
      expensive facets disabled unless requested.
- [x] **42 `listPullRequestFiles` — Phase 10.** One `repoGetPullRequestFiles` page; no diff parsing.
- [x] **43 `createPullRequest` — Phase 11.** One `repoCreatePullRequest`; explicit same-repository
      or cross-fork source.
- [x] **44 `updatePullRequest` — Phase 11.** One `repoEditPullRequest`; never confuse it with
      `repoUpdatePullRequest`, which updates the PR branch from its base.
- [x] **45 `closePullRequest` — Phase 11.** One `repoEditPullRequest` state transition; no read
      first.
- [x] **46 `mergePullRequest` — Phase 11.** One `repoMergePullRequest`; normal success is terminal;
      only scheduled/asynchronous extension modes poll the known PR; optional cleanup is one branch
      delete.
- [x] **47 `requestReviewers` — Phase 12.** One `repoCreatePullReviewRequests`; do not read existing
      reviewers first.
- [x] **48 `approvePullRequest` — Phase 12.** One `repoCreatePullReview` with approved event; do not
      create and then separately submit a pending review.
- [x] **49 `publishPullRequestComment` — Phase 12.** Text uses one `issueCreateComment`; inline uses
      one `repoCreatePullReview` comment event and the already-known PR head SHA.

### Commit statuses — 3

- [x] **50 `listCommitStatuses` — Phase 13.** One `repoListStatusesByRef` page for branch/tag/commit
      refs; use SHA-only endpoint only when the input is already a known SHA.
- [x] **51 `getCommitStatus` — Phase 13.** One `repoGetCombinedStatusByRef` for combined state; if
      the locked contract selects a named context, inspect only bounded returned/page data and stop
      at declared limits.
- [x] **52 `setCommitStatus` — Phase 13.** One `repoCreateStatus`; no lookup first.

## 29. Optional capability and Gitea support ledger

| Optional family             | Gitea support | Fluent placement                              | Completion phase |
| --------------------------- | ------------- | --------------------------------------------- | ---------------- |
| current-user profile        | supported     | optional shared capability                    | 14.1             |
| issues                      | supported     | optional shared capability + Gitea extensions | 14.2             |
| releases                    | supported     | optional shared capability                    | 14.3             |
| repository webhooks         | supported     | optional shared capability + Gitea extensions | 14.4             |
| CI run discovery            | supported     | read-only optional shared capability          | 14.5             |
| deployments/environments    | unsupported   | static unsupported metadata; no method        | 14.10            |
| package metadata/lifecycle  | supported     | optional shared capability                    | 14.6             |
| SHA-addressed blob reads    | supported     | optional shared capability                    | 14.7             |
| gists/snippets              | unsupported   | static unsupported metadata; no method        | 14.10            |
| submitted PR review objects | supported     | optional shared capability + Gitea extensions | 14.8             |
| configured branch rules     | supported     | optional shared capability + Gitea extensions | 14.9             |
| effective branch protection | supported     | separate optional shared capability           | 14.9             |

## 30. Execution protocol for an AI continuation

Follow this protocol literally so another thread can resume without rediscovering the project.

### Start of a work session

1. Read sections 1–10 and the phase being executed.
2. Read the latest checkpoint and decision-log entries below.
3. Inspect `git status --short`; do not overwrite unrelated changes.
4. Select the first unchecked item whose dependencies are complete.
5. Mark only that phase `In progress` in the master checklist.
6. Read only the universal contract file, the matching Gitea concern module, the exact generated
   operation input/response types for both versions, and the matching E2E contract.

Do not browse unrelated repositories, compare arbitrary third-party libraries, or reread entire
generated clients. Use exact operation/type searches in the checked-in sources. Consult other
checked-in providers only during the explicit method-level review for an optional shared capability.

### During a phase

- Keep universal contracts, Gitea bindings, and E2E fixtures in their named directories.
- Implement the smallest vertical slice that reaches a real live assertion.
- Run the focused 1.27.2 contract while iterating.
- Inspect raw request traces whenever an operation is composite or unexpectedly slow.
- If a proposed binding violates its semantics or budget, stop and record a decision; do not hide
  the cost behind a helper.
- If a generated method is wrong, fix its manifest/template/generator and regenerate; never patch
  emitted code.
- If an E2E environment artifact is wrong, fix its authored definition/writer and regenerate; never
  patch `tests/e2e/generated/**`.

### End of a phase

1. Complete the standard gate in section 9.3.
2. Record both Gitea version results and request counts.
3. Update every completed method/capability ledger checkbox.
4. Change the master phase status to `Complete` only when no phase checkbox remains open.
5. Append a checkpoint with the exact next unchecked item.
6. Do not call a phase complete when live E2E is skipped, unavailable, or failing.

### Blocked work

If the live Gitea contract contradicts the reviewed semantics:

1. Preserve the failing focused fixture and raw request evidence.
2. State whether the problem is semantic impossibility, version difference, generated-client defect,
   or test-environment defect.
3. Check direct alternative endpoints in the two local generated Gitea clients only.
4. Choose exactly one resolution:
   - a more direct binding with the same semantics;
   - a bounded composite with explicit cost/completeness;
   - an operation-specific Gitea extension for the stronger behavior;
   - a static unsupported capability;
   - a reviewed correction to the proposed universal contract.
5. Record the decision below and leave the phase incomplete until the correction is implemented and
   both-version E2E passes.

## 31. Binding decisions already established

These correct inefficient or ambiguous starting mappings without editing the historical analysis.

| ID    | Decision                                                                                                                                                         | Reason                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | Repository lists select `userCurrentListRepos`, `userListRepos`, or `orgListRepos` from container kind.                                                          | The old map's organization-only shorthand is incomplete.                                                                                        |
| D-002 | Content, directory, symlink, and submodule reads prefer `repoGetContentsExt` on both versions.                                                                   | It is direct and exists in both 1.26.4 and 1.27.2; tree traversal is unnecessary.                                                               |
| D-003 | Multi-file reads prefer `repoGetFileContentsPost`.                                                                                                               | It avoids query-size limits and per-file requests.                                                                                              |
| D-004 | Divergence and reachable counts use minimal `repoGetAllCommits(sha, not, limit=1)` probes and `X-Total`.                                                         | Commit-body/history traversal is unnecessary for counts.                                                                                        |
| D-005 | Common ref discovery uses paged `repoListBranches`/`repoListTags`; unpaginated `repoListGitRefs`/`repoListAllGitRefs` remain native or explicitly unbounded.     | A one-request full-ref response is still unbounded work and cannot honor a caller page limit.                                                   |
| D-006 | Status lists use `repoListStatusesByRef`; combined state uses `repoGetCombinedStatusByRef`.                                                                      | Both are more direct than repository-wide status listing and exist in both versions.                                                            |
| D-007 | Fresh merged state uses `repoGetPullRequest` unless existence is already known.                                                                                  | `repoPullRequestIsMerged` uses 404 for unmerged and cannot independently distinguish a missing PR.                                              |
| D-008 | `repoEditPullRequest` edits metadata/state; `repoUpdatePullRequest` is not a synonym.                                                                            | The latter merges base changes into the head branch.                                                                                            |
| D-009 | Gitea 1.27.2 alone gets server-side branch `q` and compare `output`; all other mapped core request/response shapes are materially aligned.                       | Version differences stay inside the Gitea adapter/capability metadata.                                                                          |
| D-010 | Gitea has no direct contributor or merge-base endpoint.                                                                                                          | Both operations require explicit bounded algorithms and incomplete-history semantics.                                                           |
| D-011 | Tag creation has no Gitea extension; the first live operation-extension pattern is atomic file-change commits.                                                   | Both pinned `CreateTagOption` types contain only the common name, target, and message fields; inventing a provider switch would be false API.   |
| D-012 | Path-filtered commit listing is not part of the Gitea-backed common contract and remains available only through a native door.                                   | Neither pinned Gitea `repoGetAllCommits` input accepts a path filter; advertising one that always fails is not a contract.                      |
| D-013 | Linked content is metadata-only by default; `dereference: "internal"` follows only repository-local symlinks or same-instance Gitea submodules.                  | Explicit internal resolution is useful, while external URLs must never be fetched implicitly.                                                   |
| D-014 | The Gitea OpenAPI normalizer accepts the live-observed HTTP 201 responses for tag creation and scheduled merge.                                                  | Both pinned servers returned valid success payloads outside the upstream response declaration; generated clients must reflect live wire truth.  |
| D-015 | Gitea blob lookup maps the endpoint-specific missing-object HTTP 400 response to `NotFoundError`.                                                                | Live Gitea uses 400 for an otherwise valid but unknown blob SHA; other validation failures remain validation errors.                            |
| D-016 | Issue-comment lookup follows its repository-scoped web URL segments and scans only an explicitly bounded comment page.                                           | Gitea exposes no direct repository comment-by-ID operation; the fallback must stay bounded and reject unrelated URLs.                           |
| D-017 | CI workflow identity strips the provider's `@refs/...` suffix before direct workflow lookup.                                                                     | Run payload paths carry a ref suffix that the direct workflow endpoint does not accept.                                                         |
| D-018 | File-change SHA guards use one batch pre-read before the mutation.                                                                                               | Both pinned Gitea versions accepted a stale supplied SHA, so PanGit must enforce the advertised conflict guard locally without per-file reads.  |
| D-019 | Repository-root content listing uses direct `repoGetContentsList`.                                                                                               | The root `repoGetContentsExt` response shape is not a directory wrapper on both pinned versions.                                                |
| D-020 | Pull-request fixtures wait on the known PR until Gitea reports a stable merge base and head.                                                                     | Gitea's asynchronous mergeability computation can transiently reject an otherwise valid merge; fixture readiness is bounded and direct.         |
| D-021 | Foundation pagination/error proof is cross-cutting: unit tests cover every local branch and the applicable live core contracts carry the provider request proof. | A duplicate live fixture would add cost without testing a separate provider behavior; malformed cursors are also proven through the public API. |

Append new decisions; do not renumber or rewrite earlier entries.

## 32. Phase evidence log

Append one entry after each completed phase:

```markdown
### YYYY-MM-DD — Phase N: <name>

- Status: Complete | Blocked
- Files changed: <explicit paths>
- Contract decisions: <decision IDs or none>
- Unit/static gates: <exact commands and pass/fail>
- Gitea 1.27.2 E2E: <contract ID, pass/fail, evidence path>
- Gitea 1.26.4 E2E: <contract ID, pass/fail, evidence path>
- Request-budget proof: <operation IDs and counts>
- Generation proof: <when relevant>
- Next unchecked item: <single exact checkbox>
- Blocker: <none or exact blocker>
```

All live contract evidence below is recorded in both
`tests/e2e/results/gitea/1.26.4/hand-written-fluent-api-test/fluent-api-contracts.json` and
`tests/e2e/results/gitea/1.27.2/hand-written-fluent-api-test/fluent-api-contracts.json`. Those files
contain the exact expected and observed operation IDs and request counts for every named operation.

### 2026-09-02 — Phase 0: baseline and isolated E2E

- Status: Complete
- Files changed: `tests/e2e/runner/**`, `tests/e2e/result-management/**`, and
  `tests/e2e/hand-written/**`
- Contract decisions: D-021
- Unit/static gates: final consolidated gates passed
- Gitea 1.27.2 E2E: raw suite and `core/repositories` passed
- Gitea 1.26.4 E2E: raw suite and `core/repositories` passed
- Request-budget proof: stable catalog IDs, isolated selection, and exact request records published
- Generation proof: generated and hand-written test trees have separate owners
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 1: universal adapter foundation

- Status: Complete
- Files changed: `packages/pangit/src/fluent-api/adapter-contract/**`, `entities/**`,
  `provider-registry.ts`, `native-access/**`, and Gitea `response.ts`
- Contract decisions: D-001 through D-010 and D-021
- Unit/static gates: pagination, error mapping, abort, bounded concurrency, registry, and type tests
  passed
- Gitea 1.27.2 E2E: cross-cutting pagination/error assertions passed in the applicable core
  contracts
- Gitea 1.26.4 E2E: cross-cutting pagination/error assertions passed in the applicable core
  contracts
- Request-budget proof: malformed page/container cursors and pre-aborted operations recorded zero
  requests
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 2: authentication

- Status: Complete
- Files changed: `packages/pangit/src/fluent-api/auth/**`, Gitea `authentication.ts`, and
  `tests/e2e/hand-written/fluent-api-contracts/authentication/**`
- Contract decisions: none
- Unit/static gates: auth orchestration, UTF-8 Basic/TOTP, OAuth/PKCE, and secret-safety tests
  passed
- Gitea 1.27.2 E2E: `core/authentication` passed
- Gitea 1.26.4 E2E: `core/authentication` passed
- Request-budget proof: token/Basic use one `userGetCurrent`; OAuth uses one exchange and one
  identity request; rejected/pre-aborted paths use zero
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 3: containers and repositories

- Status: Complete
- Files changed: fluent `FluentClient.ts`, `entities/RepositoryContainer.ts`,
  `entities/Repository.ts`, and Gitea repository/container modules
- Contract decisions: D-001 and D-018
- Unit/static gates: public API and provider/error tests passed
- Gitea 1.27.2 E2E: `core/repositories` passed
- Gitea 1.26.4 E2E: `core/repositories` passed
- Request-budget proof: direct get/find/exists/edit/delete, one-page lists, initialized creation,
  and malformed cursor zero-request proof recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 4: forks

- Status: Complete
- Files changed: fluent fork contract/entity wiring, Gitea `forks.ts`, and fork E2E fixtures
- Contract decisions: none
- Unit/static gates: final consolidated gates passed
- Gitea 1.27.2 E2E: `core/forks` passed
- Gitea 1.26.4 E2E: `core/forks` passed
- Request-budget proof: one list page and one create followed only by bounded known-target readiness
  reads
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 5: branches and divergence

- Status: Complete
- Files changed: fluent branch contracts/entities, Gitea `branches.ts`, and branch E2E fixtures
- Contract decisions: D-004 and D-009
- Unit/static gates: final consolidated gates passed
- Gitea 1.27.2 E2E: `core/branches` passed
- Gitea 1.26.4 E2E: `core/branches` passed
- Request-budget proof: direct mutations/reads, one-page lists, and two minimal count probes per
  divergence recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 6: tags

- Status: Complete
- Files changed: fluent tag contracts/entities, Gitea `tags.ts`, OpenAPI normalizer, and tag E2E
- Contract decisions: D-011 and D-014
- Unit/static gates: generated response normalization and public tag tests passed
- Gitea 1.27.2 E2E: `core/tags` passed
- Gitea 1.26.4 E2E: `core/tags` passed
- Request-budget proof: one page or one direct get/create/delete request per operation
- Generation proof: normalized 201 response is generator-owned and deterministic
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 7: commits, ancestry, refs, and contributors

- Status: Complete
- Files changed: fluent commit contracts/entities, Gitea `commits.ts`, and commit E2E fixtures
- Contract decisions: D-004, D-005, D-009, D-010, and D-012
- Unit/static gates: bounded concurrency, cancellation, request-budget, and extension tests passed
- Gitea 1.27.2 E2E: `core/commits` and `gitea-extension/compare-diff-patch` passed
- Gitea 1.26.4 E2E: `core/commits` passed; version-limited compare extension is absent
- Request-budget proof: direct gets, minimal count probes, and bounded ancestry/ref/contributor
  scans recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 8: content and directory reads

- Status: Complete
- Files changed: fluent content contracts/entities, Gitea `content.ts`, and content E2E fixtures
- Contract decisions: D-002, D-003, D-013, and D-019
- Unit/static gates: batch limits, concurrency, contextual validation, and linked-content tests
  passed
- Gitea 1.27.2 E2E: `core/content-reads` passed
- Gitea 1.26.4 E2E: `core/content-reads` passed
- Request-budget proof: direct exact-path reads, bounded POST batches, unique-prefix parent
  comparison, and no external dereference recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 9: atomic file changes

- Status: Complete
- Files changed: content operation extension, Gitea `content.ts`, and file-change E2E fixtures
- Contract decisions: D-018
- Unit/static gates: extension-context and concurrency validation tests passed with zero
  invalid-input requests
- Gitea 1.27.2 E2E: `core/file-change-commits` and `gitea-extension/file-change-commit` passed
- Gitea 1.26.4 E2E: `core/file-change-commits` and `gitea-extension/file-change-commit` passed
- Request-budget proof: one `repoChangeFiles` plus at most one batch SHA pre-read recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 10: pull-request discovery and contents

- Status: Complete
- Files changed: fluent pull-request contracts/entities, Gitea `pull-requests.ts`, and PR discovery
  E2E
- Contract decisions: D-007 and D-008
- Unit/static gates: final consolidated gates passed
- Gitea 1.27.2 E2E: `core/pull-request-discovery` passed
- Gitea 1.26.4 E2E: `core/pull-request-discovery` passed
- Request-budget proof: direct get/base-head lookup, server-side search, and one-page commit/file
  lists recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 11: pull-request mutation and merge

- Status: Complete
- Files changed: fluent PR mutation contracts, Gitea `pull-requests.ts`, normalizer, and PR E2E
- Contract decisions: D-008, D-014, and D-020
- Unit/static gates: scheduled-merge bounds and local extension validation tests passed
- Gitea 1.27.2 E2E: `core/pull-request-mutation`, `core/pull-request-merge`, and
  `gitea-extension/pull-request-merge` passed
- Gitea 1.26.4 E2E: the same three contracts passed
- Request-budget proof: direct create/edit/close/merge, bounded known-PR polling, and optional
  one-branch cleanup recorded
- Generation proof: scheduled-merge 201 response normalization is deterministic
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 12: reviewers, approvals, and comments

- Status: Complete
- Files changed: PR review/comment contracts, Gitea `pull-requests.ts`, review adapter, and E2E
  fixtures
- Contract decisions: none
- Unit/static gates: all rich review extension fields validate before provider work
- Gitea 1.27.2 E2E: `core/pull-request-reviews-comments` and `gitea-extension/pull-request-review`
  passed
- Gitea 1.26.4 E2E: both contracts passed
- Request-budget proof: direct reviewer, approval, text-comment, and inline-review operations
  recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 13: commit statuses

- Status: Complete
- Files changed: fluent status contracts/entities, Gitea `commit-statuses.ts`, and status E2E
  fixtures
- Contract decisions: D-006
- Unit/static gates: reference/state validation and extension tests passed
- Gitea 1.27.2 E2E: `core/commit-statuses` and `gitea-extension/commit-status` passed
- Gitea 1.26.4 E2E: both contracts passed
- Request-budget proof: direct ref list/combined-get/create and explicit PR-head resolution recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 14: optional shared capabilities

- Status: Complete
- Files changed: universal optional contracts/entities, Gitea `optional-capabilities/**`, and
  optional E2E contracts
- Contract decisions: D-015, D-016, and D-017
- Unit/static gates: direct operation, bounds, local capability, extension, and cancellation tests
  passed
- Gitea 1.27.2 E2E: profile, issues, releases, webhooks, CI discovery, packages, blobs, review
  objects, branch rules, and unsupported-module contracts passed
- Gitea 1.26.4 E2E: the same optional contracts passed
- Request-budget proof: every supported operation's direct/bounded evidence and both unsupported
  modules' zero-request evidence recorded
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 15: Gitea extensions and native scopes

- Status: Complete
- Files changed: `provider-extensions/**`, `native-access/**`, Gitea `native/**`, and dedicated E2E
- Contract decisions: D-009, D-011, and D-013
- Unit/static gates: positive/negative public type proofs and registry/version tests passed
- Gitea 1.27.2 E2E: all seven extension contracts/modes and both native-access contracts passed
- Gitea 1.26.4 E2E: every advertised extension and both native-access contracts passed; the
  1.27.2-only compare output is statically absent
- Request-budget proof: native payload access makes zero extra requests; extension request sequences
  are recorded independently
- Generation proof: not applicable
- Next unchecked item: none
- Blocker: none

### 2026-09-02 — Phase 16: integration and publication

- Status: Complete
- Files changed: package exports/docs, E2E publisher/schema, generated outputs, and published
  evidence
- Contract decisions: D-014 through D-021
- Unit/static gates: `deno fmt --check`, `deno task check`, `deno task lint`, `deno task test`,
  `git diff --check`, and `deno publish --dry-run --allow-dirty` passed
- Gitea 1.27.2 E2E: unfiltered raw suite passed 482/482 operations and 543 cases; all 32 fluent
  contracts passed
- Gitea 1.26.4 E2E: unfiltered raw suite passed 471/471 operations and 532 cases; all 32 fluent
  contracts passed
- Request-budget proof: stable contract IDs and deterministic request tables are published in both
  `packages/pangit/docs/test-results/gitea/*/test-result.md` reports
- Generation proof: two final `deno task generate --cached` runs preserved authored hashes
  `c822f028...` (fluent), `92088cf8...` (adapters), and `9bed317b...` (hand-written E2E), with
  identical generated hashes `c2e92d34...` (clients) and `f5f42e5f...` (generated E2E)
- Next unchecked item: none
- Blocker: none

## 33. Final handoff statement

Complete on 2026-09-02. The public fluent adapter now covers authentication, repository containers,
the complete 52-method repository/fork/branch/tag/commit/content/pull-request/status core, immutable
entities, bounded pagination/composition, stable errors, cancellation, and request-aware options.
Gitea implements that contract for 1.26.4 and 1.27.2.

Optional Gitea capabilities cover current-user profile, issues/comments, releases/assets, repository
webhooks, CI discovery, packages, blob reads, submitted pull-request reviews, configured branch
rules, and effective protection. Narrow operation extensions cover atomic file-change controls,
1.27.2 diff/patch comparison, pull-request merge/review modes, extended status states, issue content
versions, and branch-rule priority. Exact-version native access exists at client, container,
repository, and entity scopes. Deployments/environments and gists/snippets remain intentionally
unsupported and are proven to cost zero provider requests.

The unfiltered live run passed and published:

- `packages/pangit/docs/test-results/gitea/1.26.4/test-result.md` — 471/471 generated raw
  operations, 532 raw cases, and 32/32 fluent contracts.
- `packages/pangit/docs/test-results/gitea/1.27.2/test-result.md` — 482/482 generated raw
  operations, 543 raw cases, and 32/32 fluent contracts.

Two final cached generations preserved all three authored-tree hashes and produced identical raw
client and generated-E2E hashes. Format, type-check, lint, 70 root tests, 47 PanGit tests, 16 site
tests, public API/documentation tests, publish dry-run, full live E2E, report publication, Docker
cleanup, and `git diff --check` all passed.
