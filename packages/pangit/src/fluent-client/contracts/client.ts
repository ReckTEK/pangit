import type * as Contract from "../../fluent-api/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";

/** Fluent API client selected for one implemented provider/version adapter. */
export type FluentClient<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.FluentClient<TProvider, TVersion, FluentProviderTypes>;

export type AuthorizedClient<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.AuthorizedClient<TProvider, TVersion, FluentProviderTypes>;
