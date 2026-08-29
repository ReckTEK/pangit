import type { DocumentationProvider, DocumentationVersion } from "../documentation/model.ts";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { documentation, formatCount } from "../lib.ts";
import { siteUrls } from "../urls.ts";
import { SelectControl } from "./select-control.tsx";

export function ReferenceHeading(
  { provider, version, compact = false }: {
    provider: DocumentationProvider;
    version: DocumentationVersion;
    compact?: boolean;
  },
) {
  const navigate = useNavigate();
  const location = useLocation();
  const view = siteUrls.referenceView(location.pathname);
  return (
    <>
      <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <SelectControl
            label="Provider"
            value={provider.id}
            onChange={(event) => {
              const next = documentation.providers.find((entry) =>
                entry.id === event.target.value
              )!;
              navigate(siteUrls.reference(next.id, next.selected, view));
            }}
          >
            {documentation.providers.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </SelectControl>
          <SelectControl
            label="API version"
            value={version.version}
            className="font-mono text-xs"
            onChange={(event) =>
              navigate(siteUrls.reference(provider.id, event.target.value, view))}
          >
            {provider.versions.toReversed().map((entry) => (
              <option key={entry.version} value={entry.version}>
                {entry.version}
                {entry.version === provider.selected ? " · current" : ""}
              </option>
            ))}
          </SelectControl>
        </div>
        <a
          href={siteUrls.spec(provider.id, version.version)}
          download
          className="text-link text-xs"
        >
          <ArrowDownToLine size={15} /> Download OpenAPI
        </a>
      </div>
      {compact
        ? <h1 className="sr-only">{provider.name} {version.version} API reference</h1>
        : (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">RAW REST REFERENCE</p>
              <span className="badge">OpenAPI {version.openapi}</span>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-1.5px] sm:text-5xl">
              {provider.name}
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-muted">
              The complete {version.version === "latest" ? "snapshot" : version.version}{" "}
              API contract. Explore endpoints, inspect schemas, and send real requests from your
              browser.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-muted">
              <span>
                <strong className="text-ink">{formatCount(version.operationCount)}</strong>{" "}
                operations
              </span>
              <span>
                <strong className="text-ink">{formatCount(version.schemaCount)}</strong> schemas
              </span>
              <a className="text-link" href={version.source} target="_blank" rel="noreferrer">
                Upstream specification <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        )}
      <nav
        aria-label="Reference views"
        className="mt-8 mb-8 flex gap-7 border-b border-line text-sm"
      >
        <NavLink
          to={siteUrls.reference(provider.id, version.version)}
          end
          className={({ isActive }) => `reference-tab ${isActive ? "active" : ""}`}
        >
          API explorer
        </NavLink>
        <NavLink
          to={siteUrls.reference(provider.id, version.version, "methods")}
          className={({ isActive }) => `reference-tab ${isActive ? "active" : ""}`}
        >
          Client methods
        </NavLink>
      </nav>
    </>
  );
}
