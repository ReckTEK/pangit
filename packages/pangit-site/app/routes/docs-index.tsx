import { Code2, Terminal } from "lucide-react";
import { ProviderVersionLinks } from "../components/provider-version-links.tsx";
import { documentation, formatCount } from "../lib.ts";
import { siteConfig } from "../../site.config.ts";

export const meta = () => [{ title: `Documentation — ${siteConfig.name}` }];

export default function DocsIndex() {
  return (
    <>
      <p className="eyebrow">RAW REST CLIENT DOCUMENTATION</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-1.5px] sm:text-5xl">
        Find your way around.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
        Explore every generated PanGit REST client. Pick a provider and API version to inspect its
        methods, schemas, and complete request contracts.
      </p>
      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Raw REST clients</h2>
        <span className="font-mono text-xs text-muted">
          {documentation.providers.length} PROVIDERS
        </span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documentation.providers.map((provider) => {
          const current = provider.versions.find((version) =>
            version.version === provider.selected
          )!;
          return (
            <div key={provider.id} className="rounded-xl border border-line bg-panel p-5">
              <div className="flex items-center justify-between">
                <span className="provider-mark">{provider.name.slice(0, 2)}</span>
                <span className="font-mono text-[10px] text-muted">
                  {formatCount(current.operationCount)} OPS
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold">{provider.name}</h3>
              <p className="mt-1.5 text-xs text-muted">
                {provider.kind === "live"
                  ? "Pinned specification snapshot"
                  : "Versioned API contracts"}
              </p>
              <ProviderVersionLinks provider={provider} variant="card" />
            </div>
          );
        })}
      </div>
      <section className="mt-12 border-t border-line pt-9">
        <h2 className="text-xl font-semibold tracking-tight">A few things to know</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <Code2 size={20} className="text-accent" />
            <h3 className="mt-4 text-sm font-semibold">Choose the API version explicitly</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              The API version is separate from the JSR package version. “latest” is the checked-in
              spec snapshot; it does not negotiate a server version at runtime.
            </p>
          </div>
          <div>
            <Terminal size={20} className="text-accent" />
            <h3 className="mt-4 text-sm font-semibold">Explore here. Run from your project.</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              The explorer makes HTTP requests directly in your browser. Use the published package
              in your own Deno project against an existing instance.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
