# Repository audit

- [x] Inventory source, generated output, tests, documentation, and package boundaries.
- [x] Audit the universal contract, authentication, pagination, and generated transport.
- [x] Audit each provider's inputs, mutations, mappings, capability declarations, and isolation.
- [x] Audit generators, E2E infrastructure, examples, and the documentation site.
- [x] Remove obsolete material and correct documentation, exports, ownership, and broken links.
- [x] Fix confirmed defects with focused regression coverage.
- [x] Verify generation, types, tests, lint, formatting, builds, and package contents.
- [x] Review the final diff, clean test resources, and commit/push on `main`.

Known GitLab server defects remain in their diagnostic directories with their original evidence.
This audit must preserve failing evidence and distinguish confirmed fixes from unresolved upstream
behavior.

Confirmed corrections cover mutable client/OAuth settings, OAuth registry lookup, GitLab historical
commit preconditions and unknown status mapping, Forgejo queued filtering and Actions query
encoding, and host-side E2E failure reporting. Provider test catalogs are split by contract; shared
E2E tools contain no provider implementation. Generated output is changed only through its owning
generator.

Validation: 302 unit/package tests pass. Final focused live evidence passes 174 fluent contracts
across all six versions and all 997 Forgejo REST operations. Generation, drift checks, type checks,
lint, formatting, both site builds, and the package publish dry run pass. Disposable containers,
networks, volumes, and credentials are removed. The last complete aggregate E2E evidence is
retained.
