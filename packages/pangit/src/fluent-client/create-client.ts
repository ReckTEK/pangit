import type {} from "../fluent-providers/forgejo/registration.ts";
import type {} from "../fluent-providers/gitea/registration.ts";
import type {} from "../fluent-providers/gitlab/registration.ts";
import type { ProviderVersion } from "../fluent-api/adapter-contract/provider.ts";
import type { FluentClientOptions } from "../fluent-api/adapter-contract/client-options.ts";
import type { FluentClient } from "../fluent-api/client/FluentClient.ts";
import { ProviderAdapterUnavailableError } from "../fluent-api/adapter-contract/errors.ts";

import { snapshotClientOptions } from "./snapshot-client-options.ts";

const providers = {
  forgejo: (): Promise<typeof import("../fluent-providers/forgejo/mod.ts")> =>
    import("../fluent-providers/forgejo/mod.ts"),
  gitea: (): Promise<typeof import("../fluent-providers/gitea/mod.ts")> =>
    import("../fluent-providers/gitea/mod.ts"),
  gitlab: (): Promise<typeof import("../fluent-providers/gitlab/mod.ts")> =>
    import("../fluent-providers/gitlab/mod.ts"),
} as const;

export type FluentProvider = keyof typeof providers;
export type FluentProviderVersion<P extends FluentProvider> = ProviderVersion<P>;

/** Load only the selected standalone provider. Generated transports remain version-lazy. */
export async function createClient<
  const P extends keyof typeof providers,
  const V extends ProviderVersion<P>,
>(
  provider: P,
  version: V,
  baseUrlOrOptions: string | URL | FluentClientOptions,
): Promise<FluentClient<P, V>> {
  if (!Object.hasOwn(providers, provider)) {
    throw new ProviderAdapterUnavailableError(provider, version);
  }
  const options = typeof baseUrlOrOptions === "string" || baseUrlOrOptions instanceof URL
    ? { baseUrl: baseUrlOrOptions }
    : baseUrlOrOptions;
  const snapshot = snapshotClientOptions(options);
  const implementation = await providers[provider]();
  // The catalog key binds the implementation to P; each provider validates its own version.
  const create = implementation.createClient as unknown as (
    version: V,
    options: FluentClientOptions,
  ) => FluentClient<P, V>;
  return create(version, snapshot);
}
