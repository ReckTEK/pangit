# Documentation generation

The PanGit website owns a generated documentation catalog for the library's raw clients. It does not
maintain another handwritten list of supported providers or versions, and the published library does
not export website data.

## Sources and artifacts

The OpenAPI source map is
[`git-hosts.json`](../../../codegen/pangit/raw-rest-client-generation/openapi-specifications/git-hosts.json).
Fetching specifications generates
[`generated-manifest.json`](../../../codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json),
where each Git-host version maps its downloaded and normalized specification, generated raw REST
client, and documentation artifacts. The separate hand-written
[`live-test-plan.json`](../../../tests/e2e/hand-written/live-test-plan.json) owns E2E case,
fluent-test, Docker-definition, and container-image selection. The shared
[workspace resolver](../../../codegen/workspace-layout.ts) locates packages through the root
`deno.json` workspace configuration.

```text
git-hosts.json
  → downloaded/generated-manifest.json
  → normalized/<provider>/<version>.json
  → packages/pangit/src/generated-rest-clients/<provider>/<version>/<Provider>RestClient.ts
  → packages/pangit-site/app/documentation/generated/
      manifest.json
      loaders.ts
      <provider>/<version>/openapi.json
      <provider>/<version>/operations.json
```

The documentation generator reuses the client's operation parser and reviewed public-name map. Each
method is matched to its exact source operation, including `x-ms-paths` variants. Each version
records its route, downloadable spec, upstream URL and checksum, normalized checksum, operation and
schema counts, tags, server declarations, and available query-selected variants.

The generated OpenAPI file is a byte-for-byte copy of the normalized specification. Descriptions,
parameters, schemas, authentication, status codes, and vendor extensions are retained. The site
copies these artifacts into its static build rather than importing full specs into the main
JavaScript bundle.

## E2E evidence and reporting

Code generation owns only disposable generated raw REST-client tests and generated Docker
environments. Fluent API contracts and the Gitea adapter test are hand-written source:

```text
codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json
  └── deno task generate
        ├── tests/e2e/generated/raw-rest-client-tests/<git-host>/<version>/
        └── tests/e2e/generated/docker-environments/<git-host>/<version>/

tests/e2e/hand-written/                                 contracts, cases, adapter tests, definitions
  └── deno task e2e
        ├── tests/e2e/results/<git-host>/<version>/      suite-separated evidence
        └── packages/pangit/docs/test-results/
              └── <git-host>/<version>/test-result.md

README.md ── human-authored report links ── validated against the live test plan ──┘
```

| Artifact                                        | Owner                | Replacement rule                                                                                                    |
| :---------------------------------------------- | :------------------- | :------------------------------------------------------------------------------------------------------------------ |
| `tests/e2e/hand-written/`                       | Human                | Generation reads and validates this complete tree but never writes into it.                                         |
| `tests/e2e/generated/raw-rest-client-tests/...` | `deno task generate` | Only marker-owned Git-host/version directories are replaced.                                                        |
| `tests/e2e/generated/docker-environments/...`   | `deno task generate` | Only marker-owned Git-host/version directories are replaced.                                                        |
| `tests/e2e/results/<git-host>/<version>/`       | `deno task e2e`      | Every active result directory is cleared before a run; obsolete owned results are removed.                          |
| `packages/pangit/docs/test-results/`            | `deno task e2e`      | Every snapshot is validated and rendered first, then the complete marker-owned tree is replaced as one transaction. |
| Root README report links                        | Human                | E2E verifies exactly one link for every declared live-test report and never rewrites the README.                    |

The Markdown publisher reads only live-test-plan Git-host versions. It verifies summary totals,
endpoint identities, coverage arithmetic, the raw-results ownership marker, and the manually
authored README links before touching published documentation. Runtime timestamps and logs stay in
raw evidence, so repeated publication from the same evidence is byte-identical. Invalid or
incomplete evidence leaves the previous Markdown tree intact; successful replacement removes
obsolete files and empty directories instead of orphaning them.

## Regenerate

From the repository root:

```bash
deno task generate --cached
```

[`codegen/generate-all.ts`](../../../codegen/generate-all.ts) is the root generation entry point. It
runs the independent PanGit and PanGit-site generators in dependency order: specifications, clients,
E2E suite assets, site documentation, static assets, and React Router route types. `--cached` uses
the checked-in raw specifications; omit it to refresh upstream specs first. Generation never starts
Docker, reads raw E2E evidence, publishes result Markdown, or changes the root README.

Run `deno task e2e` separately to execute every live-test-plan release and publish its deterministic
Markdown evidence. No second generation command is required after E2E.

The documentation stage reuses the client parser and public-name map. It renders everything before
replacing its own output tree. The subsequent site stage reads the newly generated catalog and
copies its assets into the site's configured public paths.

When adding a Git host or version, update the OpenAPI source map and regenerate. The new reference
and navigation entries appear without another provider registration in the site. For a reviewed
public-name change, use `deno task generate --update-public-names`.

`deno task test` checks documentation freshness, compares inventory and method names with every
generated client registry, verifies complete specification copies, and exercises generation with
packages at different workspace paths. Invalid documentation input must leave the previous output
intact. Run generation before checks or builds on a fresh checkout; the site's copied assets and
route types are ignored build inputs.

## Site catalog API

```ts
import { documentation, loadDocumentationOperations } from "@mannsion/pangit-site/documentation";

const operations = await loadDocumentationOperations("gitea", "1.27.2");
console.log(documentation.providers, operations);
```

This is an internal export of the private site workspace package. `@mannsion/pangit` does not
publish it. Method indexes load lazily; unknown providers or versions return `undefined`.

## Browser explorer behavior

The explorer keeps an in-memory view of the specification. It uses stable PanGit method names for
operation links, including where the upstream specification omits IDs or contains slash-separated
IDs. Original IDs remain visible in operation descriptions. This affects UI navigation, not request
paths or the downloadable specification.

Azure DevOps query-selected operations cannot coexist as separate operations at the same path and
method in standard OpenAPI. They have an explicit operation-scope selector and links from the method
index. Each scope displays the original variant's parameters and responses with all shared schemas.

Scalar supplies the server selector, authentication forms, request editor, code examples, and
response viewer. Self-hosted references require an explicit API base URL before request execution;
enter it in the native **Custom API server** option's `apiServer` variable. This option is added at
each declared server scope; upstream root, path, and operation servers retain their original scope.
Native security schemes are available in the authentication controls; arbitrary headers belong in
the request's Headers tab. Credentials stay in memory for the current reference and are discarded on
reload or provider/version changes. There is no server request proxy or hosted credential service.

The SSR website serves navigation, method indexes, and page metadata as HTML. The interactive Scalar
explorer loads in the browser. The high-level API has a reserved navigation entry but no
implementation or unified specification.
