# Documentation generation

The PanGit website owns a generated documentation catalog for the library's raw clients. It does not
maintain another handwritten list of supported providers or versions, and the published library does
not export website data.

## Sources and artifacts

The source map is [`codegen/specs/providers.json`](../../../codegen/specs/providers.json). Fetching
specs generates [`codegen/specs/raw/manifest.json`](../../../codegen/specs/raw/manifest.json), where
each version maps its normalized specification, generated client, E2E assets, and documentation
artifacts. Source, normalized-spec, and test-map paths are relative to the repository root;
generated client, test, and result paths are relative to the PanGit package. Documentation paths are
relative to the site package. The shared [workspace resolver](../../../codegen/workspace.ts) locates
both packages through the root `deno.json` workspace configuration.

```text
providers.json
  → raw/manifest.json
  → normalized/<provider>/<version>.json
  → src/generated/<provider>/<version>/client.ts
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

## Regenerate

From the repository root:

```bash
deno task generate --cached
```

[`codegen/generate.ts`](../../../codegen/generate.ts) is the only generation entry point. It runs
the whole pipeline: specifications, clients, documentation, E2E suites and sandboxes, saved-result
Markdown, root README results, site assets, and React Router route types. `--cached` uses the
checked-in raw specifications; omit it to refresh upstream specs first. Neither mode starts Docker
or runs E2E. Actual E2E execution remains `deno task e2e`.

The documentation stage reuses the client parser and public-name map. It renders everything before
replacing its own output tree. The subsequent site stage reads the newly generated catalog and
copies its assets into the site's configured public paths.

When adding a provider or version, update the provider source map and regenerate. The new reference
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
