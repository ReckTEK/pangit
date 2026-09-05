import type { GitLabProviderTypes } from "./provider-types.ts";
import { createGitLabAdapter } from "./create-adapter.ts";
import { type GitLabVersion, versions } from "./versions.ts";
import { createFluentClient } from "../../fluent-api/client/create-fluent-client.ts";
import type { FluentClient } from "../../fluent-api/client/FluentClient.ts";
import type { FluentClientOptions } from "../../fluent-api/adapter-contract/client-options.ts";
import { ProviderAdapterUnavailableError } from "../../fluent-api/adapter-contract/errors.ts";

/** Standalone GitLab implementation of the universal fluent contract. */
export function createClient<const V extends GitLabVersion>(
  version: V,
  options: FluentClientOptions,
): FluentClient<"gitlab", V, GitLabProviderTypes> {
  if (!(versions as readonly string[]).includes(version)) {
    throw new ProviderAdapterUnavailableError("gitlab", version);
  }
  return createFluentClient(createGitLabAdapter(version, options));
}
