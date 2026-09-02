import type { ProviderVersion } from "../generated-rest-clients/git-host.ts";
import { ProviderAdapterUnavailableError } from "./adapter-contract/errors.ts";
import type { CurrentUserProfileCapabilitySupport } from "./adapter-contract/optional/current-user-profile.ts";
import type { PackageCapabilitySupport } from "./adapter-contract/optional/packages.ts";
import type {
  UnsupportedOptionalCapabilityMap,
  UnsupportedOptionalCapabilityMetadata,
} from "./adapter-contract/optional/unsupported-capabilities.ts";

/** Providers whose complete high-level adapter is registered. Raw clients have a wider registry. */
export const fluentProviderVersions: Readonly<{
  readonly gitea: readonly ["1.26.4", "1.27.2"];
}> = Object.freeze({
  gitea: Object.freeze(["1.26.4", "1.27.2"] as const),
});

export type FluentProvider = keyof typeof fluentProviderVersions;
export type FluentProviderVersion<TProvider extends FluentProvider> = ProviderVersion<TProvider>;

/** Client-scoped capability metadata available without loading a provider implementation. */
export interface FluentClientCapabilitySupport {
  readonly currentUserProfile: CurrentUserProfileCapabilitySupport;
  readonly packages: PackageCapabilitySupport;
  readonly unsupportedOptionalCapabilities: UnsupportedOptionalCapabilityMap;
}

const deploymentsAndEnvironments = Object.freeze({
  supported: false,
  operations: Object.freeze([]),
  reason: "Gitea does not expose the analyzed deployments/environments API family",
}) satisfies UnsupportedOptionalCapabilityMetadata;

const gistsAndSnippets = Object.freeze({
  supported: false,
  operations: Object.freeze([]),
  reason: "Gitea does not expose the analyzed gists/snippets API family",
}) satisfies UnsupportedOptionalCapabilityMetadata;

const giteaUnsupportedOptionalCapabilities = Object.freeze({
  "deployments-environments": deploymentsAndEnvironments,
  "gists-snippets": gistsAndSnippets,
}) satisfies UnsupportedOptionalCapabilityMap;

const giteaClientCapabilitySupport = Object.freeze({
  currentUserProfile: Object.freeze({
    supported: true,
    current: "direct",
  }),
  packages: Object.freeze({
    supported: true,
    operations: Object.freeze({
      "list-packages": "one-page",
      "list-versions": "one-page",
      "get-version": "direct",
      "find-version": "direct",
      "list-files": "direct-bounded-result",
      "delete-version": "direct",
      "delete-package": "direct",
    }),
    upload: "native-only",
    download: "native-only",
    repositoryLinking: "native-only",
  }),
  unsupportedOptionalCapabilities: giteaUnsupportedOptionalCapabilities,
}) satisfies FluentClientCapabilitySupport;

/** Static exact-version client capability registry; reading it never probes a provider. */
export const fluentClientCapabilitySupport: Readonly<{
  readonly gitea: Readonly<
    Record<"1.26.4" | "1.27.2", FluentClientCapabilitySupport>
  >;
}> = Object.freeze({
  gitea: Object.freeze({
    "1.26.4": giteaClientCapabilitySupport,
    "1.27.2": giteaClientCapabilitySupport,
  }),
});

export function getFluentClientCapabilitySupport(
  provider: FluentProvider,
  version: string,
): FluentClientCapabilitySupport {
  const byVersion = fluentClientCapabilitySupport[provider] as Readonly<
    Record<string, FluentClientCapabilitySupport>
  >;
  const support = byVersion[version];
  if (support === undefined) {
    throw new ProviderAdapterUnavailableError(provider, version);
  }
  return support;
}

export function isFluentProvider(value: string): value is FluentProvider {
  return Object.hasOwn(fluentProviderVersions, value);
}
