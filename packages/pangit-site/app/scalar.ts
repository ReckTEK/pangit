import type { ApiReferenceConfigurationWithMultipleSources } from "@scalar/api-reference-react";
import { slugify } from "@scalar/helpers/string/slugify";
import type { DocumentationOperation } from "@mannsion/pangit/documentation";
import type { ExplorerSpec } from "./explorer.ts";
import { siteConfig } from "../site.config.ts";

export const tagSlug = ({ name }: { name?: string }): string => slugify(name ?? "default");

export function operationSlug({ operationId }: { operationId?: string }): string {
  if (!operationId) throw new Error("An explorer operation is missing its PanGit method name.");
  return operationId;
}

/** Use the same slug functions for SSR method links and Scalar's client-side navigation. */
export function operationHref(route: string, operation: DocumentationOperation): string {
  const query = operation.variant ? `?variant=${encodeURIComponent(operation.variant)}` : "";
  const tag = tagSlug({ name: operation.tags[0] });
  const method = operationSlug({ operationId: operation.methodName });
  return `${route}${query}#tag/${tag}/${method}`;
}

/** Validate the final URL, after Scalar resolves server variables and relative paths. */
export function createDirectFetch(documentationOrigin: string): typeof fetch {
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Use an HTTP or HTTPS API URL without embedded credentials.");
    }
    if (url.origin === documentationOrigin) {
      throw new Error("Set your API's complete server URL in the request client before sending.");
    }
    // Explicit authorization stays intact; ambient browser cookies must never be attached.
    return fetch(input, { ...init, credentials: "omit" });
  };
}

export function scalarConfiguration(
  document: ExplorerSpec,
  colorScheme: "light" | "dark",
  documentationOrigin: string,
): Partial<ApiReferenceConfigurationWithMultipleSources> {
  return {
    sources: [{ slug: "api", content: document, agent: { disabled: true } }],
    layout: "modern",
    theme: "none",
    forceDarkModeState: colorScheme,
    hideDarkModeToggle: true,
    withDefaultFonts: false,
    showOperationId: true,
    documentDownloadType: "none",
    hideClientButton: true,
    showDeveloperTools: "never",
    persistAuth: false,
    telemetry: false,
    mcp: { disabled: true },
    proxyUrl: "",
    customFetch: createDirectFetch(documentationOrigin),
    generateTagSlug: tagSlug,
    generateOperationSlug: operationSlug,
    setPageTitle: ({ title }) => `${title} — ${siteConfig.name}`,
  };
}
