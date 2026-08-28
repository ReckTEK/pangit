import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useSearchParams,
} from "react-router";
import { ReferenceHeading } from "../components/reference-heading.tsx";
import { OpenApiExplorer } from "../components/openapi-explorer.tsx";
import { findReference } from "../lib.ts";
import { siteConfig } from "../../site.config.ts";
import { siteUrls } from "../urls.ts";
// @ts-types="../types/vite-url.d.ts"
import scalarStylesheet from "../styles/scalar.css?url";

export const links = () => [{ rel: "stylesheet", href: scalarStylesheet }];

export function loader({ params, request }: LoaderFunctionArgs) {
  const reference = findReference(params.provider, params.version);
  const variant = new URL(request.url).searchParams.get("variant");
  if (variant && !reference.version.variants.some((entry) => entry.id === variant)) {
    throw new Response("Operation variant not found", { status: 404 });
  }
  return reference;
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [{
  title: loaderData
    ? `${loaderData.provider.name} ${loaderData.version.version} API reference — ${siteConfig.name}`
    : `API reference — ${siteConfig.name}`,
}];

export default function RawReference() {
  const { provider, version } = useLoaderData<typeof loader>();
  const [search, setSearch] = useSearchParams();
  const variant = version.variants.find((entry) => entry.id === search.get("variant"));
  return (
    <>
      <div className="px-5 sm:px-10">
        <ReferenceHeading provider={provider} version={version} compact />
        <p className="mb-6 max-w-4xl text-xs leading-6 text-muted">
          Use <strong className="text-ink">Test Request</strong>{" "}
          to open the request client. For your own instance, choose Custom API server and enter its
          complete base URL in{" "}
          <code>apiServer</code>. Set credentials in Authentication. Requests go directly from your
          browser; the API server must permit this origin with CORS. Credentials are not saved
          between page loads.
        </p>
        {version.variants.length > 0 && (
          <section className="mb-7 rounded-xl border border-line p-5">
            <label className="text-sm font-semibold" htmlFor="operation-variant">
              Operation scope
            </label>
            <select
              id="operation-variant"
              className="field mt-3 w-full text-sm"
              value={variant?.id ?? ""}
              onChange={(event) =>
                setSearch(event.target.value ? { variant: event.target.value } : {})}
            >
              <option value="">
                Main API ({version.operationCount - version.variants.length} operations)
              </option>
              {version.variants.map((entry) => (
                <option value={entry.id} key={entry.id}>{entry.label}</option>
              ))}
            </select>
            <p className="mt-3 text-xs leading-6 text-muted">
              This provider defines {version.variants.length} query-selected variants in{" "}
              <code>x-ms-paths</code>. Each scope retains its own parameters and responses, with all
              shared schemas.
            </p>
          </section>
        )}
      </div>
      <OpenApiExplorer
        key={`${provider.id}:${version.version}:${variant?.id ?? ""}`}
        specUrl={siteUrls.spec(provider.id, version.version)}
        operationsUrl={siteUrls.operations(provider.id, version.version)}
        variant={variant}
      />
      <details className="mx-5 mt-10 border-t border-line pt-5 text-xs text-muted sm:mx-10">
        <summary className="cursor-pointer">Specification provenance</summary>
        <dl className="mt-4 space-y-3 font-mono">
          <div>
            <dt>Source</dt>
            <dd className="mt-1 break-all">
              <a href={version.source} className="text-accent hover:underline">{version.source}</a>
            </dd>
          </div>
          <div>
            <dt>Normalized document SHA-256</dt>
            <dd className="mt-1 break-all text-ink">{version.sha256}</dd>
          </div>
          <div>
            <dt>Upstream source SHA-256</dt>
            <dd className="mt-1 break-all text-ink">{version.sourceSha256}</dd>
          </div>
        </dl>
      </details>
    </>
  );
}
