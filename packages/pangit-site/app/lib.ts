import { documentation } from "@mannsion/pangit/documentation";
import { siteConfig } from "../site.config.ts";
import { siteUrls } from "./urls.ts";

export { documentation };

export function findReference(providerId?: string, versionId?: string) {
  const provider = documentation.providers.find((entry) => entry.id === providerId);
  const version = provider?.versions.find((entry) => entry.version === versionId);
  if (!provider || !version) throw new Response("API reference not found", { status: 404 });
  return { provider, version };
}

export type ThemePreference = "system" | "light" | "dark";

export function readTheme(cookie: string | null): ThemePreference {
  const value = cookie?.split(";").map((part) => part.trim().split("="))
    .find(([name]) => name === siteConfig.theme.cookie)?.[1];
  return value === "light" || value === "dark" ? value : "system";
}

/** Keep Markdown navigation in the site while retaining downloadable example source files. */
export function guideLink(source: string, href: string): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return href;
  // A non-network base is enough to resolve relative Markdown links.
  const url = new URL(href, `file://${siteUrls.example(source)}`);
  const prefix = `${siteConfig.assets.examples.path}/`;
  const relative = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : undefined;
  const guide = documentation.guides.find((entry) => entry.source === relative);
  const target = guide ? siteUrls.guide(guide.slug) : url.pathname;
  return `${target}${url.search}${url.hash}`;
}

export const formatCount = (count: number): string => count.toLocaleString("en-US");
