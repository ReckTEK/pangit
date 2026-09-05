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
declare module "../../fluent-api/adapter-contract/provider.ts" {
  interface ProviderTypeRegistry {
    readonly gitlab: {
      readonly versions: GitLabVersion;
      readonly extensions: GitLabExtensionRegistry;
    };
  }
}

declare module "../../fluent-api/native-access/ProviderNativeRegistry.ts" {
  interface ProviderNativeRegistry<V extends string, K extends ProviderNativeKind> {
    readonly gitlab: GitLabProviderNativeRegistry<V & GitLabVersion>[K];
  }
}
