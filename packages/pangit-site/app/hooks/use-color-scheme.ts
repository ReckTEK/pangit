import { useSyncExternalStore } from "react";
import { useRouteLoaderData } from "react-router";
import type { loader } from "../root.tsx";

const query = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  const media = matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Bridge the site's single theme preference to components that need a resolved color scheme. */
export function useColorScheme(): "light" | "dark" {
  const preference = useRouteLoaderData<typeof loader>("root")?.theme ?? "system";
  const systemDark = useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false);
  return preference === "dark" || (preference === "system" && systemDark) ? "dark" : "light";
}
