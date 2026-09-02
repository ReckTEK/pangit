import type { ClientOptions } from "../generated-rest-clients/client-options.ts";
import type { Provider, ProviderVersion } from "../generated-rest-clients/git-host.ts";
import type {
  RepositoryHostAdapter,
  SelectedRepositoryHostAdapter,
} from "./host-adapter-contract/RepositoryHostAdapter.ts";
import { RepositoryHostAdapterNotImplementedError } from "./host-adapter-contract/RepositoryHostAdapterNotImplementedError.ts";

/** Erased runtime factory shape stored before generic selection narrows it. */
type RuntimeAdapterFactory = (version: string, options: ClientOptions) => Promise<unknown>;

/** Lazy adapter factories keyed once by the public Git-host selector. */
const adapterFactories: Partial<Record<Provider, RuntimeAdapterFactory>> = {
  gitea: async (version, options) => {
    const { GiteaRepositoryHostAdapter } = await import(
      "../git-host-adapters/gitea/GiteaRepositoryHostAdapter.ts"
    );
    return new GiteaRepositoryHostAdapter(
      version as ProviderVersion<"gitea">,
      options,
    );
  },
};

/** Select and memoize one lazy Git-host adapter without branching in domain operations. */
export function selectRepositoryHostAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: ClientOptions,
): SelectedRepositoryHostAdapter<TProvider, TVersion> {
  const factory = adapterFactories[provider];
  if (factory === undefined) {
    return () => Promise.reject(new RepositoryHostAdapterNotImplementedError(provider));
  }

  let selected:
    | Promise<RepositoryHostAdapter<TProvider, TVersion>>
    | undefined;
  return () => {
    selected ??= factory(version, options) as Promise<
      RepositoryHostAdapter<TProvider, TVersion>
    >;
    return selected;
  };
}
