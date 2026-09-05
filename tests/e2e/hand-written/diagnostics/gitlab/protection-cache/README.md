# GL-001: stale GitLab branch permissions

**Upstream fix required; not yet submitted.** Reproduced in stock GitLab `18.11.11-ee.0` and
`19.3.1-ee.0`, independently of PanGit. This directory owns the investigation and upstream
follow-up.

Deleting a protection rule can return success while GitLab still rejects real Git pushes as
protected. The reverse race can leave a newly protected branch treated as unprotected. An older
reader can repopulate Redis after invalidation, using a previously loaded rule association or a
calculation made before the change. The cached answer can persist for a day.

PanGit reports effective protection as unavailable (`CapabilityUnavailableError`, `GL-001`) and
omits the portable branch `protected` flag. Configured-rule CRUD remains usable, but it cannot
repair GitLab's enforcement. Native access preserves the original server response. Normal E2E runs
use stock images and report this defect explicitly; they do not apply the candidate patch.

## Evidence and candidate

[Recorded evidence](evidence.json) identifies the exact server commits and candidate patch hash. All
three deterministic cases fail on both stock versions and pass with the candidate. The raw HTTP
probe reproduced the real failure on the second fresh project on 19.3.1; 100 fresh projects on
18.11.11 did not hit that timing, despite its deterministic failures. Independent Developer Git
pushes confirm this affects enforcement, not just response metadata.

[gitlab-candidate.patch](gitlab-candidate.patch) reads fresh database state on cache misses and uses
an atomic Redis generation check to prevent obsolete calculations from being stored after
invalidation. A new cache namespace isolates old readers. The candidate passed the deterministic
cases, HTTP cycles, real pushes, and repeated fluent mutations on both versions. It still needs
GitLab's own regression suite and upstream review.

## Upstream follow-up

- [ ] Fork `gitlab-org/gitlab` and port the candidate to the target branch.
- [ ] Add GitLab regression specs for loaded associations and create/delete during cache writes;
      cover group-inherited rules, invalidation and mixed-version rollout.
- [ ] Submit an upstream merge request (pull request) with the reproducer, evidence and fix; record
      its URL here.
- [ ] Add the fixed GitLab release to PanGit and restore effective-protection reads and the portable
      flag only after stock-image enforcement tests pass. Keep the guard on affected versions.

## Reproduce in a disposable instance

Do not run alongside another test using the same generated credential directory. Use either pinned
version. The probe intentionally exits nonzero when it reproduces the defect and retains its
project.

```bash
probe_compose=tests/e2e/generated/docker-environments/gitlab/19.3.1/compose.yaml
probe_sources=tests/e2e/hand-written/diagnostics/gitlab/protection-cache
docker compose -p pangit-protection-probe -f "$probe_compose" up -d --wait gitlab
docker compose -p pangit-protection-probe -f "$probe_compose" exec -T gitlab \
  sh -c 'cat > /tmp/diagnose-branch-protection.rb' < "$probe_sources/diagnose-branch-protection.rb"
docker compose -p pangit-protection-probe -f "$probe_compose" exec -T \
  -e PROBE_MODE=fresh -e PROBE_CYCLES=100 gitlab \
  /opt/gitlab/embedded/bin/ruby /tmp/diagnose-branch-protection.rb
```

For a retained failure, run the same script with `PROBE_PROJECT=<project_id>` and
`PROBE_BRANCH=rule-target` to test an independent Developer push. With no `PROBE_*` options it
creates its own project and Developer, checks protected/unprotected pushes and runs 25 rule cycles.

Copy `diagnose-protection-cache.rb` into the container the same way, then run
`PROBE_PROJECT=<project_id> gitlab-rails runner /tmp/diagnose-protection-cache.rb` inside it. Choose
an existing unprotected `rule-target` branch. This forces all three races using real GitLab
services, database records and Redis, without sleeps or PanGit.

To evaluate the candidate, apply the patch with `git apply --check` and `git apply` to the two
server source files under `/opt/gitlab/embedded/service/gitlab-rails`, then restart both Puma and
Sidekiq. Repeat the same probes. `run-fluent-contract.ts <version> [cycles=20]` additionally
exercises fluent mutations and checks raw server enforcement after each step. Run it inside the
fixture network with `/sandbox-auth/api-token` mounted. It deliberately bypasses the portable GL-001
read guard, never retries mutations or flushes caches. Keep candidate evidence separate from
stock-image E2E results.

After collecting evidence:
`docker compose -p pangit-protection-probe -f "$probe_compose" down --volumes`.
