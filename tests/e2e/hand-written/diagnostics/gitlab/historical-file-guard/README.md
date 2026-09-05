# GL-003: historical commit file guards

GitLab's commit API accepts `start_sha` for a new branch, but its `last_commit_id` validator
compares file history against `@start_branch`. An unchanged file at the selected historical SHA can
therefore be rejected because the current source branch contains a newer version.

The live GitLab 18.11.11 extension contract reproduced HTTP 400:
`The file has changed since you started editing it: historical.txt`. The
[18.11.11](https://gitlab.com/gitlab-org/gitlab/-/blob/v18.11.11-ee/app/services/files/base_service.rb)
and
[19.3.1](https://gitlab.com/gitlab-org/gitlab/-/blob/v19.3.1-ee/app/services/files/base_service.rb)
handlers both use the branch in `file_has_changed?`.

PanGit checks blob preconditions at the explicit full `startSha` and creates the commit from that
immutable SHA. It sends `last_commit_id` only for mutable branch sources, where that additional
concurrency guard is needed. No mutation retry or server patch is involved.

The `gitlab-extension/operations` live contract creates a historical file, advances `main`, then
atomically updates the historical file and upserts a path that exists only on current `main`. It
verifies the selected parent SHA, both resulting files, and unchanged `main` content. Unit coverage
also rejects stale historical blob SHAs before writing and retains native guards for branch writes.

- [x] Reproduce against the stock server and inspect both released validators.
- [x] Preserve portable blob guards using the immutable commit selected by `startSha`.
- [ ] Fork GitLab and submit a regression spec and fix using the selected start SHA during
      validation.
