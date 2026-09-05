import type {} from "./registration.ts";
import { createGiteaAdapter } from "./create-adapter.ts";
import { type GiteaVersion, versions } from "./versions.ts";
import { createFluentClient } from "../../fluent-api/client/create-fluent-client.ts";
import type { FluentClient } from "../../fluent-api/client/FluentClient.ts";
import type { FluentClientOptions } from "../../fluent-api/adapter-contract/client-options.ts";
import { ProviderAdapterUnavailableError } from "../../fluent-api/adapter-contract/errors.ts";
export { versions } from "./versions.ts";
export type { GiteaVersion } from "./versions.ts";

/** Standalone Gitea implementation of the universal fluent contract. */
export function createClient<const V extends GiteaVersion>(
  version: V,
  options: FluentClientOptions,
): FluentClient<"gitea", V> {
  if (!(versions as readonly string[]).includes(version)) {
    throw new ProviderAdapterUnavailableError("gitea", version);
  }
  return createFluentClient(createGiteaAdapter(version, options));
}

export type * from "./native/mod.ts";
export type * from "./extensions/mod.ts";
