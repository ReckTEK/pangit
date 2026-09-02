# PanGit fluent API and provider-adapter architecture

This is the authored map of the implemented high-level architecture. It explains where portable
behavior ends, where Gitea behavior begins, and which files generation may replace. The historical
API-analysis tables remain separate and unchanged.

## One request path

```text
application
  -> universal fluent capability and immutable entity
  -> concern-specific GitHostAdapter contract
  -> selected Gitea concern implementation
  -> exact-version generated Gitea REST client
  -> Gitea HTTP API
```

Each layer has one job:

| Layer                | Owns                                                                                                 | Does not own                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Fluent API           | Public grammar, validation, immutable entities, pagination, cancellation, errors, capability handles | Gitea routes, DTOs, headers, or status quirks |
| Adapter contract     | Portable inputs/results and mandatory or optional concern interfaces                                 | Endpoint selection                            |
| Gitea adapter        | Endpoint bindings, response normalization, bounded compositions, exact-version differences           | Public cross-provider vocabulary              |
| Generated raw client | Native request/response types and HTTP operation registry from OpenAPI                               | Portable semantics or hand-written workflows  |

The fluent client selects one provider/version adapter once. Adapter loading and generated-client
loading stay lazy. A universal capability never switches on a provider name.

## Source ownership is visible in the tree

```text
packages/pangit/src/
├── fluent-api/                         HAND-WRITTEN universal layer
│   ├── adapter-contract/               concern interfaces and shared rules
│   │   └── optional/                   explicitly optional concern interfaces
│   ├── capabilities/                   public capability objects
│   │   └── optional/                   optional public capability objects
│   ├── entities/                       immutable normalized snapshots
│   ├── native-access/                  typed provider-native registries
│   ├── provider-extensions/            operation-scoped extension registry/builder
│   └── provider-registry.ts            implemented fluent providers and local support
├── git-host-adapters/gitea/            HAND-WRITTEN Gitea implementation
│   ├── GiteaGitHostAdapter.ts          small composite delegator
│   ├── GiteaAdapterContext.ts          lazy exact-version client/context
│   ├── response.ts                     centralized error/response normalization
│   ├── <core-concern>.ts               one implementation module per concern
│   ├── optional-capabilities/          one implementation per optional family
│   └── native/                         exact Gitea native callback contexts
└── generated-rest-clients/             GENERATED; never hand-edit
    └── <provider>/<version>/            exact provider/version client
```

`GitHostAdapter.ts` composes the concern contracts; it is not a duplicate monolithic API. The Gitea
class delegates each member to the matching concern module. Shared Gitea request plumbing stays in
the context and response modules.

## Public fluent grammar

```text
client
├── auth
├── currentUserProfile
├── packages
├── unsupportedOptionalCapabilities
├── containers() / container(name)
└── native.gitea(...)

container
├── repositories() / repository(name) / findRepository(name) / hasRepository(name)
├── createRepository(...)
└── native.gitea(...)

repository
├── rename(...) / delete(...)
├── forks / branches / tags / commits / content / pullRequests / statuses
├── issues / releases / webhooks / ciRuns / blobs / branchRules
└── native.gitea(...)
```

Authentication, container discovery, direct repository lookup, and repository creation surround the
reviewed 52-operation common core below; they are universal, but are not counted twice in that
ledger.

Authentication stays behind the same adapter boundary: `auth.token(...)`,
`auth.basic(...).gitea(...).authorize()`, and the `auth.login(...)` OAuth flow share portable
session grammar while Gitea owns its credentials, headers, authorization URL, and token exchange.
Normalized entities are frozen snapshots. A mutation returns a new snapshot when meaningful; it
never silently changes an entity already returned to the caller.

## Complete 52-operation common core

Public calls use short concern-local names. Adapter operations use globally explicit names for logs,
errors, bindings, and request-budget evidence.

| Numbers | Public placement           | Public methods                                                                                                                        | Adapter operations                                                                                                                                                                                                                                                                                   |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01-05   | `container` / `repository` | `repositories`, `repository`, `createRepository`, `rename`, `delete`                                                                  | `listRepositories`, `getRepository`, `createRepository`, `renameRepository`, `deleteRepository`                                                                                                                                                                                                      |
| 06-07   | `repository.forks`         | `list`, `create`                                                                                                                      | `listForks`, `createFork`                                                                                                                                                                                                                                                                            |
| 08-15   | `repository.branches`      | `list`, `get`, `exists`, `create`, `rename`, `delete`, `divergence`, `listDivergences`                                                | `listBranches`, `getBranch`, `branchExists`, `createBranch`, `renameBranch`, `deleteBranch`, `getDivergence`, `listBranchDivergences`                                                                                                                                                                |
| 16-19   | `repository.tags`          | `list`, `get`, `create`, `delete`                                                                                                     | `listTags`, `getTag`, `createTag`, `deleteTag`                                                                                                                                                                                                                                                       |
| 20-28   | `repository.commits`       | `list`, `get`, `getMany`, `compare`, `files`, `mergeBases`, `countReachable`, `findRefs`, `contributors`                              | `listCommits`, `getCommit`, `getCommits`, `compareCommits`, `listCommitFiles`, `findMergeBases`, `countReachableCommits`, `findRefsForCommit`, `listContributors`                                                                                                                                    |
| 29-36   | `repository.content`       | `read`, `readFiles`, `getDirectory`, `listDirectory`, `readPathMetadataBatch`, `readSymlink`, `readSubmodule`, `commitChanges`        | `readContent`, `readFiles`, `getDirectory`, `listDirectory`, `readPathMetadataBatch`, `readSymlink`, `readSubmodule`, `commitFileChanges`                                                                                                                                                            |
| 37-49   | `repository.pullRequests`  | `list`, `get`, `find`, `isMerged`, `commits`, `files`, `create`, `update`, `close`, `merge`, `requestReviewers`, `approve`, `comment` | `listPullRequests`, `getPullRequest`, `findPullRequest`, `isPullRequestMerged`, `listPullRequestCommits`, `listPullRequestFiles`, `createPullRequest`, `updatePullRequest`, `closePullRequest`, `mergePullRequest`, `requestPullRequestReviewers`, `approvePullRequest`, `publishPullRequestComment` |
| 50-52   | `repository.statuses`      | `list`, `get`, `set`                                                                                                                  | `listCommitStatuses`, `getCommitStatus`, `setCommitStatus`                                                                                                                                                                                                                                           |

All 52 operations are mandatory for an implemented fluent provider. Gitea 1.26.4 and 1.27.2
implement this composite contract.

## Optional Gitea capability inventory

Optional means the family is not required of every future fluent provider. It does not mean the
Gitea implementation is partial or remotely probed.

| Public placement                               | Portable operations implemented by Gitea                                                        | Deliberate boundary                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `client.currentUserProfile`                    | `current`                                                                                       | Direct authenticated profile lookup                                                                 |
| `repository.issues`                            | `list`, `get`, `create`, `update`, `setState`; `comments.list/get/create/update/delete`         | Time tracking, dependencies, reactions, attachments, and watchers stay native                       |
| `repository.releases`                          | `list`, `get`, `getByTag`, `create`, `update`, `delete`; `assets.list/get/upload/update/delete` | Signing stays native; asset lists require an explicit bound                                         |
| `repository.webhooks`                          | `list`, `get`, `create`, `update`, `delete`                                                     | Provider configuration, delivery inspection, and test delivery stay native                          |
| `repository.ciRuns`                            | `workflow`, `runs`, `run`, `jobs`, `job`, `findArtifact`, `artifact`                            | Read-only; workflow/artifact global listing and all mutations stay native                           |
| `client.packages`                              | `list`, `versions`, `get`, `find`, `files`, `deleteVersion`, `delete`                           | Upload, download, and repository linking stay native; file results require a bound                  |
| `repository.blobs`                             | `get`                                                                                           | Direct SHA-addressed byte read                                                                      |
| `repository.pullRequests.reviews(pullRequest)` | `list`, `get`, `create`, `submit`                                                               | Dismissal, replies, resolution, and richer provider positions require an extension or native access |
| `repository.branchRules`                       | `list`, `get`, `create`, `update`, `delete`, `effective`                                        | Configured rules and effective protection are distinct; listing requires `maxRules`                 |

Gitea explicitly reports these analyzed families as unsupported, locally and without methods:

- deployments/environments;
- gists/snippets.

Read them from `client.unsupportedOptionalCapabilities.support`. Every supported capability also
exposes a frozen `support` object describing each operation as direct, one-page, bounded composite,
provider extension, or native-only. Client-scoped support comes from the exact-version provider
registry, so reading it does not even load the adapter.

## Operation-scoped Gitea extensions

For operations with an extension builder, portable behavior executes with `.execute()`. A real
Gitea-only enhancement is selected with `.gitea(context => options).execute()`. The callback
receives only frozen data relevant to that operation, never the raw client, and it can be configured
only once.

| Registered operation        | Gitea-only enhancement                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| `commits.compare`           | Raw diff/patch result on Gitea 1.27.2 only                                       |
| `content.commitChanges`     | Force push, signoff, committer, and author/committer dates                       |
| `pullRequests.merge`        | Gitea merge modes, force/head guards, messages, and bounded scheduled completion |
| `pullRequestReviews.create` | Gitea review event and rich inline positions                                     |
| `statuses.set`              | Gitea `error`, `warning`, and `skipped` states                                   |
| `issues.update`             | Gitea `content_version` concurrency guard                                        |
| `branchRules.setOrder`      | Ordered branch-rule priority                                                     |

The explicit `ProviderExtensionRegistry` is the single index. If unrestricted Gitea functionality is
needed, use a native door instead of growing an untyped option bag.

## Typed native doors

Every native callback is narrowed to the selected Gitea version:

- `client.native.gitea(...)` exposes the complete exact-version generated client;
- container and repository native doors expose that client plus their already-fetched payload;
- branch, tag, commit, content, pull request, core review, and commit-status entities retain exact
  Gitea payloads;
- current-user, issue/comment, release/asset, webhook, package/file, blob, submitted-review,
  branch-rule/effective-protection, workflow/run/job/artifact entities retain their exact payloads.

Reading an entity native payload performs no refresh request. Native calls deliberately use raw
generated request/response/error semantics; the portable guarantees apply outside that door.

## Bounded work, pagination, cancellation, and errors

| Operation shape               | Default cost rule                                                            |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Direct get/find/exists/delete | One direct-address request; no list-to-scan or delete preflight              |
| Page list                     | At most one provider page, with an opaque returned cursor                    |
| Multi-ID lookup               | Only unique requested IDs, bounded concurrency, stable input order           |
| Simple mutation               | One mutation; one direct refresh only when required common state is absent   |
| Composite traversal           | Explicit item/request bounds and bounded concurrency; report incomplete work |
| Readiness poll                | Poll only the known created identity under a caller-visible bound            |

`Page<T>` freezes `items` and may return `nextCursor` and provider `totalCount`. `ScanPage<T>` also
states whether a bounded derived scan was complete. No default list silently drains every page.

Every networked fluent operation accepts one trailing options object containing `signal`. An
already-aborted signal is rejected before HTTP; composite operations forward the same signal to
every request, delay, and poll. Ordinary mutations are not retried automatically.

The stable fluent error family distinguishes authentication, permission, not-found, conflict,
validation, rate limit, cancellation, timeout, incomplete history, unavailable content, unsupported
capability, provider invariant, unavailable adapter, and other provider failures. Errors retain safe
provider/version/operation/status/request metadata and the native cause. Only a confirmed not-found
becomes `undefined` or `false`; permission and transport failures never become absence.

## Fluent-provider support versus raw-client support

`FluentProvider` currently contains only `"gitea"`, with versions `1.26.4` and `1.27.2`. This keeps
compile-time promises aligned with implemented adapter behavior.

The raw `Provider` registry remains wider and continues to expose all generated clients:

| Raw provider     | Generated versions   |
| ---------------- | -------------------- |
| Azure DevOps     | `latest`             |
| Bitbucket Cloud  | `latest`             |
| Codeberg/Forgejo | `latest`             |
| Gitea            | `1.26.4`, `1.27.2`   |
| GitHub           | `latest`             |
| GitLab           | `18.11.11`, `19.3.1` |

Adding another raw OpenAPI client does not falsely add a fluent adapter. Adding a fluent provider
requires implementing the entire mandatory adapter contract and advertising only proven optional
capabilities.

## Generated raw E2E versus hand-written fluent E2E

The directory names state both purpose and ownership:

```text
tests/e2e/
├── hand-written/
│   ├── raw-rest-client-test-cases/             authored endpoint scenario inputs
│   ├── fluent-api-contracts/                   authored portable behavior contracts
│   │   ├── <core concern>/
│   │   └── optional/<capability>/
│   ├── git-host-adapter-tests/gitea/           authored Gitea catalog and fixtures
│   │   ├── gitea-contract-ids.ts
│   │   ├── gitea-contract-catalog.ts
│   │   └── GiteaE2EFixtureDriver.ts
│   └── docker-environment-definitions/gitea/   authored environment inputs
└── generated/
    ├── raw-rest-client-tests/gitea/<version>/  generated raw endpoint suite
    └── docker-environments/gitea/<version>/    generated runnable environment
```

`deno task generate --cached` may replace only generated, marker-owned outputs. It reads and
validates hand-written test inputs but never writes the `tests/e2e/hand-written/` tree. The raw
suite proves emitted REST methods against the real provider. The separate fluent suite proves
portable behavior, request IDs/budgets, errors, cancellation, extensions, and native doors through
the Gitea adapter. Each fluent contract has a stable catalog ID so it can run independently.

Live evidence is written under `tests/e2e/results/` and published into
`packages/pangit/docs/test-results/`; evidence is neither source code nor generator input.
