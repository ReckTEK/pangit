import { generatedComment } from "../../generated-notices.ts";
import { generatedProviderClientPath } from "../provider-layout.ts";
import type { RestClientSpecManifest } from "./client-manifests.ts";
import { compareText } from "./naming.ts";

/** Render the small generated provider registry as focused runtime and contract modules. */
export function renderProviderRegistryFiles(
  manifest: RestClientSpecManifest,
  runtimeModulePath = "./runtime/mod.ts",
): ReadonlyMap<string, string> {
  const providers = Object.keys(manifest.providers).toSorted(compareText);
  const versions = Object.fromEntries(
    providers.map((provider) => [
      provider,
      Object.keys(manifest.providers[provider].versions).toSorted(compareText),
    ]),
  );
  const typeMap = providers.map((provider) => {
    const className = manifest.providers[provider].client.className;
    const entries = versions[provider].map((version) =>
      `    ${JSON.stringify(version)}: import(${
        JSON.stringify(providerModulePath(manifest, provider, version))
      }).${className};`
    );
    return `  ${JSON.stringify(provider)}: {\n${entries.join("\n")}\n  };`;
  }).join("\n");
  const loaders = providers.map((provider) => {
    const className = manifest.providers[provider].client.className;
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
      "versions.ts",
      `${generated}export const restClientVersions = ${JSON.stringify(versions)} as const;\n`,
    ],
    [
      "clients.ts",
      `${generated}export type RestClientTypeMap = {
${typeMap}
};

export type RestClientProvider = keyof RestClientTypeMap;
export type RestClientVersion<TProvider extends RestClientProvider> =
  keyof RestClientTypeMap[TProvider] & string;
`,
    ],
    [
      "provider.ts",
      `${generated}import type {
  RestClientProvider,
  RestClientVersion,
} from "./clients.ts";

export type Provider = RestClientProvider;
export type ProviderVersion<TProvider extends Provider> = RestClientVersion<TProvider>;

export interface ProviderSelection<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
}
`,
    ],
    [
      "managed-client.ts",
      `${generated}import type { RestClientOptions } from ${JSON.stringify(runtimeModulePath)};
import type { Provider, ProviderSelection, ProviderVersion } from "./provider.ts";

export type ClientOptions = Omit<RestClientOptions, "headers">;

export type AuthorizedClient<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = ProviderSelection<TProvider, TVersion>;
`,
    ],
    [
      "registry.ts",
      `${generated}import type {
  RestClientProvider,
  RestClientTypeMap,
  RestClientVersion,
} from "./clients.ts";
import type { RestClient, RestClientOptions } from ${JSON.stringify(runtimeModulePath)};

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
  const loader = (restClientLoaders[provider] as Record<string, RestClientLoader>)[version];
  if (loader === undefined) {
    throw new Error(\`Unknown provider client version \${provider} \${version}\`);
  }
  let configuration: RestClientConfiguration;
  if (typeof baseUrlOrConfiguration === "string" || baseUrlOrConfiguration instanceof URL) {
    configuration = { baseUrl: baseUrlOrConfiguration };
  } else {
    configuration = baseUrlOrConfiguration;
  }
  return loader(configuration) as Promise<RestClientTypeMap[TProvider][TVersion]>;
}
`,
    ],
    [
      "mod.ts",
      `${generated}export { createProviderClient } from "./registry.ts";
export { restClientVersions } from "./versions.ts";
export type {
  RestClientProvider,
  RestClientTypeMap,
  RestClientVersion,
} from "./clients.ts";
export type { AuthorizedClient, ClientOptions } from "./managed-client.ts";
export type { Provider, ProviderSelection, ProviderVersion } from "./provider.ts";
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
    generatedProviderClientPath(
      manifest.providers[provider].versions[version].artifacts.client,
    )
  }`;
}
