import type { Provider, ProviderVersion } from "../generated/mod.ts";
import type { RestClientOptions } from "../rest/mod.ts";

/** Transport configuration shared by every PanGit capability. */
export type ClientOptions = Omit<RestClientOptions, "headers">;

/** Root contract returned after authentication and extended by future capabilities. */
export interface AuthorizedClient<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
}
