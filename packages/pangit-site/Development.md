# PanGit site development

The site is a Deno 2 workspace package that owns its generated documentation catalog and facade. The
published PanGit library contains only library code and does not export this site data.

## Configuration and snippets

Edit [site.config.ts](site.config.ts) for site links, route segments, branding, static asset paths,
theme-cookie settings, and the snippet files shown on the home page. Provider/version inventories,
operation metadata, and upstream URLs come from the site's generated catalog. The config is a plain
module so React Router can load its route settings before Vite initializes the Deno package
resolver.

[urls.ts](app/urls.ts) derives router patterns and URLs from those settings. Components and asset
preparation use the same helpers, so changing a route or asset prefix does not require editing JSX.
Upstream specification URLs come from the generated catalog.

Code snippets live in [app/snippets](app/snippets). Edit the `.ts` or `.sh` file directly, or add a
file and select its filename in `siteConfig.snippets`. The shared
[CodeSnippet component](app/components/code-snippet.tsx) uses
[Vite's raw glob imports](https://vite.dev/guide/features#glob-import) to bundle the files as text
for SSR and the browser. It never executes snippets or reads source files from the production
filesystem.

## Editor types

The site's `deno.json` loads [Vite's client types](https://vite.dev/guide/features#client-types)
through [vite.d.ts](app/types/vite.d.ts). CSS `?url` imports also use an explicit
[`@ts-types` declaration](https://docs.deno.com/runtime/fundamentals/typescript/#providing-types-in-the-importer)
from [vite-url.d.ts](app/types/vite-url.d.ts). Deno's language server otherwise resolves the CSS
file as a module with no default export before applying Vite's wildcard URL types. This gives the
editor the actual `string` export without suppressing diagnostics. A passing build alone does not
verify language-server diagnostics.

## Run

From the repository root:

```bash
deno task generate --cached
deno task dev
deno task build
deno task start
```

Development runs at `http://localhost:5173`; production runs at `http://localhost:3000`. Set `PORT`
to change the production port. Use `deno install --frozen` to install exactly the locked
dependencies.

The pinned stack is React 19, React Router 8 framework mode with SSR, Vite 8, Tailwind 4, and
Scalar's official React integration. The development task passes Deno's `--conditions=development`
so React Router can select its development exports without attempting a Node-specific restart. See
[Deno's conditional exports](https://docs.deno.com/runtime/fundamentals/node/#control-package-export-conditions).

The Vite configuration also leaves virtual HMR modules to React Router and prebundles the browser
dependencies before initial hydration. These compatibility settings are exercised by a clean-cache
development startup; removing them can cause module-loader errors or a reload during the first
visit. See [Vite dependency optimization](https://vite.dev/config/dep-optimization-options).

The home page links to the source repository and uses its workspace setup commands while the package
is unpublished. REST references remain available independently of package publication.

## Pages and generated content

| Route                                  | Content                                            |
| -------------------------------------- | -------------------------------------------------- |
| `/`                                    | PanGit landing page.                               |
| `/docs`                                | Documentation overview and provider catalog.       |
| `/docs/raw/:provider/:version`         | Complete interactive OpenAPI reference.            |
| `/docs/raw/:provider/:version/methods` | Searchable index of every generated client method. |

The root [generation entry point](../../codegen/generate-all.ts) creates the site's `public/`
reference, brand assets and React Router route types alongside the library's generated output.
`dev`, `build`, and checks consume those artifacts; they do not run a separate preparation command.
Run `deno task generate --cached` after a fresh checkout or changes to specs or asset settings. The
copied assets and route types are ignored; the tracked reference authority remains in
`packages/pangit-site/app/documentation/generated/`. The root `deno.json` workspace list configures
package locations; the shared [resolver](../../codegen/workspace-layout.ts) supplies them to all
generators. Provider/version navigation comes from the site-owned manifest. See
[documentation generation](../pangit/docs/Documentation.md).

Pages and method indexes render on the server through React's Web Streams API. Scalar and its
stylesheet load only on reference pages; the interactive component mounts after hydration. Its
operation links use PanGit method names; descriptions retain upstream operation IDs, and downloaded
specifications are unchanged.

The integration has three responsibilities:

- [explorer.ts](app/explorer.ts) creates the in-memory documentation view, preserving native request
  contracts and Azure query-selected variants.
- [scalar.ts](app/scalar.ts) owns documented Scalar configuration, direct browser transport, and the
  shared slug functions used by Scalar and the server-rendered method index.
- [openapi-explorer.tsx](app/components/openapi-explorer.tsx) loads the document and React
  component, handles loading/errors, and applies the site's resolved color scheme.

Request forms, authentication controls, server selection, search, schema navigation, and response
viewing are Scalar components. PanGit does not implement competing controls or patch their markup.

## Try an API

1. Open a provider/version reference, find an operation, and click **Test Request**.
2. Use an upstream server, or choose **Custom API server** in the reference's server selector and
   enter a complete base URL in **apiServer**, such as `https://git.example.com/api/v1` for Gitea.
   Self-hosted references select this option by default. The same variable is editable in the
   request client's server dropdown. An unset server cannot execute against this site.
3. Use the client's authentication controls for security schemes declared by the provider. Select
   the scheme you need and deselect any others. Gitea's `AuthorizationHeaderToken` expects the
   complete `token …` value. For headers not declared as security schemes, use the **Headers** tab;
   GitHub's snapshot, for example, needs an `Authorization: Bearer …` header there.
4. Fill in the parameters/body and send the request. These are real API calls, including writes when
   a write operation is selected.

The API explorer sends requests directly from the browser to the server entered by the reader. It
does not proxy credentials through this site, persist authorization, or change the provider-native
OpenAPI contract. The target server must permit the browser origin with CORS and use a compatible
HTTPS policy. Reloading or changing provider/version discards the client instance and its
credentials. Within a reference, Scalar retains in-memory credentials while editing requests; check
the selected server before sending them. PanGit disables Scalar's hosted proxy, AI panel, telemetry,
credential persistence, and external client links.

Scalar's OAuth controls show their redirect URI; by default it is the current reference page's
origin and path. Register that URI with your OAuth application. Scalar handles the callback popup
without a separate redirect asset. Provider-specific OAuth policies and token endpoint CORS
requirements still apply.

## Themes

The default **System** theme follows the OS preference, including changes while the page is open.
CSS applies it before hydration, so it also works without JavaScript. **Light** and **Dark** save an
explicit preference in a same-site cookie that SSR reads; choosing **System** clears the override.

Tailwind utilities and the semantic tokens in [styles.css](app/styles.css) control both themes.
[scalar.css](app/styles/scalar.css) maps those tokens to Scalar's public theme variables, including
its request dialogs. Tailwind's layer order follows Scalar's documented integration; there are no
internal component overrides. The site owns the single theme selector, and Scalar follows it through
the supported `forceDarkModeState` configuration. Scalar reads its forced mode at mount, so a change
of resolved theme remounts its component and clears its in-memory request state. The specification
does not need to be fetched again.

## Verify

```bash
deno task generate --cached
deno task check
deno task test
deno task lint
deno task build
```

The tests compare the manifest with every generated client registry, retain byte-identical OpenAPI
documents, and exercise explorer adaptation, method links, authorization boundaries, themes, and
static asset preparation.

## Upgrading Scalar

The React package and slug helper are pinned in [package.json](package.json) and the workspace
lockfile. Follow the official
[React integration](https://scalar.com/products/api-references/integrations/react),
[configuration](https://scalar.com/products/api-references/configuration), and
[theme documentation](https://scalar.com/products/api-references/themes). After an upgrade, verify
method deep links, provider/version switching, both themes, native authentication forms, and a
browser request as well as the automated checks above.
