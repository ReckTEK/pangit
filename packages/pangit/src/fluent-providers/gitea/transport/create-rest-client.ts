import type { RestClientOptions } from "../../../generated-rest-clients/runtime/mod.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";

const loaders = {
  "1.26.4": () => import("../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts"),
  "1.27.2": () => import("../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts"),
} as const;

/** Import only the exact generated transport selected for this provider. */
export async function createRestClient<V extends GiteaVersion>(
  version: V,
  options: RestClientOptions,
): Promise<GiteaClient<V>> {
  const module = await loadRestClientModule(version);
  return new module.GiteaRestClient(options) as GiteaClient<V>;
}

/** Share version selection with operations that use generated response metadata. */
export function loadRestClientModule(version: GiteaVersion) {
  return loaders[version]();
}
