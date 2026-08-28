import { loadDocumentationOperations } from "@mannsion/pangit/documentation";
import { useMemo, useState } from "react";
import { Link, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { ReferenceHeading } from "../components/reference-heading.tsx";
import { findReference, formatCount } from "../lib.ts";
import { operationHref } from "../scalar.ts";
import { siteConfig } from "../../site.config.ts";
import { siteUrls } from "../urls.ts";

export async function loader({ params }: LoaderFunctionArgs) {
  const reference = findReference(params.provider, params.version);
  const operations = await loadDocumentationOperations(
    reference.provider.id,
    reference.version.version,
  );
  if (!operations) throw new Response("Method index not found", { status: 404 });
  return { ...reference, operations };
}

export const meta = () => [{ title: `Raw client methods — ${siteConfig.name}` }];

export default function ClientMethods() {
  const { provider, version, operations } = useLoaderData<typeof loader>();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return operations.filter((operation) =>
      (!tag || operation.tags.includes(tag)) &&
      `${operation.methodName} ${operation.operationId} ${operation.method} ${operation.path} ${
        operation.summary ?? ""
      }`.toLowerCase().includes(needle)
    );
  }, [operations, query, tag]);
  return (
    <>
      <ReferenceHeading provider={provider} version={version} />
      <h2 className="text-xl font-semibold tracking-tight">From endpoint to client method.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Every method emitted for{" "}
        <code className="text-ink">{provider.client.className}</code>, including stable names when
        upstream operation IDs collide. Open an operation to inspect its complete input, response,
        schema, and request form.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <label className="relative min-w-50 flex-1">
          <Search size={16} className="absolute top-3.5 left-3 text-muted" />
          <input
            className="field w-full pl-10 text-sm"
            type="search"
            aria-label="Search client methods"
            placeholder="Search methods, endpoints, or operation IDs…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter by API tag"
          className="field text-sm"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
        >
          <option value="">All API tags</option>
          {version.tags.map((entry) => (
            <option key={entry.name} value={entry.name}>{entry.name} ({entry.count})</option>
          ))}
        </select>
      </div>
      <p className="mt-4 font-mono text-[11px] text-muted" role="status">
        {formatCount(filtered.length)} OF {formatCount(operations.length)} METHODS
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        {filtered.map((operation) => {
          return (
            <Link
              key={operation.methodName}
              to={operationHref(siteUrls.reference(provider.id, version.version), operation)}
              className="method-row group"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`http-method method-${operation.method.toLowerCase()}`}>
                  {operation.method}
                </span>
                <code className="min-w-0 flex-1 break-all text-[13px] font-semibold text-ink">
                  {operation.methodName}()
                </code>
                {operation.variant && <span className="badge">query variant</span>}
                {operation.deprecated && <span className="badge">deprecated</span>}
                <ArrowUpRight size={14} className="text-muted group-hover:text-accent" />
              </div>
              <code className="mt-2 block break-all text-xs text-muted">{operation.path}</code>
              {operation.summary && (
                <p className="mt-2 text-xs leading-6 text-muted">{operation.summary}</p>
              )}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="p-8 text-sm text-muted">
            No matching methods. Try another search or API tag.
          </p>
        )}
      </div>
    </>
  );
}
