import type { ProviderNativeKind } from "../../fluent-api/native-access/ProviderNativeRegistry.ts";
import type { ProviderExtensionDefinition } from "../../fluent-api/provider-extensions/ProviderExtensionRegistry.ts";
import type {
  ForgejoCommitFileChangesExtension,
  ForgejoCommitFileChangesExtensionContext,
} from "./extensions/content.ts";
import type {
  ForgejoMergePullRequestExtension,
  ForgejoMergePullRequestExtensionContext,
} from "./extensions/pull-requests.ts";
import type {
  ForgejoCreatePullRequestReviewExtension,
  ForgejoCreatePullRequestReviewExtensionContext,
} from "./extensions/pull-request-reviews.ts";
import type {
  ForgejoSetCommitStatusExtension,
  ForgejoSetCommitStatusExtensionContext,
} from "./extensions/commit-statuses.ts";
import type { ForgejoBasicAuthorizationExtension } from "./extensions/basic-authorization.ts";
import type { ForgejoProviderNativeRegistry } from "./native/registry.ts";
import type { ForgejoVersion } from "./native/ForgejoEntityNative.ts";
export interface ForgejoExtensionRegistry {
  readonly "content.commitChanges": ProviderExtensionDefinition<
    ForgejoCommitFileChangesExtensionContext,
    ForgejoCommitFileChangesExtension,
    never,
    never
  >;
  readonly "pullRequests.merge": ProviderExtensionDefinition<
    ForgejoMergePullRequestExtensionContext,
    ForgejoMergePullRequestExtension,
    never,
    never
  >;
  readonly "pullRequestReviews.create": ProviderExtensionDefinition<
    ForgejoCreatePullRequestReviewExtensionContext,
    ForgejoCreatePullRequestReviewExtension,
    never,
    never
  >;
  readonly "statuses.set": ProviderExtensionDefinition<
    ForgejoSetCommitStatusExtensionContext,
    ForgejoSetCommitStatusExtension,
    never,
    never
  >;
  readonly "auth.basic": ProviderExtensionDefinition<
    Record<never, never>,
    ForgejoBasicAuthorizationExtension,
    never,
    never
  >;
}
declare module "../../fluent-api/adapter-contract/provider.ts" {
  interface ProviderTypeRegistry {
    readonly forgejo: {
      readonly versions: ForgejoVersion;
      readonly extensions: ForgejoExtensionRegistry;
    };
  }
}

declare module "../../fluent-api/native-access/ProviderNativeRegistry.ts" {
  interface ProviderNativeRegistry<V extends string, K extends ProviderNativeKind> {
    readonly forgejo: ForgejoProviderNativeRegistry<V & ForgejoVersion>[K];
  }
}
