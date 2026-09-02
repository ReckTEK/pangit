import type { ProviderVersion } from "../generated-rest-clients/git-host.ts";
import type { GiteaAdapterOptions } from "../git-host-adapters/gitea/GiteaAdapterContext.ts";
import type { GitHostAdapter, SelectedGitHostAdapter } from "./adapter-contract/GitHostAdapter.ts";
import type { FluentProvider } from "./provider-registry.ts";

type RuntimeAdapterFactory = (
  version: string,
  options: GiteaAdapterOptions,
) => Promise<GitHostAdapter<"gitea", ProviderVersion<"gitea">>>;

/** Literal lazy imports are the complete implemented high-level provider registry. */
const adapterFactories = Object.freeze(
  {
    gitea: async (version, options) => {
      const { GiteaGitHostAdapter } = await import(
        "../git-host-adapters/gitea/GiteaGitHostAdapter.ts"
      );
      return new GiteaGitHostAdapter(version as ProviderVersion<"gitea">, options);
    },
  } satisfies Record<FluentProvider, RuntimeAdapterFactory>,
);

/** Select and memoize exactly one provider adapter for a fluent client. */
export function selectGitHostAdapter<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: GiteaAdapterOptions,
): SelectedGitHostAdapter<TProvider, TVersion> {
  const factory = adapterFactories[provider];
  let selected: Promise<GitHostAdapter<TProvider, TVersion>> | undefined;
  return () => {
    selected ??= factory(version, options) as unknown as Promise<
      GitHostAdapter<TProvider, TVersion>
    >;
    return selected;
  };
}
