import type { Auth } from "./auth/authentication-contracts.ts";
import { createAuth } from "./auth/client-authentication.ts";
import type { AuthorizedClient, ClientOptions } from "../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../providers/provider.ts";
import { restClientVersions } from "../providers/versions.ts";

/** Fluent API client selected for one generated provider/version contract. */
export type FluentClient<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = AuthorizedClient<TProvider, TVersion> & {
  readonly auth: Auth<TProvider, TVersion>;
};

/** Create a fluent API client for one provider and generated API version. */
export function createClient<
  const TProvider extends Provider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: ClientOptions,
): FluentClient<TProvider, TVersion> {
  if (!Object.hasOwn(restClientVersions, provider)) {
    throw new TypeError(`Unknown PanGit provider ${provider}`);
  }
  const versions: readonly string[] = restClientVersions[provider];
  if (!versions.includes(version)) {
    throw new TypeError(`Unknown PanGit client ${provider} ${version}`);
  }
  return Object.freeze({
    provider,
    version,
    auth: createAuth(provider, version, options),
  });
}
