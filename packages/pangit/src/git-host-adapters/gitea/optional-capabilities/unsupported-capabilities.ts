import type {
  UnsupportedOptionalCapabilityMap,
} from "../../../fluent-api/adapter-contract/optional/unsupported-capabilities.ts";
import { fluentClientCapabilitySupport } from "../../../fluent-api/provider-registry.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

/** Static per-version metadata; resolving it performs no provider request. */
export const giteaUnsupportedOptionalCapabilities: Readonly<
  Record<GiteaVersion, UnsupportedOptionalCapabilityMap>
> = Object.freeze({
  "1.26.4": fluentClientCapabilitySupport.gitea["1.26.4"].unsupportedOptionalCapabilities,
  "1.27.2": fluentClientCapabilitySupport.gitea["1.27.2"].unsupportedOptionalCapabilities,
});

export function getGiteaUnsupportedOptionalCapabilities(
  version: GiteaVersion,
): UnsupportedOptionalCapabilityMap {
  return giteaUnsupportedOptionalCapabilities[version];
}
