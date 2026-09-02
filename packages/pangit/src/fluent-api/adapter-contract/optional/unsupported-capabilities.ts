/** Optional provider families intentionally unavailable through a high-level adapter. */
export type ExplicitlyUnsupportedOptionalCapability =
  | "deployments-environments"
  | "gists-snippets";

/** Static unsupported metadata. Reading it must never probe a provider. */
export interface UnsupportedOptionalCapabilityMetadata {
  readonly supported: false;
  readonly operations: readonly never[];
  readonly reason: string;
}

export type UnsupportedOptionalCapabilityMap = Readonly<
  Record<ExplicitlyUnsupportedOptionalCapability, UnsupportedOptionalCapabilityMetadata>
>;
