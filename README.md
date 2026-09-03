# PanGit

![PanGit — @mannsion/pangit](packages/pangit/docs/images/pangit-banner.png)

<p align="center">
  <strong>Deno-native Git-host tooling.</strong><br>
  One provider-neutral fluent API, plus generated provider-native REST clients.
</p>

> [!IMPORTANT]
> **Status: alpha development.** The fluent API is implemented and live-tested for Gitea only. All
> eight raw REST clients are generated, exported, and typechecked, but only the two Gitea clients
> have live-provider E2E coverage. Public APIs may change before a stable release, and the package
> is not published to JSR yet.

PanGit gives Deno applications two deliberately separate ways to work with Git hosts:

| API                           | Use it for                                                          | Current coverage                          |
| ----------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `PanGit.api`                  | Portable, concern-oriented Git workflows through a provider adapter | Gitea `1.26.4` and `1.27.2`               |
| `PanGit.createProviderClient` | Exact generated REST methods, types, payloads, and status codes     | Six providers and eight versioned clients |

The `@mannsion/pangit` library is Deno-native TypeScript built on standard Web APIs and native
`fetch`. It has no Node runtime or third-party runtime dependency. Provider implementations and raw
clients are loaded only when selected.

## Provider status

This matrix tracks what can be used from the current source tree and what has been exercised against
a real provider. "Not present" means that no live suite exists; it does not mean a suite failed.

| Provider           | API contract      | Fluent API        | Fluent E2E                                                        | Generated REST client       | REST E2E                                                     | Distribution                            |
| ------------------ | ----------------- | ----------------- | ----------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Gitea              | `1.26.4`          | Available (alpha) | [Pass: 32 contracts](tests/e2e/results/gitea/1.26.4/summary.json) | Available: 471 operations   | [Pass: 471/471](tests/e2e/results/gitea/1.26.4/summary.json) | MIT evidence recorded                   |
| Gitea              | `1.27.2`          | Available (alpha) | [Pass: 32 contracts](tests/e2e/results/gitea/1.27.2/summary.json) | Available: 482 operations   | [Pass: 482/482](tests/e2e/results/gitea/1.27.2/summary.json) | MIT evidence recorded                   |
| Codeberg (Forgejo) | `latest` snapshot | Not implemented   | Not present                                                       | Available: 506 operations   | Not present                                                  | MIT evidence recorded                   |
| GitHub             | `latest` snapshot | Not implemented   | Not present                                                       | Available: 1,222 operations | Not present                                                  | MIT evidence recorded                   |
| GitLab             | `18.11.11`        | Not implemented   | Not present                                                       | Available: 1,126 operations | Not present                                                  | Included; license evidence not recorded |
| GitLab             | `19.3.1`          | Not implemented   | Not present                                                       | Available: 1,148 operations | Not present                                                  | Included; license evidence not recorded |
| Bitbucket Cloud    | `latest` snapshot | Not implemented   | Not present                                                       | Available: 297 operations   | Not present                                                  | Included; license evidence not recorded |
| Azure DevOps Git   | `latest` snapshot | Not implemented   | Not present                                                       | Available: 112 operations   | Not present                                                  | Included; license evidence not recorded |

In total, the repository contains **6 providers, 8 generated REST clients, and 5,364 generated
operations**. `latest` identifies the checked-in specification snapshot used for generation; PanGit
does not download or negotiate a newer contract at runtime. Every schema is hash-pinned. Available
license evidence is downloaded, verified, and shipped in generated notices; missing evidence is
stated explicitly without removing the client.

## Use the alpha from source

There is no registry install command until the first JSR publication. Clone the repository and use
the Deno workspace package directly:

```bash
git clone https://github.com/mannsion/pangit.git
cd pangit
deno task check
```

The examples below use the workspace package name and can be run from the repository root.

## Fluent API: Gitea

Save this as `fluent-example.ts`, then replace the URL and repository names:

```ts
import * as PanGit from "@mannsion/pangit";

const token = Deno.env.get("GITEA_TOKEN");
if (!token) throw new Error("Set GITEA_TOKEN to your personal access token.");

const connection = PanGit.api.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});
const git = await connection.auth.token(token);

const owner = await git.container("acme");
const repository = await owner.repository("website");
const readme = await repository.content.read("README.md", { ref: "main" });

console.log(repository.fullName);
console.log(new TextDecoder().decode(readme.bytes ?? new Uint8Array()));
```

```bash
deno run --allow-env=GITEA_TOKEN --allow-net fluent-example.ts
```

The Gitea fluent adapter covers token, Basic/TOTP, and OAuth/PKCE authentication; repository
containers and repository lifecycle; forks; branches and divergence; tags; commits and comparisons;
content reads and file-change commits; pull requests, reviews, comments, and merges; commit
statuses; current-user profiles; issues; releases; webhooks; CI run discovery; packages; blobs; and
branch rules. Exact provider payloads and narrower provider operations remain available through
typed native access and Gitea-specific operation extensions.

## Generated REST clients

Use the raw factory when the fluent API does not yet support a provider or when you need its exact
REST contract:

```ts
import * as PanGit from "@mannsion/pangit";

const token = Deno.env.get("GITEA_TOKEN");
if (!token) throw new Error("Set GITEA_TOKEN to your personal access token.");

const gitea = await PanGit.createProviderClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { Authorization: `token ${token}` },
});

const response = await gitea.userGetCurrent();
if (!response.documented || !response.ok) {
  throw new Error(`Gitea returned ${response.status}`);
}

console.log(response.body.login);
```

Raw calls retain generated request types, provider operation names, documented response unions, and
native `Response` data. Exact clients and their native types are also exported from explicit
provider/version entry points such as:

```ts
import { GiteaRestClient } from "@mannsion/pangit/providers/gitea/1.27.2";
```

## Repository layout

| Path                                                                                       | Ownership                                                                              |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [`packages/pangit/src/fluent-api`](packages/pangit/src/fluent-api)                         | Hand-written provider-neutral API and adapter contracts                                |
| [`packages/pangit/src/git-host-adapters`](packages/pangit/src/git-host-adapters)           | Hand-written provider adapters; currently Gitea only                                   |
| [`packages/pangit/src/generated-rest-clients`](packages/pangit/src/generated-rest-clients) | Generated clients and shared native-Fetch runtime                                      |
| [`codegen/pangit`](codegen/pangit)                                                         | OpenAPI normalization, client generation, and E2E asset generation                     |
| [`tests/e2e`](tests/e2e)                                                                   | Generated raw suites, hand-written fluent contracts, Docker environments, and evidence |
| [`packages/pangit-examples`](packages/pangit-examples)                                     | Local Gitea sandbox, raw-client example, and OAuth launchers                           |
| [`packages/pangit-examples/site`](packages/pangit-examples/site)                           | Browser/server OAuth example application                                               |
| [`packages/pangit-site`](packages/pangit-site)                                             | Local generated REST-reference website and API explorer                                |

Generated ownership is strict: change the source manifests, normalizers, or renderers and
regenerate. Do not edit generated clients or generated E2E assets directly.

## Development

Run repository tasks with Deno 2 from the project root:

| Command                       | Purpose                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `deno task generate --cached` | Regenerate clients, E2E assets, and site documentation from checked-in specifications |
| `deno task check`             | Typecheck codegen, tests, and every workspace package                                 |
| `deno task test`              | Run non-live tests                                                                    |
| `deno task lint`              | Lint the workspace                                                                    |
| `deno fmt --check`            | Check formatting without changing files                                               |
| `deno task build`             | Build the documentation site                                                          |
| `deno task e2e`               | Run raw and fluent suites against fresh Dockerized Gitea environments                 |

`deno task e2e` currently runs Gitea `1.26.4` and `1.27.2`, writes evidence under
[`tests/e2e/results`](tests/e2e/results), and removes the test containers and state after each run.
See [`codegen/README.md`](codegen/README.md) for generation ownership.

## Local documentation site

The site currently documents the generated raw REST clients. It does not yet provide a fluent API
reference.

```bash
deno task generate --cached
deno task dev
```

Open `http://localhost:5173`. See
[`packages/pangit-site/Development.md`](packages/pangit-site/Development.md) for build and explorer
details.

PanGit is licensed under the [MIT License](LICENSE). Upstream schema attribution and license texts
are shipped in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
