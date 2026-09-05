import type { CodebergClientOptions } from "../fluent-providers/forgejo/hosts/codeberg.ts";
import type { ForgejoVersion } from "../fluent-providers/forgejo/versions.ts";
import type { FluentClient } from "../fluent-api/client/FluentClient.ts";

/** Load the Forgejo implementation only when the hosted Codeberg client is selected. */
export async function createCodebergClient<const V extends ForgejoVersion>(
  version: V,
  options: CodebergClientOptions = {},
): Promise<FluentClient<"forgejo", V>> {
  const snapshot = {
    ...options,
    ...(options.query === undefined ? {} : { query: structuredClone(options.query) }),
  };
  const provider = await import("../fluent-providers/forgejo/mod.ts");
  return provider.createCodebergClient(version, snapshot);
}
