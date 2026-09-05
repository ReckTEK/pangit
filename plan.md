# Forgejo provider and Codeberg hosting

## 1. Establish the contract and supported releases

- [x] Inspect the existing provider, generator, and live-test boundaries.
- [x] Pin official Forgejo stable and LTS schemas, licenses, and Docker images.
- [x] Define Codeberg as a hosted Forgejo configuration, with explicit version selection.

## 2. Generate standalone REST clients

- [x] Add versioned Forgejo sources and generated package/site exports.
- [x] Keep the existing Codeberg snapshot usable and explain its relationship to Forgejo.
- [x] Verify generated types against the selected schemas and preserve reproducible generation.

## 3. Implement the isolated fluent provider

- [x] Implement the universal contract inside `fluent-providers/forgejo/`.
- [x] Own authentication, extensions, native types, capabilities, and lazy version loading locally.
- [x] Cover all capabilities implemented by Gitea; investigate any differences with focused repros.
- [x] Add lazy catalog selection and an explicit Codeberg hosted factory.
- [x] Verify provider isolation, exact-version types, and module loading.

## 4. Exercise real Forgejo servers

- [x] Add independent Docker provisioning, fixtures, Actions runner, and teardown.
- [x] Add complete raw REST cases and fluent contract coverage for both selected releases.
- [x] Run the live matrix; fix Forgejo failures at their cause and preserve all provider evidence.
- [x] Record confirmed upstream behavior with a minimal reproduction and precise impact.

## 5. Finish and deliver

- [x] Update focused provider documentation, examples, support tables, and contribution paths.
- [x] Pass formatting, lint, types, unit/architecture tests, generation, build, and package checks.
- [x] Review the diff for orphaned files, provider leakage, stale claims, and accidental changes.
- [x] Shut down all test resources; record results here and commit/push on `main`.

The universal contract stays provider-neutral. Forgejo owns its implementation and tests; it does
not import Gitea implementation code. Codeberg support uses Forgejo's implementation with a hosted
URL, not a second fluent provider. Live tests run on local Docker instances, not on Codeberg
accounts.

Progress: both Forgejo releases pass all 29 fluent contracts and every raw operation (491 on 15.0.7;
506 on 16.0.3). The annotated-tag regression and final CI mapping checks also pass on both servers.
The existing Gitea versions and GitLab 18.11.11 also pass. GitLab 19.3.1 passes its raw suite but
fails one fluent fixture after accepting a new branch. That failure is retained and investigated
separately; the complete matrix is not claimed green. Forgejo version differences are described in
the Forgejo guide.

Verification: 284 workspace tests pass; types, lint, formatting, site/example builds, and the
package dry run pass. Cached regeneration reproduces all 148 checked generated artifacts byte for
byte. All E2E and diagnostic containers, networks, volumes, and credentials are removed. GitLab
GL-002 is reproduced independently on stock 19.3.1 and retained with an upstream checklist; fixing
GitLab itself remains separate from the Forgejo delivery.
