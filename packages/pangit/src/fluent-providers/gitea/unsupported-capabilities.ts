import type {
  UnsupportedOptionalCapabilityMap,
  UnsupportedOptionalCapabilityMetadata,
} from "../../fluent-api/adapter-contract/optional/unsupported-capabilities.ts";
import type { GiteaVersion } from "./versions.ts";
const deploymentsAndEnvironments = Object.freeze({
  supported: false,
  operations: Object.freeze([]),
  reason: "Gitea does not expose the analyzed deployments/environments API family",
}) satisfies UnsupportedOptionalCapabilityMetadata;

const gistsAndSnippets = Object.freeze({
  supported: false,
  operations: Object.freeze([]),
  reason: "Gitea does not expose the analyzed gists/snippets API family",
}) satisfies UnsupportedOptionalCapabilityMetadata;

const commonSupport = Object.freeze({
  "deployments-environments": deploymentsAndEnvironments,
  "gists-snippets": gistsAndSnippets,
}) satisfies UnsupportedOptionalCapabilityMap;

export const giteaUnsupportedOptionalCapabilities: Readonly<
  Record<GiteaVersion, UnsupportedOptionalCapabilityMap>
> = Object.freeze({ "1.26.4": commonSupport, "1.27.2": commonSupport });
export function getGiteaUnsupportedOptionalCapabilities(
  version: GiteaVersion,
): UnsupportedOptionalCapabilityMap {
  return giteaUnsupportedOptionalCapabilities[version];
}
