# Annotated-tag commit status lookup

Confirmed on stock Forgejo **15.0.7** and **16.0.3**. PanGit handles this within its Forgejo
adapter; no patched server is required.

## Minimal reproduction

Use an initialized repository with an annotated tag pointing to commit `C`:

1. `POST /repos/{owner}/{repo}/statuses/C` with `{"context":"ci/repro","state":"success"}`.
2. `GET /repos/{owner}/{repo}/commits/C/status` returns that status.
3. `GET /repos/{owner}/{repo}/commits/{annotated-tag}/status` returns an empty combined status.

Forgejo's `ResolveRefOrSha` takes the tag reference's object ID without peeling the annotated tag to
its commit. The status is attached to the commit, not the tag object. See the pinned
[reference resolver](https://codeberg.org/forgejo/forgejo/src/tag/v16.0.3/routers/api/v1/utils/git.go)
and
[status handler](https://codeberg.org/forgejo/forgejo/src/tag/v16.0.3/routers/api/v1/repo/status.go).

## Client behavior and regression

The adapter resolves named refs through `repoGetSingleCommit`, then uses the returned immutable SHA
for status operations. Known full commit SHAs remain direct. It does not synthesize a status or
silently reinterpret an empty provider response.

The
[unit regression](../../../../../../packages/pangit/src/fluent-providers/forgejo/commit-statuses/ref-resolution_test.ts)
guards the request boundary. The live `core/commit-statuses` contract creates an annotated tag and
verifies its actual status:

```bash
deno task e2e --git-host forgejo --suite fluent --contract core/commit-statuses
```

Upstream follow-up: fix annotated-tag peeling in the reference resolver and add a server regression
covering tag and commit status equivalence. No upstream issue or pull request has been submitted.
