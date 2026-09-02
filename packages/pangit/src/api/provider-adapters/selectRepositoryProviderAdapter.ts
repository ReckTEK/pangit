import type { ClientOptions } from "../../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../../providers/provider.ts";
import type {
  RepositoryProviderAdapter,
  SelectedRepositoryProviderAdapter,
} from "./RepositoryProviderAdapter.ts";
import { RepositoryProviderAdapterNotImplementedError } from "./RepositoryProviderAdapterNotImplementedError.ts";

/** Erased runtime factory shape stored before generic selection narrows it. */
type RuntimeProviderFactory = (version: string, options: ClientOptions) => Promise<unknown>;

/** Lazy adapter factories keyed once by the public provider selector. */
const providerFactories: Partial<Record<Provider, RuntimeProviderFactory>> = {
  gitea: async (version, options) => {
    const { GiteaRepositoryProviderAdapter } = await import(
      "./gitea/GiteaRepositoryProviderAdapter.ts"
    );
    return new GiteaRepositoryProviderAdapter(
      version as ProviderVersion<"gitea">,
      options,
    );
  },
};

/** Select and memoize one lazy provider adapter without branching in domain operations. */
export function selectRepositoryProviderAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: ClientOptions,
): SelectedRepositoryProviderAdapter<TProvider, TVersion> {
  const factory = providerFactories[provider];
  if (factory === undefined) {
    return () => Promise.reject(new RepositoryProviderAdapterNotImplementedError(provider));
  }

  let selected:
    | Promise<RepositoryProviderAdapter<TProvider, TVersion>>
    | undefined;
  return () => {
    selected ??= factory(version, options) as Promise<
      RepositoryProviderAdapter<TProvider, TVersion>
    >;
    return selected;
  };
}
