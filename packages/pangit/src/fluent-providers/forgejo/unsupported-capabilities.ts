import type {
  UnsupportedOptionalCapabilityMap,
  UnsupportedOptionalCapabilityMetadata,
} from "../../fluent-api/adapter-contract/optional/unsupported-capabilities.ts";
import type { ForgejoVersion } from "./versions.ts";
const deploymentsAndEnvironments = Object.freeze({
  supported: false,
  operations: Object.freeze([]),
  reason: "Forgejo does not expose the analyzed deployments/environments API family",
}) satisfies UnsupportedOptionalCapabilityMetadata;

const gistsAndSnippets = Object.freeze({
  supported: false,
  operations: Object.freeze([]),
  reason: "Forgejo does not expose the analyzed gists/snippets API family",
}) satisfies UnsupportedOptionalCapabilityMetadata;

const commonSupport = Object.freeze({
  "deployments-environments": deploymentsAndEnvironments,
  "gists-snippets": gistsAndSnippets,
}) satisfies UnsupportedOptionalCapabilityMap;

export const forgejoUnsupportedOptionalCapabilities: Readonly<
  Record<ForgejoVersion, UnsupportedOptionalCapabilityMap>
> = Object.freeze({ "15.0.7": commonSupport, "16.0.3": commonSupport });
export function getForgejoUnsupportedOptionalCapabilities(
  version: ForgejoVersion,
): UnsupportedOptionalCapabilityMap {
  return forgejoUnsupportedOptionalCapabilities[version];
}
