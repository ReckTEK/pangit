import type { RestClientOptions } from "../../../generated-rest-clients/runtime/mod.ts";
import type { GitLabClient, GitLabVersion } from "../native/GitLabNative.ts";

const loaders = {
  "18.11.11": () => import("../../../generated-rest-clients/gitlab/18.11.11/GitLabRestClient.ts"),
  "19.3.1": () => import("../../../generated-rest-clients/gitlab/19.3.1/GitLabRestClient.ts"),
} as const;

/** Import only the exact generated transport selected for this provider. */
export async function createRestClient<V extends GitLabVersion>(
  version: V,
  options: RestClientOptions,
): Promise<GitLabClient<V>> {
  const module = await loaders[version]();
  return new module.GitLabRestClient(options) as GitLabClient<V>;
}
