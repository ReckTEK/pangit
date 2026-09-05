# Forgejo and Codeberg

Forgejo `15.0.7` (LTS) and `16.0.3` implement the universal fluent contract through an independent
provider. Each version has its own generated REST client, loaded on first use.

```ts
import { createClient, createCodebergClient } from "@mannsion/pangit/api";

const selfHosted = await createClient("forgejo", "16.0.3", {
  baseUrl: "https://forgejo.example.com/api/v1",
});
const codeberg = await createCodebergClient("16.0.3");
const git = await codeberg.auth.token(Deno.env.get("CODEBERG_TOKEN")!);
const repo = await (await git.container("your-username")).repository("your-repository");
console.log(await repo.content.readText("README.md"));
```

For a standalone import, `@mannsion/pangit/fluent/forgejo` exports synchronous `createClient` and
`createCodebergClient` factories. Their version-specific REST clients remain lazy.

## Codeberg compatibility

[Codeberg runs Forgejo](https://docs.codeberg.org/getting-started/what-is-codeberg/#codeberg-vs-forgejo).
`createCodebergClient` selects the same Forgejo implementation and fixes the API and browser URLs to
Codeberg. Authentication, native access, and operation extensions remain named `forgejo`.

Choose the API contract explicitly. PanGit does not detect or upgrade server versions. Codeberg can
run a development release ahead of stable Forgejo; consult its `/api/v1/version` endpoint when
selecting a contract. Local E2E results prove behavior on the pinned stock Forgejo releases; they do
not claim tests against Codeberg user accounts or access to Codeberg administrator operations.
Instance settings, token permissions, quotas, and hosted-service policies still apply.

The existing `@mannsion/pangit/providers/codeberg/latest` REST client remains a separately pinned
Codeberg schema snapshot. It does not select a different fluent implementation.

## Supported workflows

The provider covers repositories and organizations, forks, branches and tags, commit history and
comparisons, merge bases, file and verified blob reads, atomic file changes, pull requests and
reviews, commit statuses, issues and comments, releases and assets, packages, webhooks, branch
protection, and Actions discovery. Token, HTTP Basic with optional OTP, and OAuth authorization-code
flow with PKCE are supported.

| Area              | Forgejo behavior                                                                                                                                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File batches      | Reads deduplicate paths and use at most four concurrent requests. Writes pre-read required source files, then send one atomic mutation, capped at 50 changes. Moves preserve file bytes; upserts choose create/update from the source response.                                                 |
| Branch search     | Filters the returned page locally; cursors still describe the provider page.                                                                                                                                                                                                                    |
| Commit statuses   | Named references resolve to a commit before status reads/writes. This avoids the server's annotated-tag lookup behavior. Known commit SHAs stay direct. Empty combined status retains the provider's empty state.                                                                               |
| Branch rules      | Configured-rule CRUD and effective protection work. Ordered priority and writable force-push permission are unavailable.                                                                                                                                                                        |
| Issue concurrency | No content-version guard is exposed by these releases.                                                                                                                                                                                                                                          |
| CI on Forgejo 15  | Workflow files and runs work. Job and artifact discovery require Forgejo 16 and throw `CapabilityUnavailableError` before HTTP.                                                                                                                                                                 |
| CI on Forgejo 16  | Jobs and artifacts use a known run, with a 1,000-item response bound. Job IDs encode `run:<runId>:job:<jobId>`; native data retains the server's numeric job ID.                                                                                                                                |
| Workflow paths    | Explicit `.forgejo/workflows`, `.gitea/workflows`, and `.github/workflows` paths are accepted; a bare name uses `.forgejo/workflows`. Run filtering uses Forgejo's filename filter. A run reporting only a filename does not invent a `workflowPath`; its native payload retains `workflow_id`. |
| Workflow state    | A workflow is a repository file; its activation state is `unknown`.                                                                                                                                                                                                                             |
| Package deletion  | Version deletion is direct. Whole-package deletion snapshots exact matching versions within 10 pages of 100 entries before deleting anything. An exceeded bound fails without mutation.                                                                                                         |

Capability metadata describes these distinctions. Unsupported operations fail explicitly instead of
approximating server behavior. Gitea-specific compare-output, rule-priority, and issue-version
extensions are not part of the Forgejo API.

## Extensions and native access

Forgejo callbacks expose additional options on file commits, PR merges, review creation, commit
statuses, and Basic authentication. For example:

```ts
await repo.statuses.set({ kind: "commit", sha: "<commit-sha>" }, {
  context: "ci/optional",
  state: "pending",
}).forgejo(() => ({ state: "skipped" })).execute();

await repo.native.forgejo(({ client, repository }) => {
  console.log(repository.id, typeof client.repoGet);
});
```

Native callbacks retain the exact selected version's generated types and original response payload.
Scheduled merge extensions require an explicit completion polling bound. File-commit extensions
include committer/date controls, signoff, and `forceOverwriteNewBranch`.

## Standalone Docker E2E

```bash
deno task e2e --git-host forgejo --version 16.0.3
deno task e2e --git-host forgejo --version 15.0.7 --suite fluent
deno task e2e --git-host forgejo --suite fluent --contract core/commit-statuses
deno task e2e # refresh tracked evidence for the complete matrix
```

Each release starts its own stock Forgejo server, isolated Forgejo Actions runner, and webhook
receiver on a private Compose network. Data uses tmpfs; credentials and all containers, networks,
and volumes are removed at teardown. The runner executes a real workflow and uploads an artifact. It
needs no Docker socket and no Gitea or GitLab service.

Definitions live under `tests/e2e/hand-written/docker-environment-definitions/forgejo`; regenerate
with `deno task generate --cached` while test environments are stopped. Raw suites cover every
generated operation and distinguish successful lifecycles from negative cases. The 29 fluent
contracts test portable behavior, supported extensions, native access, and explicit version gaps.
Filtered runs retain local evidence in `.focused-results`; complete runs update `tests/e2e/results`.

The annotated-tag server behavior has a focused
[reproduction and upstream follow-up](../../../tests/e2e/hand-written/diagnostics/forgejo/annotated-tag-status/README.md).
