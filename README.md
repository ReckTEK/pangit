# PanGit

![PanGit — @mannsion/pangit](packages/pangit/docs/images/pangit-banner.png)

<p align="center">
  <strong>Typed REST clients for Git hosting APIs.</strong><br>
  Native provider contracts. Shared Fetch transport.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="packages/pangit/docs/examples/examples.md">Tutorials</a> ·
  <a href="#providers">Providers</a> ·
  <a href="#test-results">Test results</a>
</p>

PanGit brings Gitea, GitLab, GitHub, Codeberg, Bitbucket Cloud, and Azure DevOps Git into your
TypeScript project. Clients are generated from OpenAPI specifications and preserve each provider's
request fields, response bodies, and HTTP status codes.

`loadRestClient(provider, version, options)` loads only the client you select, with its methods and
types inferred. Every client uses the same native-Fetch transport.

## Quick start

Add **`@mannsion/pangit`** to your own Deno project:

```bash
deno add jsr:@mannsion/pangit
```

Save this as `main.ts`, replacing the API URL with your Gitea 1.27.2 instance:

```ts
import { loadRestClient, unwrapRestResponse } from "@mannsion/pangit";

const token = Deno.env.get("GITEA_TOKEN");
if (!token) throw new Error("Set GITEA_TOKEN to your personal access token.");

const client = await loadRestClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { Authorization: `token ${token}` },
});

const user = unwrapRestResponse(await client.userGetCurrent());
console.log(user.login);
```

Set `GITEA_TOKEN` in your environment, then run:

```bash
deno run --allow-env=GITEA_TOKEN --allow-net main.ts
```

`1.27.2` selects the Gitea API client, not the package version. Calls return a typed response
envelope; `unwrapRestResponse` returns a documented success body or throws a response error.

## Tutorials

[Browse the examples](packages/pangit/docs/examples/examples.md) for a connected walkthrough of the
raw Gitea client: create a repository, inventory projects, open content PRs, triage issues, publish
releases, report CI results, and configure webhooks.

Each area has its own guide and code snippets. The tutorials use the JSR package from your own Deno
project against an existing server.

## Providers

| Provider           | Client key     | API versions         |
| ------------------ | -------------- | -------------------- |
| Gitea              | `gitea`        | `1.26.4`, `1.27.2`   |
| GitLab             | `gitlab`       | `18.11.11`, `19.3.1` |
| GitHub             | `github`       | `latest`             |
| Codeberg (Forgejo) | `codeberg`     | `latest`             |
| Bitbucket Cloud    | `bitbucket`    | `latest`             |
| Azure DevOps Git   | `azure-devops` | `latest`             |

`latest` identifies the specification snapshot used to generate that client. It does not download or
negotiate a newer API contract at runtime.

## Workspace

| Package                                                        | Purpose                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`@mannsion/pangit`](packages/pangit/deno.json)                | The JSR library, raw clients, documentation catalog, and handwritten tutorials. |
| [`@mannsion/pangit-site`](packages/pangit-site/Development.md) | React Router SSR documentation website on Deno 2, styled with Tailwind.         |

The site depends on the library's `@mannsion/pangit/documentation` export. Deno resolves that
specifier locally in this workspace; developing the website does not require publishing to JSR.

## Website

From the repository root, with Deno 2 installed:

```bash
deno task generate --cached
deno task dev
```

Open `http://localhost:5173`. The landing page is at `/`; documentation starts at `/docs`. The site
includes system, light, and dark themes, provider and version switchers, complete Scalar references,
a searchable raw-client method index, and the handwritten tutorials.

For a production build served by Deno:

```bash
deno task build
deno task start
```

Open `http://localhost:3000` (or set `PORT`). The explorer sends requests directly from the browser
to your selected API server. Scalar provides authentication, headers, request editing, and response
inspection. Your server must allow the browser origin with CORS. Authorization is not persisted.

The high-level API section is reserved for future work; only raw REST clients are implemented. See
[site development](packages/pangit-site/Development.md) and
[documentation generation](packages/pangit/docs/Documentation.md).

## Development

Generation lives in [`codegen/generate.ts`](codegen/generate.ts), outside the published packages.
[`codegen/workspace.ts`](codegen/workspace.ts) resolves package names from the root `deno.json`
workspace paths. Change package locations there; generators do not duplicate directory names. The
internal stages are library functions, not separate generation commands.

- `deno task generate` — the single generation pipeline: download and normalize specs, rebuild
  clients, API documentation, E2E assets, Markdown reports, this README's results, site assets, and
  site route types. Requires saved reports; never runs containers.
- `deno task generate --cached` — run that entire pipeline using checked-in raw specs, without
  downloading schemas. Use after a fresh checkout or when editing generators, tutorials, or site
  asset settings.
- `deno task generate --update-public-names` — explicitly update the reviewed public-name map as
  part of the full pipeline after reviewing an API change. Can be combined with `--cached`.
- `deno task e2e` — run generated Gitea suites against fresh Docker Compose environments, save raw
  reports under `packages/pangit/src/generated/<provider>/<version>/tests/results/`, then remove run
  containers, networks, and volumes. Markdown reports live under
  `packages/pangit/docs/test-results/<provider>/<version>/`.
- `deno task check`, `deno task test`, `deno task lint` — check root codegen and both packages.
- `deno task fmt` — format workspace sources.

## Test results

Saved real-container results. Run `deno task e2e`, then `deno task generate` to refresh this table.

<!-- BEGIN GENERATED TEST RESULTS -->

<!-- @generated by codegen/generate.ts. DO NOT EDIT. -->

| Provider | Version                                                                 | Result | Cases | Endpoints | Negative-only | Client lines |
| :------- | :---------------------------------------------------------------------- | :----: | ----: | --------: | ------------: | -----------: |
| gitea    | [1.26.4](packages/pangit/docs/test-results/gitea/1.26.4/test-result.md) |  Pass  |   532 | 471 / 471 |             3 |       99.96% |
| gitea    | [1.27.2](packages/pangit/docs/test-results/gitea/1.27.2/test-result.md) |  Pass  |   543 | 482 / 482 |             3 |       99.96% |

Endpoints count operations with passing checks, including expected errors. Negative-only operations
have no successful-response test. Coverage measures generated client source, not server code or all
API behaviors.

<!-- END GENERATED TEST RESULTS -->
