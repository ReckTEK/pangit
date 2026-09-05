import type { ForgejoProviderTypes } from "./provider-types.ts";
import { createForgejoAdapter } from "./create-adapter.ts";
import { type ForgejoVersion, versions } from "./versions.ts";
import { createFluentClient } from "../../fluent-api/client/create-fluent-client.ts";
import type { FluentClient } from "../../fluent-api/client/FluentClient.ts";
import type { FluentClientOptions } from "../../fluent-api/adapter-contract/client-options.ts";
import { ProviderAdapterUnavailableError } from "../../fluent-api/adapter-contract/errors.ts";
export { versions } from "./versions.ts";
export type { ForgejoVersion } from "./versions.ts";

/** Standalone Forgejo implementation of the universal fluent contract. */
export function createClient<const V extends ForgejoVersion>(
  version: V,
  options: FluentClientOptions,
): FluentClient<"forgejo", V, ForgejoProviderTypes> {
  if (!(versions as readonly string[]).includes(version)) {
    throw new ProviderAdapterUnavailableError("forgejo", version);
  }
  return createFluentClient(createForgejoAdapter(version, options));
}
