# PanGit

![PanGit — @mannsion/pangit](packages/pangit/docs/images/pangit-banner.png)

<p align="center">
  <strong>Typed REST clients for Git hosting APIs.</strong><br>
  Native provider contracts. Shared Fetch transport.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#providers">Providers</a> ·
  <a href="#real-provider-e2e-results">Test results</a>
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
import { loadRestClient } from "@mannsion/pangit";

const token = Deno.env.get("GITEA_TOKEN");
if (!token) throw new Error("Set GITEA_TOKEN to your personal access token.");

const client = await loadRestClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { Authorization: `token ${token}` },
});

const response = await client.userGetCurrent();
if (!response.documented || !response.ok) throw new Error(`Gitea returned ${response.status}`);
console.log(response.body.login);
```

Set `GITEA_TOKEN` in your environment, then run:

```bash
deno run --allow-env=GITEA_TOKEN --allow-net main.ts
```

`1.27.2` selects the Gitea API client, not the package version. Calls return a typed response
envelope so the provider's documented status and body remain visible.

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

| Package                                                           | Purpose                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`@mannsion/pangit`](packages/pangit/deno.json)                   | The JSR library and generated raw clients.                              |
| [`@mannsion/pangit-examples`](packages/pangit-examples/deno.json) | Persistent local Gitea sandbox and OAuth example site.                  |
| [`@mannsion/pangit-site`](packages/pangit-site/Development.md)    | React Router SSR documentation website on Deno 2, styled with Tailwind. |

The private site package owns its documentation catalog. The published PanGit library does not
export website data or documentation tooling.

## Website

From the repository root, with Deno 2 installed:

```bash
deno task generate --cached
deno task dev
```

Open `http://localhost:5173`. The landing page is at `/`; documentation starts at `/docs`. The site
includes system, light, and dark themes, provider and version switchers, complete Scalar references,
and a searchable raw-client method index.

For a production build served by Deno:

```bash
deno task build
deno task start
```

Open `http://localhost:3000` (or set `PORT`). The explorer sends requests directly from the browser
to your selected API server. Scalar provides authentication, headers, request editing, and response
inspection. Your server must allow the browser origin with CORS. Authorization is not persisted.

The site’s high-level reference section is still reserved; the library already exports the managed
`PanGit` client, authentication helpers, and raw REST clients. See
[site development](packages/pangit-site/Development.md) and
[documentation generation](packages/pangit/docs/Documentation.md). The reviewed boundary for a
future provider-neutral API is the
[common API analysis](packages/pangit/docs/api-analysis/README.md).

## Development

Generation lives in [`codegen/generate.ts`](codegen/generate.ts), outside the published packages.
[`codegen/workspace-layout.ts`](codegen/workspace-layout.ts) resolves package names from the root
`deno.json` workspace paths. Change package locations there; generators do not duplicate directory
names. Use the root task for both generators or the explicit `generate:pangit` and
`generate:pangit-site` tasks when working on only one owner.

- `deno task generate` — download and normalize specs, rebuild clients and generated E2E assets,
  then rebuild site documentation, static assets, and route types. It never runs containers or
  touches saved E2E evidence, result Markdown, or this README.
- `deno task generate --cached` — run that entire pipeline using checked-in raw specs, without
  downloading schemas. Use after a fresh checkout or when editing generators or site asset settings.
- `deno task generate --update-public-names` — explicitly update the reviewed public-name map as
  part of the full pipeline after reviewing an API change. Can be combined with `--cached`.
- `deno task e2e` — replace every manifest-owned raw result under
  `tests/providers/<provider>/<version>/results/`, run the generated suites against fresh Docker
  Compose environments, remove every run resource, and atomically replace the Markdown report tree
  under `packages/pangit/docs/test-results/`.
- `deno task check`, `deno task test`, `deno task lint` — check root codegen and both packages.
- `deno task fmt` — format workspace sources.

## Real-provider E2E results

```text
generated suite + fresh provider container
                  │
                  ├──> tests/providers/<provider>/<version>/results/       raw evidence
                  └──> packages/pangit/docs/test-results/.../test-result.md clean Markdown
                                      ▲
                                      └── these human-authored links are validated, never rewritten
```

| Provider | Verified reports                                                                                                                                  |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gitea    | [1.26.4](packages/pangit/docs/test-results/gitea/1.26.4/test-result.md) · [1.27.2](packages/pangit/docs/test-results/gitea/1.27.2/test-result.md) |

Each report contains the real-container endpoint rollup, generated-client coverage, negative-only
boundaries, and the complete endpoint table. `deno task e2e` validates these links against the
provider manifest before replacing the report tree. See the full
[artifact ownership flow](packages/pangit/docs/Documentation.md#e2e-evidence-and-reporting).
