import type { Auth } from "../auth/authentication-contracts.ts";
import { createAuth } from "../auth/client-authentication.ts";
import type { OAuthHandler, OAuthLoginRegistry } from "../auth/oauth-contracts.ts";
import { createOAuthHandler } from "../auth/oauth-handler.ts";
import type { AuthorizedClient, ClientOptions } from "../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../providers/provider.ts";
import { restClientVersions } from "../providers/versions.ts";

/** Provider/version selection exposes auth first; later capabilities join this client lifecycle. */
export type SelectedClient<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = AuthorizedClient<TProvider, TVersion> & {
  readonly auth: Auth<TProvider, TVersion>;
};

/** Top-level PanGit API. */
export interface PanGit {
  createClient<
    const TProvider extends Provider,
    const TVersion extends ProviderVersion<TProvider>,
  >(
    provider: TProvider,
    version: TVersion,
    options: ClientOptions,
  ): SelectedClient<TProvider, TVersion>;
  createOAuthHandler<const TLogins extends OAuthLoginRegistry>(
    logins: TLogins,
  ): OAuthHandler<Extract<keyof TLogins, Provider>>;
}

function createClient<
  const TProvider extends Provider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: ClientOptions,
): SelectedClient<TProvider, TVersion> {
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

/** Public PanGit entry point. */
export const PanGit: PanGit = Object.freeze({ createClient, createOAuthHandler });
