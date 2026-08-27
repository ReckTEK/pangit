# Branch Press Git

Type-safe REST clients generated from OpenAPI specs for Gitea, GitLab, GitHub, Codeberg (Forgejo),
Bitbucket Cloud, and Azure DevOps Git. `loadRestClient(provider, version, options)` dynamically
loads only the selected client, with provider and version types inferred.

## Development

- `deno task generate` — download specs, normalize them, rebuild clients and E2E assets while
  preserving raw results, then publish Markdown reports and update the table below. Requires saved
  reports; never runs containers.
- `deno task e2e` — run generated Gitea suites against fresh Docker Compose environments, save raw
  reports to `src/generated/<provider>/<version>/tests/results/`, then remove run containers,
  networks, and volumes. Markdown reports live in `docs/test-results/<provider>/<version>/`.
- `deno task check` — type-check source and codegen.
- `deno task test` — run generator and shared-transport tests.

## Test results

Saved real-container results. Run `deno task e2e`, then `deno task generate` to refresh this table.

<!-- BEGIN GENERATED TEST RESULTS -->

| Provider | Version                                                 | Result | Cases | Endpoints | Negative-only | Client lines |
| :------- | :------------------------------------------------------ | :----: | ----: | --------: | ------------: | -----------: |
| gitea    | [1.26.4](docs/test-results/gitea/1.26.4/test-result.md) |  Pass  |   532 | 471 / 471 |             3 |       99.96% |
| gitea    | [1.27.2](docs/test-results/gitea/1.27.2/test-result.md) |  Pass  |   543 | 482 / 482 |             3 |       99.96% |

Endpoints count operations with passing checks, including expected errors. Negative-only operations
have no successful-response test. Coverage measures generated client source, not server code or all
API behaviors.

<!-- END GENERATED TEST RESULTS -->
