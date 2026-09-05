import { getGitHostApiVersions, getGitHosts, type GitHost } from "../openapi-source-catalog.ts";
import { normalizeAzureDevOps } from "./azure-devops.ts";
import { normalizeBitbucket } from "./bitbucket.ts";
import { normalizeCodeberg } from "./codeberg.ts";
import { normalizeForgejo } from "./forgejo.ts";
import { normalizeGitea } from "./gitea.ts";
import { normalizeGitHub } from "./github.ts";
import { normalizeGitLab } from "./gitlab.ts";
import { clearNormalizedOpenApiSpecifications } from "./normalize-openapi-document.ts";

type GitHostNormalizer = (version: string) => Promise<void>;

export const gitHostNormalizers = {
  gitea: normalizeGitea,
  forgejo: normalizeForgejo,
  github: normalizeGitHub,
  codeberg: normalizeCodeberg,
  gitlab: normalizeGitLab,
  bitbucket: normalizeBitbucket,
  "azure-devops": normalizeAzureDevOps,
} satisfies Record<GitHost, GitHostNormalizer>;

export async function normalizeOpenApiSpecifications(): Promise<void> {
  await clearNormalizedOpenApiSpecifications();
  for (const gitHost of getGitHosts()) {
    for (const version of getGitHostApiVersions(gitHost)) {
      await gitHostNormalizers[gitHost](version);
    }
  }
}
