import {
  type ApiSpecProvider,
  apiSpecProviders,
  getApiSpecProviders,
  getApiSpecVersions,
} from "../sources.ts";
import { normalizeAzureDevOps } from "./azure-devops.ts";
import { normalizeBitbucket } from "./bitbucket.ts";
import { normalizeCodeberg } from "./codeberg.ts";
import { normalizeGitea } from "./gitea.ts";
import { normalizeGitHub } from "./github.ts";
import { normalizeGitLab } from "./gitlab.ts";
import { clearNormalizedApiSpecs, normalizedSpecPath, targetOpenApiVersion } from "./utils.ts";

type ProviderNormalizer = (version: string) => Promise<void>;

export const providerNormalizers = {
  gitea: normalizeGitea,
  github: normalizeGitHub,
  codeberg: normalizeCodeberg,
  gitlab: normalizeGitLab,
  bitbucket: normalizeBitbucket,
  "azure-devops": normalizeAzureDevOps,
} satisfies Record<ApiSpecProvider, ProviderNormalizer>;

export async function normalizeApiSpecs(): Promise<void> {
  await clearNormalizedApiSpecs();
  for (const provider of getApiSpecProviders()) {
    for (const version of getApiSpecVersions(provider)) {
      await providerNormalizers[provider](version);
      console.log(JSON.stringify({
        provider: apiSpecProviders[provider].name,
        version,
        openapi: targetOpenApiVersion,
        destination: normalizedSpecPath(provider, version),
      }));
    }
  }
}

if (import.meta.main) {
  await normalizeApiSpecs();
}
