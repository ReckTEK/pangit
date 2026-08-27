/** Generated, strongly typed lazy loader for provider REST client versions. */
import type { RestClient, RestClientOptions } from "../rest.ts";

export const restClientVersions = {
  "azure-devops": ["latest"],
  "bitbucket": ["latest"],
  "codeberg": ["latest"],
  "gitea": ["1.26.4", "1.27.2"],
  "github": ["latest"],
  "gitlab": ["18.11.11", "19.3.1"],
} as const;

export type RestClientProvider = keyof RestClientTypeMap;
export type RestClientVersion<TProvider extends RestClientProvider> =
  & keyof RestClientTypeMap[TProvider]
  & string;

export type RestClientTypeMap = {
  "azure-devops": {
    "latest": import("./azure-devops/latest.ts").AzureDevOpsRestClient;
  };
  "bitbucket": {
    "latest": import("./bitbucket/latest.ts").BitbucketRestClient;
  };
  "codeberg": {
    "latest": import("./codeberg/latest.ts").CodebergRestClient;
  };
  "gitea": {
    "1.26.4": import("./gitea/1.26.4.ts").GiteaRestClient;
    "1.27.2": import("./gitea/1.27.2.ts").GiteaRestClient;
  };
  "github": {
    "latest": import("./github/latest.ts").GitHubRestClient;
  };
  "gitlab": {
    "18.11.11": import("./gitlab/18.11.11.ts").GitLabRestClient;
    "19.3.1": import("./gitlab/19.3.1.ts").GitLabRestClient;
  };
};

type RestClientLoader = (
  options: RestClientOptions | RestClient,
) => Promise<unknown>;

const restClientLoaders = {
  "azure-devops": {
    "latest": async (options) =>
      new (await import("./azure-devops/latest.ts")).AzureDevOpsRestClient(options),
  },
  "bitbucket": {
    "latest": async (options) =>
      new (await import("./bitbucket/latest.ts")).BitbucketRestClient(options),
  },
  "codeberg": {
    "latest": async (options) =>
      new (await import("./codeberg/latest.ts")).CodebergRestClient(options),
  },
  "gitea": {
    "1.26.4": async (options) => new (await import("./gitea/1.26.4.ts")).GiteaRestClient(options),
    "1.27.2": async (options) => new (await import("./gitea/1.27.2.ts")).GiteaRestClient(options),
  },
  "github": {
    "latest": async (options) => new (await import("./github/latest.ts")).GitHubRestClient(options),
  },
  "gitlab": {
    "18.11.11": async (options) =>
      new (await import("./gitlab/18.11.11.ts")).GitLabRestClient(options),
    "19.3.1": async (options) => new (await import("./gitlab/19.3.1.ts")).GitLabRestClient(options),
  },
} satisfies Record<RestClientProvider, Record<string, RestClientLoader>>;

export function loadRestClient<
  TProvider extends RestClientProvider,
  TVersion extends RestClientVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: RestClientOptions | RestClient,
): Promise<RestClientTypeMap[TProvider][TVersion]> {
  const loader = (restClientLoaders[provider] as Record<string, RestClientLoader>)[version];
  if (loader === undefined) {
    throw new Error(`Unknown REST client version ${provider} ${version}`);
  }
  return loader(options) as Promise<RestClientTypeMap[TProvider][TVersion]>;
}
