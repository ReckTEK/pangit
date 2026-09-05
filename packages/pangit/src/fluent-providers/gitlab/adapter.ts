import type { GitLabProviderTypes } from "./provider-types.ts";
import type { GitHostAdapter } from "../../fluent-api/adapter-contract/GitHostAdapter.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";

import type { GitLabVersion } from "./native/GitLabNative.ts";

export type Adapter<V extends GitLabVersion> = GitHostAdapter<"gitlab", V, GitLabProviderTypes>;

export type Repo<V extends GitLabVersion> = RepositoryData<"gitlab", V, GitLabProviderTypes>;
