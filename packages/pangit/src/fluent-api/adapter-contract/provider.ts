/** Type families supplied explicitly by one provider implementation. */
export interface ProviderTypeDefinition {
  readonly versions: string;
  readonly extensions: object;
  readonly native: ProviderNativeTypes;
}

/** A type-level mapping supplied by a provider for an exact version and native entity kind. */
export interface ProviderNativeTypes {
  readonly version: string;
  readonly kind: string;
  readonly type: object;
}

/** A composition of provider-owned definitions; it has no ambient registrations. */
export type ProviderTypeRegistry = Readonly<Record<string, ProviderTypeDefinition>>;

/** Universal contracts accept provider identities without depending on a product catalog. */
export type Provider = string;
export type ProviderVersion<
  P extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = P extends keyof TRegistry
  ? TRegistry[P] extends { readonly versions: infer V extends string } ? V : string
  : string;
export type FluentProvider = Provider;
export type FluentProviderVersion<
  P extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ProviderVersion<P, TRegistry>;
