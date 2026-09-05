import { type SiteConfig, siteConfig } from "../site.config.ts";

export type ReferenceView = "explorer" | "methods";

function joinPath(base: string, ...parts: string[]): string {
  return [
    base.replace(/\/$/, ""),
    ...parts.filter(Boolean).map((part) => part.replace(/^\/+|\/+$/g, "")),
  ]
    .join("/") || "/";
}

/** Build both router patterns and links from the same configuration. */
export function createSiteUrls(config: SiteConfig) {
  const { routes, assets } = config;
  const raw = joinPath(routes.docs, routes.raw);
  const referencePattern = joinPath(routes.raw, ":provider", ":version");
  const reference = (provider: string, version: string, view: ReferenceView = "explorer") =>
    joinPath(
      raw,
      encodeURIComponent(provider),
      encodeURIComponent(version),
      view === "methods" ? routes.methods : "",
    );
  const artifact = (provider: string, version: string, suffix = "") =>
    joinPath(
      assets.openapi,
      encodeURIComponent(provider),
      `${encodeURIComponent(version)}${suffix}.json`,
    );
  return {
    home: routes.home,
    docs: routes.docs,
    theme: routes.theme,
    repository: config.links.repository,
    source: (path: string) => `${config.links.repository}/blob/main/${path}`,
    main: `#${config.anchors.main}`,
    referenceSection: `#${config.anchors.reference}`,
    logo: joinPath(assets.brand.path, assets.logo),
    reference,
    guide: (slug: string) => joinPath(routes.docs, routes.fluent, encodeURIComponent(slug)),
    provider: (provider: string) => joinPath(raw, encodeURIComponent(provider)),
    spec: (provider: string, version: string) => artifact(provider, version),
    operations: (provider: string, version: string) => artifact(provider, version, ".operations"),
    patterns: {
      guide: (slug: string) => joinPath(routes.fluent, slug),
      reference: referencePattern,
      methods: joinPath(referencePattern, routes.methods),
    },
    referenceView: (pathname: string): ReferenceView =>
      pathname.endsWith(`/${routes.methods}`) ? "methods" : "explorer",
  };
}

export const siteUrls = createSiteUrls(siteConfig);

/** Match a path prefix without matching unrelated paths such as /docs-other. */
export function isWithinPath(url: string, path: string): boolean {
  if (!url.startsWith("/") || url.startsWith("//")) return false;
  const pathname = url.split(/[?#]/, 1)[0];
  const prefix = path.replace(/\/+$/, "");
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
