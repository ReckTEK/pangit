# GL-002: stale GitLab branch existence

**Upstream investigation; no patch submitted.** A stock `19.3.1-ee.0` full E2E run accepted a new
branch with HTTP 201, then rejected a file commit to that branch 47 ms later with HTTP 400: “You can
only create or edit files when you are on a branch.” The failure happened in GitLab fixture setup,
independently of the Forgejo implementation. The failed run is retained in
[`tests/e2e/results/gitlab/19.3.1`](../../../../results/gitlab/19.3.1/summary.json).

[Recorded evidence](evidence.json) confirms the race on the stock image: the Git branch exists, its
cached existence is false, and the commit service rejects it.

## Isolated reproduction

GitLab's `RepositorySetCache.fetch` reads branch names, then writes them to Redis. An earlier reader
can write its old list after branch creation invalidates the cache. With
`ref_existence_check_gitaly` disabled (the stock default), `Repository.branch_exists?` consults this
list. `Commits::CreateService.validate_on_branch!` can consequently reject a real branch before
creating a commit.

[The probe](diagnose-branch-names-cache.rb) forces that ordering using the real HTTP branch API, Git
repository, Redis cache and commit service. It uses no PanGit code, sleeps, mutation retries, or
server patch. It creates its own disposable project and token. An observed race establishes that
this failure is possible; the original HTTP run did not trace the exact reader that supplied the
stale list.

Run only against the disposable fixture; it intentionally exits nonzero on reproduction:

```bash
probe_compose=tests/e2e/generated/docker-environments/gitlab/19.3.1/compose.yaml
probe_sources=tests/e2e/hand-written/diagnostics/gitlab/branch-names-cache
docker compose -p pangit-branch-cache-probe -f "$probe_compose" up -d --wait gitlab
docker compose -p pangit-branch-cache-probe -f "$probe_compose" exec -T gitlab \
  sh -c 'cat > /tmp/diagnose-branch-names-cache.rb' < "$probe_sources/diagnose-branch-names-cache.rb"
docker compose -p pangit-branch-cache-probe -f "$probe_compose" exec -T gitlab \
  gitlab-rails runner /tmp/diagnose-branch-names-cache.rb
docker compose -p pangit-branch-cache-probe -f "$probe_compose" down --volumes
```

Remove the generated `.auth` contents after teardown, retaining its `.gitignore`. Do not run beside
another test using that credential directory.

## Impact and follow-up

PanGit preserves the server error. Normal E2E uses stock configuration and retains the failure;
there is no hidden retry, cache flush, changed fixture sequence, or enabled feature flag. This is
separate from GL-001's branch-protection cache and does not affect Forgejo.

GitLab's existing
[Gitaly reference-check change](https://gitlab.com/gitlab-org/gitlab/-/merge_requests/198569)
replaces Redis existence checks behind the feature flag. Its rollout and suitability as a fix need
upstream verification; this investigation does not recommend enabling an experimental flag.

- [ ] Reproduce on GitLab's current development branch and verify the reference-check rollout.
- [ ] Fork GitLab and submit a regression spec and fix, or contribute this reproduction to the
      existing upstream change if it already addresses the race. Record the merge-request URL.
- [ ] Verify the fixed stock release with the isolated probe and unmodified fluent contract before
      clearing this finding.
