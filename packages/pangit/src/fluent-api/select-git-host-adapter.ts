import type { ProviderVersion } from "../generated-rest-clients/git-host.ts";
import type { FluentClientOptions } from "./FluentClient.ts";
import type { GitHostAdapter, SelectedGitHostAdapter } from "./adapter-contract/GitHostAdapter.ts";
import type { FluentProvider } from "./provider-registry.ts";

/** Literal lazy imports keep unused provider implementations out of client startup. */
const adapterFactories = Object.freeze({
  gitea: async (version: string, options: FluentClientOptions) => {
    const { GiteaGitHostAdapter } = await import(
      "../git-host-adapters/gitea/GiteaGitHostAdapter.ts"
    );
    return new GiteaGitHostAdapter(version as ProviderVersion<"gitea">, options);
  },
  gitlab: async (version: string, options: FluentClientOptions) => {
    const { createGitLabAdapter } = await import(
      "../git-host-adapters/gitlab/GitLabGitHostAdapter.ts"
    );
    return createGitLabAdapter(version as ProviderVersion<"gitlab">, options);
  },
});

/** Select and memoize exactly one provider adapter for a fluent client. */
export function selectGitHostAdapter<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: FluentClientOptions,
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
