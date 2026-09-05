import type { GiteaProviderTypes } from "./provider-types.ts";
import type { GitHostAdapter } from "../../fluent-api/adapter-contract/GitHostAdapter.ts";
import type { GiteaVersion } from "./versions.ts";
export type Adapter<V extends GiteaVersion> = GitHostAdapter<"gitea", V, GiteaProviderTypes>;
