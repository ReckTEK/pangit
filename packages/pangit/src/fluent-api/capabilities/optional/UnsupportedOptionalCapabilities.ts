import type {
  UnsupportedOptionalCapabilityMap,
} from "../../adapter-contract/optional/unsupported-capabilities.ts";

/** Metadata-only view; unsupported families deliberately expose no callable operation. */
export interface UnsupportedOptionalCapabilities {
  readonly support: UnsupportedOptionalCapabilityMap;
}

export function createUnsupportedOptionalCapabilities(
  support: UnsupportedOptionalCapabilityMap,
): UnsupportedOptionalCapabilities {
  return Object.freeze({ support });
}
