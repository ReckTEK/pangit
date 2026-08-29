import { documentation } from "./documentation/mod.ts";
import { siteConfig } from "../site.config.ts";

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

export const formatCount = (count: number): string => count.toLocaleString("en-US");
