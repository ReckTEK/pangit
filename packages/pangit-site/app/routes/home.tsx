import { Link } from "react-router";
import { siteConfig } from "../../site.config.ts";
import { CodeSnippet } from "../components/code-snippet.tsx";
import { ProviderVersionLinks } from "../components/provider-version-links.tsx";
import { documentation } from "../lib.ts";
import { siteUrls } from "../urls.ts";

export const meta = () => [
  { title: `${siteConfig.name} — Documentation` },
  {
    name: "description",
    content:
      `${siteConfig.name} package installation, usage examples, and REST API references by provider and version.`,
  },
];

export default function Home() {
  return (
    <main id={siteConfig.anchors.main} className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="border-b border-line pb-8">
        <h1 className="text-4xl font-semibold tracking-tight">{siteConfig.name}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          A TypeScript package of REST clients for Git hosting APIs, generated from each provider’s
          OpenAPI specifications.
        </p>
        <a
          href={siteUrls.package}
          className="mt-4 inline-block font-mono text-sm text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
        >
          {siteConfig.packageName} on JSR
        </a>
      </header>

      <div className="grid gap-10 py-9 md:grid-cols-[minmax(0,1fr)_13rem] md:gap-12">
        <section aria-labelledby="install-heading" className="min-w-0">
          <h2 id="install-heading" className="text-xl font-semibold">Install</h2>
          <p className="mt-3 text-sm text-muted">Add the package to a Deno project:</p>
          <CodeSnippet file={siteConfig.snippets.install} />
          <h3 className="mt-7 font-semibold">Usage</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Select the provider and version, then set your instance’s API URL. This example reads a
            Gitea server's version.
          </p>
          <CodeSnippet file={siteConfig.snippets.usage} />
        </section>

        <aside aria-labelledby="documentation-heading">
          <h2 id="documentation-heading" className="text-xl font-semibold">Documentation</h2>
          <dl className="mt-5 space-y-6 text-sm">
            <div>
              <dt>
                <Link to={siteUrls.docs} className="text-accent hover:underline">Overview</Link>
              </dt>
              <dd className="mt-1.5 leading-6 text-muted">Package structure and available APIs.</dd>
            </div>
            <div>
              <dt>
                <a href={siteUrls.referenceSection} className="text-accent hover:underline">
                  REST API reference
                </a>
              </dt>
              <dd className="mt-1.5 leading-6 text-muted">
                Endpoints, schemas, and client methods.
              </dd>
            </div>
            <div>
              <dt>
                <Link to={siteUrls.guide()} className="text-accent hover:underline">
                  Usage examples
                </Link>
              </dt>
              <dd className="mt-1.5 leading-6 text-muted">Gitea setup and workflow tutorials.</dd>
            </div>
          </dl>
        </aside>
      </div>

      <section
        id={siteConfig.anchors.reference}
        aria-labelledby="reference-heading"
        className="border-t border-line pt-8"
      >
        <h2 id="reference-heading" className="text-xl font-semibold">REST API reference</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Select a provider and API version. Each reference includes a browser request console.
        </p>
        <table className="mt-5 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="py-3 pr-4 font-medium">Provider</th>
              <th scope="col" className="py-3 font-medium">API versions</th>
            </tr>
          </thead>
          <tbody>
            {documentation.providers.map((provider) => (
              <tr key={provider.id} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-4 pr-4 font-medium">
                  <Link
                    to={siteUrls.reference(provider.id, provider.selected)}
                    className="hover:text-accent hover:underline"
                  >
                    {provider.name}
                  </Link>
                </th>
                <td className="py-3">
                  <ProviderVersionLinks provider={provider} variant="table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
