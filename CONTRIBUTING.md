# Contributing to PanGit

PanGit is in alpha development. The provider-neutral fluent API currently targets Gitea, GitLab, and
Forgejo, while the generated REST layer covers the provider versions listed in the
[README](README.md#provider-status). Keep readiness claims tied to implementation and test evidence.

Small fixes and documentation improvements can go directly to a pull request. For a new provider,
new fluent capability, public API change, or large refactor, please
[open an issue](https://github.com/ReckTEK/pangit/issues) first so the contract and evidence plan
can be agreed before implementation.

The [fluent architecture](packages/pangit/docs/Fluent-architecture.md) defines the universal
contract, standalone provider boundaries, and loading guarantees.

## Prerequisites

- Git
- Deno 2
- Docker with Compose v2, only when running live E2E tests

## Set up a checkout

Fork `ReckTEK/pangit` on GitHub, then replace `YOUR-USERNAME` below with your GitHub username:

```bash
git clone https://github.com/YOUR-USERNAME/pangit.git
cd pangit
git remote add upstream https://github.com/ReckTEK/pangit.git
deno install --frozen
deno task generate --cached
deno task check
deno task test
```

Create a descriptive branch from current `main` and keep one concern per pull request:

```bash
git fetch upstream
git switch --create your-change upstream/main
```

## Choose the correct contribution lane

| Change                           | Authoritative location                             | Expectations                                                                                                      |
| -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Provider-neutral fluent behavior | `packages/pangit/src/fluent-api/`                  | Define portable semantics without provider branches in common operations. Add focused unit and contract coverage. |
| Fluent provider selection        | `packages/pangit/src/fluent-client/`               | Keep the catalog small and runtime imports lazy. Provider policies belong to their implementations.               |
| Provider fluent implementation   | `packages/pangit/src/fluent-providers/`            | Implement the shared contract through the adapter and exercise provider behavior.                                 |
| Generated REST clients           | `codegen/pangit/raw-rest-client-generation/`       | Change source catalogs, normalizers, naming data, or renderers; never patch emitted clients.                      |
| Live provider coverage           | `tests/e2e/hand-written/`                          | Add hand-written cases, contracts, fixtures, or environment definitions; regenerate emitted suites.               |
| Examples                         | `packages/pangit-examples/`                        | Demonstrate a real login and repository interaction. Do not commit credentials.                                   |
| REST documentation site          | `packages/pangit-site/` and `codegen/pangit-site/` | Keep generated reference data separate from authored routes and components.                                       |

## Generated files

The following are generator-owned:

- `packages/pangit/src/generated-rest-clients/`
- `packages/pangit/src/fluent-api/generated-media-types.ts`
- `packages/pangit/LICENSE`
- `packages/pangit/THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_NOTICES.md`
- `tests/e2e/generated/`
- `packages/pangit-site/app/documentation/generated/`
- generated site assets under `packages/pangit-site/public/`

Edit the source manifest, normalizer, renderer, template, or hand-written E2E input, then run:

```bash
deno task generate --cached
```

This uses the checked-in OpenAPI and MIME database downloads and does not start Docker. Run
`deno task generate` without `--cached` only when intentionally refreshing upstream inputs. If
reviewed upstream changes alter public generated names, inspect that API change before running
`deno task generate --update-public-names`. Commit the authoritative input and regenerated tracked
output together, preserve upstream license and attribution information, and review the complete
diff.

MIME inference belongs in the shared fluent layer. Update the pinned registry and its license
evidence through `codegen/pangit/media-type-generation/`; do not maintain provider-specific
extension lists. Provider adapters only identify whether their file MIME metadata is reliable.

Do not edit a file carrying an `@generated` / `DO NOT EDIT` header. See
[`codegen/README.md`](codegen/README.md) for generator ownership.

## Verify a change

Run the non-live checks from the repository root:

```bash
deno task generate --cached
deno fmt --check
deno task check
deno task test
deno task lint
deno task build
(cd packages/pangit && deno publish --dry-run --allow-dirty)
```

These commands do not run Docker or live-provider E2E tests.

## Publish an alpha

The JSR package is configured in `packages/pangit/deno.json`; a separate `jsr.json` is unnecessary.
Only `@recktek/pangit` is published. The site and example workspaces have `"publish": false`.

The [JSR package](https://jsr.io/@recktek/pangit) is linked to `ReckTEK/pangit`. The GitHub user
pushing the release tag must be a member of the `recktek` JSR scope. The workflow uses GitHub OIDC
with provenance; no publish token is needed.

Publication is currently blocked: JSR rejects the module augmentation used by provider
`registration.ts` files. Replace that registration mechanism while preserving provider isolation
before publishing. The local `deno publish --dry-run` does not catch this server-side restriction.

For each release:

1. Set a new version such as `0.1.0-alpha.2` in `packages/pangit/deno.json` and update the root
   `deno.json` import for `@recktek/pangit` to that exact version. When the first version is ready
   to publish, update both READMEs and the site's getting-started instructions to use that JSR
   version.
2. Run the non-live checks above, including regeneration. Commit the version change and generated
   package metadata to `main`, then push it.
3. Tag that commit with `v` followed by the exact package version, for example
   `git tag v0.1.0-alpha.2`, then `git push origin v0.1.0-alpha.2`.
4. Check the
   [Publish to JSR workflow](https://github.com/ReckTEK/pangit/actions/workflows/publish.yml) and
   confirm the version appears on [JSR](https://jsr.io/@recktek/pangit/versions).

The workflow verifies that the tag matches an alpha version on `main`, runs the non-live checks,
then publishes only the library from a fresh checkout. Ordinary commits do not publish a version.
Failed runs can be rerun from GitHub Actions; a published version cannot be overwritten.

[JSR prereleases](https://jsr.io/docs/packages#pre-release-versions) use SemVer suffixes such as
`-alpha.1`. They are excluded from stable version resolution and must be selected explicitly:
`deno add jsr:@recktek/pangit@0.1.0-alpha.1`. Public APIs may change between alpha releases. The
workflow deliberately rejects stable versions; change that policy when preparing a stable release.

## Live E2E tests

Changes to provider transport, generated operations, fluent behavior, or provider fixtures should
run the smallest relevant live suite and report the exact command in the pull request:

```bash
deno task e2e --git-host gitea --version 1.27.2 --suite fluent
deno task e2e --git-host gitea --version 1.27.2 --suite raw
deno task e2e --git-host gitlab --version 19.3.1 --suite fluent
deno task e2e --git-host forgejo --version 16.0.3 --suite fluent
deno task e2e --git-host gitea --version 1.27.2 --suite fluent \
  --contract core/repositories
```

Filtered runs write ignored evidence under `tests/e2e/.focused-results/`. An unfiltered
`deno task e2e` runs both supported versions of Gitea, GitLab, and Forgejo, refreshes the tracked
evidence under `tests/e2e/results/`, and removes its disposable Compose environments afterward. Run
the complete suite before changing a public readiness or E2E claim.

Provider contract implementations and catalog entries belong under
`tests/e2e/hand-written/git-host-adapter-tests/<provider>/`. Keep
`tests/e2e/hand-written/fluent-api-contracts/` limited to provider-neutral fixtures and evidence
tools. The host finalizes each summary after teardown; `hostExecution.passed` includes execution and
cleanup failures that the test container cannot report.

Keep provider defect reproductions, candidate patches and upstream follow-up together under
[`tests/e2e/hand-written/diagnostics`](tests/e2e/hand-written/diagnostics). The GitLab
protection-cache investigation records its upstream fix checklist there; normal E2E environments
stay on stock images.

## Pull requests

A pull request should:

- explain the user-visible outcome and why the chosen layer owns the change;
- include tests for changed behavior;
- include regenerated tracked output when authoritative generation inputs change;
- report the non-live checks above and any live E2E command, or state clearly that E2E was not run;
- update the README provider matrix when implementation or live coverage changes;
- contain no tokens, passwords, `.env` files, or other credentials.

Maintainers may ask for the full live E2E suite before merging provider-facing changes.

## Contribution licensing

Contributions intentionally submitted for inclusion in PanGit are provided under the repository's
[MIT License](LICENSE). By submitting material, you represent that you have the right to do so.

Third-party schemas and generated derivatives are identified in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Add or refresh a provider only through the
source catalog with a reviewed schema SHA-256 pin. Record authoritative license evidence and
attribution when available. The generator downloads and verifies configured license and notice
files, rebuilds the complete notices shipped with the package, and states when no separate license
file is recorded. Missing license evidence does not remove a supported provider client.
