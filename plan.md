# Fluent API isolation

## Required boundaries

- `fluent-api/` owns the universal contract and provider-neutral client behavior.
- `fluent-providers/<provider>/` owns that provider's implementation, authentication details,
  extensions, native types, version selection and capability declarations.
- `fluent-client/` is the composition boundary: a small catalog selects a provider/version and
  dynamically imports its standalone entry point. Type registration does not load runtime code.
- Providers depend on the universal contract. The universal contract does not import providers,
  generated provider clients, or concrete provider/version names. Providers never import each other.
- Provider-specific callbacks stay behind explicit native/operation extension branches. Their
  payloads, validation and availability belong to the selected provider.
- Concern directories have `mod.ts` barrels. Names describe behavior; large implementation files are
  split by operations and supporting types, not arbitrary line counts.

## Phase 1 — Inventory and design

- [x] Identify concrete provider types and runtime policies leaking into shared authentication,
      extension registration, native mappings and capability metadata.
- [x] Identify oversized and mixed-concern implementation files.
- [x] Record and enforce the dependency boundaries in executable architecture tests.

## Phase 2 — Universal contracts

- [x] Extract provider-neutral identity, transport, capability, native and extension contracts.
- [x] Move every concrete provider extension type and validation rule into its provider folder.
- [x] Remove provider-specific authentication types and OTP fields from universal inputs.
- [x] Keep exact provider/version inference through type-only registration at the composition edge.

## Phase 3 — Standalone providers and lazy composition

- [x] Give Gitea and GitLab the same standalone folder/entry-point structure.
- [x] Put version selection, native mappings and extension registration inside each provider.
- [x] Inject provider declarations into the generic client instead of importing implementations.
- [x] Verify selecting one provider never evaluates the other provider or unused generated clients.
- [x] Keep explicit provider callbacks typed and isolated, with no provider switches in shared code.

## Phase 4 — Files match responsibilities

- [x] Split large Gitea content, commit, pull-request and transport implementations by
      responsibility.
- [x] Split GitLab's combined branches/tags, statuses/profile, webhooks/rules and CI/reviews
      modules.
- [x] Separate public interfaces, client construction and provider catalog composition.
- [x] Add concern-level `mod.ts` barrels and migrate internal consumers and tests to canonical
      paths.
- [x] Remove obsolete modules and update the generator/example/documentation references.

## Phase 5 — Verification and delivery

- [x] Pass boundary tests: no provider leakage, cross-provider imports or eager implementation
      loads.
- [x] Pass exact-version type tests and authentication/extension/native behavior regressions.
- [x] Run formatting, type checks, unit tests, lint and package/build checks, with a final focused
      regression run after implementation changes.
- [x] Run the relevant live fluent contracts; do not restart the broad raw REST matrix for a
      structural change to unchanged generated clients. Report any existing provider defects
      clearly.
- [x] Review the resulting file tree and diff; update this checklist with actual results.

Work stays on `main`. No generated provider client is hand-edited. No upstream defect is hidden or
reclassified as fixed by this refactor.

## Verification results

- Workspace type checks, lint, production build, and package publication dry run passed.
- Full workspace tests: 244 passed, including 11 dependency, runtime-cycle, and actual
  module-loading checks; documentation links and E2E claims are checked against recorded evidence.
- Formatting passed for the changed implementation, examples, tests, and documentation.
- Package export generation preserves both standalone fluent entry points.
- Largest handwritten fluent implementation module: 365 lines. Generated clients are unchanged.

| Provider | Version  | Live fluent contracts |
| -------- | -------- | --------------------- |
| gitea    | 1.26.4   | 32 passed             |
| gitea    | 1.27.2   | 32 passed             |
| gitlab   | 18.11.11 | 26 passed             |
| gitlab   | 19.3.1   | 26 passed             |

Full raw and fluent evidence: `tests/e2e/results/<provider>/<version>/summary.json`. All 3,227 raw
operations and 116 fluent contracts passed. All test environments were removed after completion.

The existing GitLab capability gaps remain documented in
[`GitLab.md`](packages/pangit/docs/GitLab.md); GL-001's reproduction and upstream-fix follow-up
remain in their existing diagnostic directory. This refactor does not claim an upstream server fix.

## Phase 6 — Repository cleanup and publication

- [x] Audit documentation, local links, examples, package exports, and generated output.
- [x] Remove unused implementation leftovers and align folder/barrel ownership; remove static
      runtime import cycles and guard against their return.
- [x] Refresh missing checked-in E2E evidence from real complete runs.
- [x] Pass final formatting, type, unit, lint, build, and packaging checks; verify served pages and
      source branding assets, and build the OAuth example.
- [x] Prepare the reviewed changes on `main` for commit and push.
