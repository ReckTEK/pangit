# Forgejo Actions array query encoding

Forgejo 15.0.7 and 16.0.3 document `ListActionRuns.event`, `ListActionRuns.status`, and
`ListActionTasks.status` as arrays without a collection format. Swagger therefore defaults to CSV,
but the handlers use `FormStrings` and require repeated query keys.

The live CI contract reproduced HTTP 400 with `status=waiting,blocked`:
`unknown status: waiting,blocked`. The correct request is `status=waiting&status=blocked`.
Multi-event CSV queries silently omit matching runs.

Sources:
[15.0.7 handler](https://codeberg.org/forgejo/forgejo/src/tag/v15.0.7/routers/api/v1/repo/action.go),
[16.0.3 handler](https://codeberg.org/forgejo/forgejo/src/tag/v16.0.3/routers/api/v1/repo/action.go).

PanGit corrects these three parameter definitions during normalization for Forgejo and the Codeberg
snapshot. Generated clients and native access share that correction; fluent operations keep one
bounded request. Raw E2E cases cover multi-status and multi-event queries; fluent CI coverage checks
the queued filter against a real completed workflow.

- [x] Reproduce the mismatch and inspect both released handlers.
- [x] Correct normalized parameter encoding and add regression coverage.
- [ ] Submit an upstream schema fix adding `collectionFormat: multi` to the three parameters.
- [ ] Remove the correction when all supported source schemas declare the right format.
