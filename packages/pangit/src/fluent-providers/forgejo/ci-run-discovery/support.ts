import type { CiRunDiscoveryCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import type { ForgejoVersion } from "../versions.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient } from "../native/ForgejoEntityNative.ts";
import { unavailable } from "../unavailable.ts";

export function forgejoCiRunDiscoverySupport(
  version: ForgejoVersion,
): CiRunDiscoveryCapabilitySupport {
  const modern = version === "16.0.3";
  return Object.freeze({
    supported: true,
    operations: Object.freeze({
      "get-workflow": "direct",
      "list-runs": "one-page",
      "get-run": "direct",
      "list-run-jobs": modern ? "bounded" : "unsupported",
      "get-job": modern ? "bounded" : "unsupported",
      "find-run-artifact": modern ? "bounded" : "unsupported",
      "get-artifact": modern ? "direct" : "unsupported",
    }),
    workflowListing: "native-only-unbounded",
    artifactListing: "native-only-unbounded",
    mutations: "native-only",
  });
}

/** These routes first shipped in Forgejo 16; fail before requesting nonexistent endpoints. */
export async function requireJobArtifactClient<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  operation: string,
): Promise<ForgejoClient<"16.0.3">> {
  if (context.version !== "16.0.3") {
    unavailable(
      context.version,
      operation,
      "Forgejo 15 has no run-job or artifact REST API; Forgejo 16 is required",
    );
  }
  return await context.client() as ForgejoClient<"16.0.3">;
}
