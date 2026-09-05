import { generatedComment } from "../../generated-notices.ts";
import { generatedRestClientRelativePath } from "./generated-rest-client-paths.ts";
import type { RestClientSpecManifest } from "./rest-client-manifests.ts";
import { compareText } from "./naming.ts";

/** Render the small generated provider registry as focused runtime and contract modules. */
export function renderProviderRegistryFiles(
  manifest: RestClientSpecManifest,
  runtimeModulePath = "./runtime/mod.ts",
): ReadonlyMap<string, string> {
  const providers = Object.keys(manifest.gitHosts).toSorted(compareText);
  const versions = Object.fromEntries(
    providers.map((provider) => [
      provider,
      Object.keys(manifest.gitHosts[provider].versions).toSorted(compareText),
    ]),
  );
  const typeMap = providers.map((provider) => {
    const className = manifest.gitHosts[provider].client.className;
    const entries = versions[provider].map((version) =>
      `    ${JSON.stringify(version)}: import(${
        JSON.stringify(providerModulePath(manifest, provider, version))
      }).${className};`
    );
    return `  ${JSON.stringify(provider)}: {\n${entries.join("\n")}\n  };`;
  }).join("\n");
  const loaders = providers.map((provider) => {
    const className = manifest.gitHosts[provider].client.className;
    const entries = versions[provider].map((version) =>
      `    ${JSON.stringify(version)}: async (options) => new (await import(${
        JSON.stringify(providerModulePath(manifest, provider, version))
      })).${className}(options),`
    );
    return `  ${JSON.stringify(provider)}: {\n${entries.join("\n")}\n  },`;
  }).join("\n");
  const generated = generatedComment("//");

  return new Map([
    [
      "supported-versions.ts",
      `${generated}export const restClientVersions = ${JSON.stringify(versions)} as const;\n`,
    ],
    [
      "rest-client-type-map.ts",
      `${generated}export type RestClientTypeMap = {
${typeMap}
};

export type RestClientProvider = keyof RestClientTypeMap;
export type RestClientVersion<TProvider extends RestClientProvider> =
  keyof RestClientTypeMap[TProvider] & string;
`,
    ],
    [
      "git-host.ts",
      `${generated}import type {
  RestClientProvider,
  RestClientVersion,
} from "./rest-client-type-map.ts";

export type GitHost = RestClientProvider;
export type GitHostVersion<TGitHost extends GitHost> = RestClientVersion<TGitHost>;

/** Public compatibility name for a Git host. */
export type Provider = GitHost;
/** Public compatibility name for a Git-host API version. */
export type ProviderVersion<TProvider extends Provider> = GitHostVersion<TProvider>;
`,
    ],
    [
      "client-options.ts",
      `${generated}import type { RestClientOptions } from ${JSON.stringify(runtimeModulePath)};

export type ClientOptions = Omit<RestClientOptions, "headers">;
`,
    ],
    [
      "create-rest-client.ts",
      `${generated}import type {
  RestClientProvider,
  RestClientTypeMap,
  RestClientVersion,
} from "./rest-client-type-map.ts";
import { RestClient, type RestClientOptions } from ${JSON.stringify(runtimeModulePath)};

type RestClientConfiguration = RestClientOptions | RestClient;

type RestClientLoader = (configuration: RestClientConfiguration) => Promise<unknown>;

const restClientLoaders = {
${loaders}
} satisfies Record<RestClientProvider, Record<string, RestClientLoader>>;

export function createProviderClient<
  const TProvider extends RestClientProvider,
  const TVersion extends RestClientVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  baseUrl: string | URL,
): Promise<RestClientTypeMap[TProvider][TVersion]>;
export function createProviderClient<
  const TProvider extends RestClientProvider,
  const TVersion extends RestClientVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  configuration: RestClientConfiguration,
): Promise<RestClientTypeMap[TProvider][TVersion]>;
export function createProviderClient<
  const TProvider extends RestClientProvider,
  const TVersion extends RestClientVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  baseUrlOrConfiguration: string | URL | RestClientConfiguration,
): Promise<RestClientTypeMap[TProvider][TVersion]> {
  const providerLoaders = Object.hasOwn(restClientLoaders, provider)
    ? restClientLoaders[provider] as Record<string, RestClientLoader> : undefined;
  const loader = providerLoaders !== undefined && Object.hasOwn(providerLoaders, version)
    ? providerLoaders[version] : undefined;
  if (loader === undefined) {
    throw new Error(\`Unknown provider client version \${provider} \${version}\`);
  }
  let configuration: RestClientConfiguration;
  if (typeof baseUrlOrConfiguration === "string" || baseUrlOrConfiguration instanceof URL) {
    configuration = { baseUrl: baseUrlOrConfiguration };
  } else {
    configuration = baseUrlOrConfiguration;
  }
  return loader(configuration instanceof RestClient ? configuration : new RestClient(configuration)) as Promise<RestClientTypeMap[TProvider][TVersion]>;
}
`,
    ],
    [
      "mod.ts",
      `${generated}export { createProviderClient } from "./create-rest-client.ts";
export { restClientVersions } from "./supported-versions.ts";
export type {
  RestClientProvider,
  RestClientTypeMap,
  RestClientVersion,
} from "./rest-client-type-map.ts";
export type { ClientOptions } from "./client-options.ts";
export type { GitHost, GitHostVersion, Provider, ProviderVersion } from "./git-host.ts";
`,
    ],
  ]);
}

function providerModulePath(
  manifest: RestClientSpecManifest,
  provider: string,
  version: string,
): string {
  return `./${
    generatedRestClientRelativePath(
      manifest.gitHosts[provider].versions[version].artifacts.client,
    )
  }`;
}
