# Raw REST-client documentation generation

The PanGit website renders its REST references from a generated, site-owned catalog. Provider and
version navigation, method indexes, downloadable specifications, and Scalar explorer inputs all come
from the same checked-in OpenAPI sources used to generate the clients.

## Source-to-site flow

```text
codegen/pangit/raw-rest-client-generation/openapi-specifications/git-hosts.json
  -> downloaded/generated-manifest.json
  -> normalized/<provider>/<version>.json
  -> packages/pangit/src/generated-rest-clients/<provider>/<version>/
  -> packages/pangit-site/app/documentation/generated/
       manifest.json
       loaders.ts
       <provider>/<version>/openapi.json
       <provider>/<version>/operations.json
  -> packages/pangit-site/public/openapi/
```

The generated manifest records every provider, API version, selected version, upstream source,
reviewed checksum, license status, generated client, and site artifact. Where available, it also
records the license source, checksum, embedded declaration, and attribution. The documentation stage
reuses the REST-client operation parser and reviewed public-name map, so the searchable method index
matches the methods actually emitted by each generated client.

Each generated OpenAPI document is a byte-for-byte copy of its normalized specification.
Descriptions, parameters, schemas, authentication, response contracts, and vendor extensions are
preserved. Operation indexes include stable PanGit method names and retain original operation IDs.

## Artifact ownership

| Path                                                                           | Owner                             |
| ------------------------------------------------------------------------------ | --------------------------------- |
| `codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/` | Specification download stage      |
| `codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/` | Specification normalization stage |
| `packages/pangit/src/generated-rest-clients/`                                  | REST-client generator             |
| `packages/pangit-site/app/documentation/generated/`                            | Site documentation generator      |
| `packages/pangit-site/public/openapi/`                                         | Site static-asset stage           |

Do not edit generated paths directly. Their generators render and validate complete replacement
trees before replacing current output, which removes obsolete provider/version artifacts without
leaving mixed generations behind.

## Regenerate

From the repository root:

```bash
deno task generate --cached
```

`--cached` reuses checked-in source specifications. Omit it to download configured upstream
specifications before normalization. Use `--update-public-names` only when intentionally accepting
reviewed generated symbol or method-name changes.

The root generation command runs the library and site pipelines in dependency order: source
specifications, normalized specifications, generated clients, generated raw-client test assets,
documentation catalog, static assets, and React Router route types. It does not start Docker or
execute live requests.

`deno task generate:pangit-site` rebuilds only the site-owned catalog, copied reference assets, and
route types. It expects current normalized specifications and generated clients to already exist.

## Site catalog

The private site package exports its internal catalog for site code:

```ts
import { documentation, loadDocumentationOperations } from "@recktek/pangit-site/documentation";

const operations = await loadDocumentationOperations("gitea", "1.27.2");
console.log(documentation.providers, operations);
```

Method indexes load per provider/version. Unknown provider/version pairs return `undefined`.
`@recktek/pangit` does not publish the site catalog.

## Scalar explorer

The site renders navigation, method indexes, and metadata on the server. Scalar loads in the browser
only on a provider/version reference page and receives the generated OpenAPI document without
altering its request contract.

For a self-hosted service, select **Custom API server** and enter the complete API base URL in
`apiServer`. Requests go directly from the browser to that server. The server must permit the site
origin with CORS and use a compatible HTTPS policy.

Scalar provides authentication controls, server selection, request editing, code examples, schema
navigation, and response inspection. Credentials remain in browser memory for the current page and
are discarded on reload or provider/version changes. The site disables Scalar's hosted proxy, AI
panel, telemetry, credential persistence, and external client links.

Azure DevOps query-selected `x-ms-paths` operations use an explicit operation-scope selector because
standard OpenAPI cannot represent multiple operations at the same path and HTTP method. Each scope
retains its native parameters and responses while sharing the source document's schemas.

## Verification

```bash
deno task generate --cached
deno task check
deno task test
deno task lint
deno task build
```

Tests compare the documentation catalog against every generated client registry, verify exact
operation allocation and byte-identical specifications, exercise provider/version routing and Scalar
adaptation, and reject stale or incomplete generated output.

## Authored fluent guides

The site also owns the fluent API handbook under `packages/pangit-site/app/guides`. These workflow
pages are authored independently of generated raw references. Their method descriptions are checked
against the public contracts, and TypeScript examples are part of the site check task. Navigation,
reading order, and page summaries share one catalog. See
[site development](../../pangit-site/Development.md#fluent-guides) for the authoring workflow.
