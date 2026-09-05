import { createClient } from "../create-client.ts";
import type { ForgejoVersion } from "../versions.ts";
import type { FluentClientOptions } from "../../../fluent-api/adapter-contract/client-options.ts";
import type { FluentClient } from "../../../fluent-api/client/FluentClient.ts";

/** Codeberg is hosted Forgejo. Select the API version explicitly and retain transport hooks. */
export type CodebergClientOptions = Omit<FluentClientOptions, "baseUrl" | "webBaseUrl">;

export function createCodebergClient<const V extends ForgejoVersion>(
  version: V,
  options: CodebergClientOptions = {},
): FluentClient<"forgejo", V> {
  return createClient(version, {
    ...options,
    baseUrl: "https://codeberg.org/api/v1",
    webBaseUrl: "https://codeberg.org/",
  });
}
