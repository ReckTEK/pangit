import type { ForgejoProviderTypes } from "../fluent-providers/forgejo/provider-types.ts";
import type { GiteaProviderTypes } from "../fluent-providers/gitea/provider-types.ts";
import type { GitLabProviderTypes } from "../fluent-providers/gitlab/provider-types.ts";

/** Explicit type composition for the public provider catalog. Imports are erased at runtime. */
export type FluentProviderTypes = ForgejoProviderTypes & GiteaProviderTypes & GitLabProviderTypes;
