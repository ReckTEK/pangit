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
      "One fluent TypeScript API for Gitea, Forgejo, and GitLab, with complete generated REST clients when you need them.",
  },
];

export default function Home() {
  return (
    <main id={siteConfig.anchors.main} className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
      <header className="grid items-center gap-10 border-b border-line pb-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="eyebrow">TYPESCRIPT · GIT HOSTING · ONE CONTRACT</p>
          <h1 className="mt-6 text-5xl leading-[1.08] font-semibold tracking-[-2px] sm:text-6xl">
            Your Git hosts.<br />
            <span className="text-accent">One fluent API.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            Read files, open pull requests, and publish releases across Gitea, Forgejo, and GitLab.
            A shared contract, with each provider’s native API within reach.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={siteUrls.guide("getting-started")} className="button-primary">
              Make your first request →
            </Link>
            <Link to={siteUrls.docs} className="button-secondary">Explore the docs</Link>
          </div>
          <p className="mt-5 text-xs leading-6 text-muted">
            Alpha · available from source · explicit provider versions
          </p>
        </div>
        <div className="min-w-0">
          <CodeSnippet file="fluent/home.ts" label="A familiar workflow" />
          <p className="mt-3 text-center font-mono text-[10px] text-muted">
            GITEA / FORGEJO / GITLAB
          </p>
        </div>
      </header>

      <div className="grid gap-10 py-9 md:grid-cols-[minmax(0,1fr)_13rem] md:gap-12">
        <section aria-labelledby="source-heading" className="min-w-0">
          <h2 id="source-heading" className="text-xl font-semibold">Use the alpha from source</h2>
          <p className="mt-3 text-sm text-muted">
            The package is not published yet. Clone the repository and use its Deno workspace:
          </p>
          <CodeSnippet file={siteConfig.snippets.source} />
        </section>

        <aside aria-labelledby="documentation-heading">
          <h2 id="documentation-heading" className="text-xl font-semibold">Documentation</h2>
          <dl className="mt-5 space-y-6 text-sm">
            <div>
              <dt>
                <Link
                  to={siteUrls.guide("getting-started")}
                  className="text-accent hover:underline"
                >
                  Fluent API guide
                </Link>
              </dt>
              <dd className="mt-1.5 leading-6 text-muted">
                From first request to complete workflows.
              </dd>
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
