import { createAuth, createOAuthHandler } from "../auth/mod.ts";
import type { Auth, OAuthHandler, OAuthLoginRegistry } from "../auth/core.ts";
import { type Provider, type ProviderVersion, restClientVersions } from "../generated/mod.ts";
import type { ClientOptions } from "./core.ts";

export type { AuthorizedClient, ClientOptions } from "./core.ts";

/** Provider/version selection exposes auth first; later capabilities join this client lifecycle. */
export interface SelectedClient<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly auth: Auth<TProvider, TVersion>;
}

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
