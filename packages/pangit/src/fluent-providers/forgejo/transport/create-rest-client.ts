import type { RestClientOptions } from "../../../generated-rest-clients/runtime/mod.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";

const loaders = {
  "15.0.7": () => import("../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts"),
  "16.0.3": () => import("../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts"),
} as const;

/** Import only the exact generated transport selected for this provider. */
export async function createRestClient<V extends ForgejoVersion>(
  version: V,
  options: RestClientOptions,
): Promise<ForgejoClient<V>> {
  const module = await loadRestClientModule(version);
  return new module.ForgejoRestClient(options) as ForgejoClient<V>;
}

/** Share version selection with operations that use generated response metadata. */
export function loadRestClientModule(version: ForgejoVersion) {
  return loaders[version]();
}
