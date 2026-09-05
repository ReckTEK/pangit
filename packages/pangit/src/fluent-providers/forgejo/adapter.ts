import type { ForgejoProviderTypes } from "./provider-types.ts";
import type { GitHostAdapter } from "../../fluent-api/adapter-contract/GitHostAdapter.ts";
import type { ForgejoVersion } from "./versions.ts";
export type Adapter<V extends ForgejoVersion> = GitHostAdapter<"forgejo", V, ForgejoProviderTypes>;
