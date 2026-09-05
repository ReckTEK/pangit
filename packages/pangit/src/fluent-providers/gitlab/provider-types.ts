import type { ProviderNativeTypes } from "../../fluent-api/adapter-contract/provider.ts";
import type { ProviderNativeKind } from "../../fluent-api/native-access/ProviderNativeRegistry.ts";
import type { ProviderExtensionDefinition } from "../../fluent-api/provider-extensions/ProviderExtensionRegistry.ts";
import type {
  GitLabCommitFileChangesExtension,
  GitLabCommitFileChangesExtensionContext,
} from "./extensions/content.ts";
import type {
  GitLabMergePullRequestExtension,
  GitLabMergePullRequestExtensionContext,
} from "./extensions/pull-requests.ts";
import type {
  GitLabSetCommitStatusExtension,
  GitLabSetCommitStatusExtensionContext,
} from "./extensions/commit-statuses.ts";
import type { GitLabProviderNativeRegistry, GitLabVersion } from "./native/GitLabNative.ts";

export interface GitLabExtensionRegistry {
  readonly "content.commitChanges": ProviderExtensionDefinition<
    GitLabCommitFileChangesExtensionContext,
    GitLabCommitFileChangesExtension,
    never,
    never
  >;
  readonly "pullRequests.merge": ProviderExtensionDefinition<
    GitLabMergePullRequestExtensionContext,
    GitLabMergePullRequestExtension,
    never,
    never
  >;
  readonly "statuses.set": ProviderExtensionDefinition<
    GitLabSetCommitStatusExtensionContext,
    GitLabSetCommitStatusExtension,
    never,
    never
  >;
}

/** Explicit type families owned by the GitLab implementation. */
export type GitLabProviderTypes = {
  readonly gitlab: {
    readonly versions: GitLabVersion;
    readonly extensions: GitLabExtensionRegistry;
    readonly native: GitLabNativeTypes;
  };
};

/** Preserve generic version inference while selecting one native type family. */
export interface GitLabNativeTypes extends ProviderNativeTypes {
  readonly type: GitLabProviderNativeRegistry<
    this["version"] & GitLabVersion
  >[this["kind"] & ProviderNativeKind];
}
