# GitLab fluent adapter

GitLab `18.11.11` and `19.3.1` use the shared fluent API with the exact selected generated client.
Pass the host root or its `/api/v4` URL; nested namespace paths are supported.

```ts
import { createClient } from "@mannsion/pangit/api";

const connection = await createClient("gitlab", "19.3.1", "https://gitlab.example.com");
const git = await connection.auth.token(Deno.env.get("GITLAB_TOKEN")!);
const repo = await (await git.container("acme/platform")).repository("service");
const commit = await repo.content.commitChanges({
  branch: "main",
  newBranch: "update-readme",
  message: "Update README",
  changes: [{ operation: "update", path: "README.md", content: "Updated.\n" }],
}).execute();
const mr = await repo.pullRequests.create({
  title: "Update README",
  source: { owner: repo.owner, repository: repo.name, branch: "update-readme" },
  targetBranch: "main",
});
await repo.statuses.set({ kind: "commit", sha: commit.sha }, {
  context: "ci/documentation",
  state: "success",
}).execute();
console.log(mr.url);
```

Token authentication verifies identity. OAuth uses authorization-code flow with S256 PKCE and state
validation; set `webBaseUrl` if the browser-facing root differs from the API URL. Projects retain
numeric IDs; merge requests and issues use project-local IIDs. User containers fall back to `user:`
IDs when namespace administration metadata is hidden.

Supported workflows include project lifecycle and forks; branches/tags; commit history, comparisons,
merge bases and contributors; verified blob and file reads; atomic file changes; merge requests,
comments, inline discussions, reviewer assignment, approval and merging; statuses; issues; releases
and assets; package metadata/deletion; webhooks; configured protection rules; and CI discovery.

## Provider differences

Unsupported operations fail explicitly with `CapabilityUnavailableError`. Capability metadata is
available for optional modules. Provider differences do not change the shared method signatures.

| Operation                          | GitLab behavior                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Effective branch protection        | Unavailable on both pinned versions due to **GL-001**, a confirmed server cache bug. The portable `protected` flag is omitted. Configured-rule CRUD remains available; it does not guarantee correct server enforcement. [Evidence and upstream fix](../../../tests/e2e/hand-written/diagnostics/gitlab/protection-cache/README.md). |
| Branch rename                      | Unavailable: no atomic API; create/delete could discard concurrent commits.                                                                                                                                                                                                                                                          |
| Persistent draft/submitted reviews | Unavailable: publishing GitLab draft notes replaces them with comments, without a persistent review identity. Core comments, discussions and approvals work.                                                                                                                                                                         |
| Authentication                     | Token and OAuth supported; password-based HTTP Basic is unavailable.                                                                                                                                                                                                                                                                 |
| Release flags                      | Draft and prerelease flags unavailable. Asset links use project uploads; deleting a link retains its upload. Private download URLs need authenticated access.                                                                                                                                                                        |
| Webhooks                           | JSON only; no writable active/inactive switch.                                                                                                                                                                                                                                                                                       |
| Branch-rule fields                 | Push and force-push permissions supported. Other portable policy fields and ordered priority unavailable.                                                                                                                                                                                                                            |
| CI filtering                       | Runs are pipelines; historical configuration-path filtering unavailable. Artifact IDs are `job:<id>`.                                                                                                                                                                                                                                |
| Packages                           | `owner` identifies a project by ID or full path. Upload/download remain native operations.                                                                                                                                                                                                                                           |

Package-version lookups inspect at most 10 pages of 100 entries. Package-file reads enforce
`maxFiles` and reject an empty page that advertises continuation, so incomplete results cannot be
reported as complete.

List methods return one bounded page and an opaque continuation cursor. Commit file lists traverse
provider pages; GitLab's server diff limits still apply. Merge-base traversal and other
multi-request operations enforce their explicit bounds. File reads pin refs and verify blob hashes;
atomic writes use GitLab commit actions and `last_commit_id` for checked paths. Upserts and blob
preconditions read the selected `startSha` when creating a branch from an earlier commit; that
immutable SHA pins the checked content. Native `last_commit_id` guards apply to mutable branch
sources. Fork and merge completion is polled with cancellation and a timeout. Approvals require an
edition exposing the approvals API; the E2E environment uses the free tier of the EE image without a
paid license.

GitLab 19.3.1 also rejected a commit immediately after successfully creating its branch in the
recorded E2E run. PanGit preserves that server error; it does not retry the mutation. The focused
[branch-cache investigation](../../../tests/e2e/hand-written/diagnostics/gitlab/branch-names-cache/README.md)
records the failure and upstream follow-up.

## Extensions and native access

Operation extensions use `.gitlab(callback).execute()`: file commits accept `force` and `startSha`
(with `newBranch`); statuses accept `running`, `canceled` and `skipped`; merging accepts
`headCommitId`, `mergeMessage` and `squashMessage`. Callbacks receive a frozen operation context.

```ts
await repo.statuses.set({ kind: "commit", sha: commit.sha }, {
  context: "ci/native",
  state: "pending",
}).gitlab(() => ({ state: "running" })).execute();

await repo.native.gitlab(({ client, repository }) => {
  console.log(repository.id, typeof client.getApiV4Projects);
});
```

Native access exposes the exact generated client and original payload without an extra request.
Typed adapter supplements cover documented GitLab endpoints missing from its pinned OpenAPI;
generated clients remain unchanged.

## Standalone end-to-end tests

```bash
deno task e2e --git-host gitlab --version 19.3.1 --suite fluent
deno task e2e --git-host gitlab --version 18.11.11 --suite raw
deno task e2e --git-host gitlab --version 19.3.1 --suite fluent --contract core/oauth
deno task e2e # refresh tracked evidence for every provider/version
```

Each run starts stock GitLab on a private Compose network with tmpfs data, runtime credentials, a
webhook receiver and a real isolated CI runner. No Gitea service or Docker socket is required.
Startup takes several minutes; readiness and shutdown are bounded. Credentials are removed at
teardown. Authoritative definitions live under `tests/e2e/hand-written`; regenerate them with
`deno task generate --cached` after active Docker runs have stopped.

Fluent tests exercise real OAuth, mutations, approvals, webhook delivery and pipeline artifacts. Raw
results distinguish authenticated success cases from negative endpoint coverage. Known provider
defects are recorded explicitly in fluent results. Full-run evidence is tracked under
`tests/e2e/results`; focused runs and full server logs are local only.
