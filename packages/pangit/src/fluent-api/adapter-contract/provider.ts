/** Extensible type registration. Implementations augment this interface from their own folders. */
// deno-lint-ignore no-empty-interface
export interface ProviderTypeRegistry {}

/** Universal contracts accept provider identities without depending on a product catalog. */
export type Provider = string;
export type ProviderVersion<P extends Provider> = P extends keyof ProviderTypeRegistry
  ? ProviderTypeRegistry[P] extends { readonly versions: infer V extends string } ? V : string
  : string;
export type FluentProvider = Provider;
export type FluentProviderVersion<P extends Provider> = ProviderVersion<P>;
