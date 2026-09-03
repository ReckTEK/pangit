# Contributing to PanGit

PanGit is in alpha development. The provider-neutral fluent API currently targets Gitea, while the
generated REST layer covers the provider versions listed in the [README](README.md#provider-status).
Keep readiness claims tied to implementation and test evidence.

Small fixes and documentation improvements can go directly to a pull request. For a new provider,
new fluent capability, public API change, or large refactor, please
[open an issue](https://github.com/mannsion/pangit/issues) first so the contract and evidence plan
can be agreed before implementation.

## Prerequisites

- Git
- GitHub CLI (`gh`), authenticated with `gh auth login`
- Deno 2
- Docker with Compose v2, only when running live E2E tests

## Set up a checkout

```bash
gh repo fork mannsion/pangit --clone
cd pangit
deno install --frozen-lockfile
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
| Gitea fluent implementation      | `packages/pangit/src/git-host-adapters/gitea/`     | Implement the shared contract through the adapter and exercise provider behavior.                                 |
| Generated REST clients           | `codegen/pangit/raw-rest-client-generation/`       | Change source catalogs, normalizers, naming data, or renderers; never patch emitted clients.                      |
| Live provider coverage           | `tests/e2e/hand-written/`                          | Add hand-written cases, contracts, fixtures, or environment definitions; regenerate emitted suites.               |
| Examples                         | `packages/pangit-examples/`                        | Demonstrate a real login and repository interaction. Do not commit credentials.                                   |
| REST documentation site          | `packages/pangit-site/` and `codegen/pangit-site/` | Keep generated reference data separate from authored routes and components.                                       |

## Generated files

The following are generator-owned:

- `packages/pangit/src/generated-rest-clients/`
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

This uses the checked-in OpenAPI downloads and does not start Docker. Run `deno task generate`
without `--cached` only when intentionally refreshing upstream specifications. If reviewed upstream
changes alter public generated names, inspect that API change before running
`deno task generate --update-public-names`. Commit the authoritative input and regenerated tracked
output together, preserve upstream license and attribution information, and review the complete
diff.

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

## Live E2E tests

Changes to Gitea transport, generated operations, fluent behavior, or provider fixtures should run
the smallest relevant live suite and report the exact command in the pull request:

```bash
deno task e2e --git-host gitea --version 1.27.2 --suite fluent
deno task e2e --git-host gitea --version 1.27.2 --suite raw
deno task e2e --git-host gitea --version 1.27.2 --suite fluent \
  --contract core/repositories
```

Filtered runs write ignored evidence under `tests/e2e/.focused-results/`. An unfiltered
`deno task e2e` runs both supported Gitea versions, refreshes the tracked evidence under
`tests/e2e/results/`, and removes its disposable Compose environments afterward. Run the complete
suite before changing a public readiness or E2E claim.

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
