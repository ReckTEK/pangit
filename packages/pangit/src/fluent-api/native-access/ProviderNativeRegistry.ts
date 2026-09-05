import type {
  GitLabProviderNativeRegistry,
  GitLabVersion,
} from "../../git-host-adapters/gitlab/native/GitLabNative.ts";
import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { GiteaBlobNative } from "../../git-host-adapters/gitea/native/GiteaBlobNative.ts";
import type { GiteaBranchRuleEntityNative } from "../../git-host-adapters/gitea/native/GiteaBranchRuleNative.ts";
import type { GiteaCiEntityNative } from "../../git-host-adapters/gitea/native/GiteaCiRunDiscoveryNative.ts";
import type { GiteaClientNative } from "../../git-host-adapters/gitea/native/GiteaClientNative.ts";
import type { GiteaCurrentUserProfileNative } from "../../git-host-adapters/gitea/native/GiteaCurrentUserProfileNative.ts";
import type {
  GiteaEntityNative,
  GiteaVersion,
} from "../../git-host-adapters/gitea/native/GiteaEntityNative.ts";
import type { GiteaIssueEntityNative } from "../../git-host-adapters/gitea/native/GiteaIssueNative.ts";
import type { GiteaPackageEntityNative } from "../../git-host-adapters/gitea/native/GiteaPackageNative.ts";
import type { GiteaPullRequestReviewNative } from "../../git-host-adapters/gitea/native/GiteaPullRequestReviewNative.ts";
import type { GiteaReleaseEntityNative } from "../../git-host-adapters/gitea/native/GiteaReleaseNative.ts";
import type { GiteaRepositoryContainerNative } from "../../git-host-adapters/gitea/native/GiteaRepositoryContainerNative.ts";
import type { GiteaRepositoryNative } from "../../git-host-adapters/gitea/native/GiteaRepositoryNative.ts";
import type { GiteaRepositoryWebhookNative } from "../../git-host-adapters/gitea/native/GiteaRepositoryWebhookNative.ts";

/** Core normalized entity kinds with provider-native doors. */
export type ProviderCoreEntityNativeKind =
  | "branch"
  | "tag"
  | "commit"
  | "content"
  | "pullRequest"
  | "review"
  | "commitStatus";

/** Optional configured-rule and effective-protection native entity kinds. */
export type ProviderBranchRuleEntityNativeKind = "configuredRule" | "effectiveProtection";

/** Optional CI discovery native entity kinds. */
export type ProviderCiEntityNativeKind = "workflow" | "run" | "job" | "artifact";

/** Optional issue and issue-comment native entity kinds. */
export type ProviderIssueEntityNativeKind = "issue" | "issueComment";

/** Optional package-version and package-file native entity kinds. */
export type ProviderPackageEntityNativeKind = "package" | "packageFile";

/** Optional release and release-asset native entity kinds. */
export type ProviderReleaseEntityNativeKind = "release" | "releaseAsset";

/** Every native door implemented by the Gitea fluent adapter for one exact version. */
export type GiteaProviderNativeRegistry<TVersion extends GiteaVersion> = Readonly<{
  client: GiteaClientNative<TVersion>;
  repositoryContainer: GiteaRepositoryContainerNative<TVersion>;
  repository: GiteaRepositoryNative<TVersion>;
  branch: GiteaEntityNative<TVersion, "branch">;
  tag: GiteaEntityNative<TVersion, "tag">;
  commit: GiteaEntityNative<TVersion, "commit">;
  content: GiteaEntityNative<TVersion, "content">;
  pullRequest: GiteaEntityNative<TVersion, "pullRequest">;
  review: GiteaEntityNative<TVersion, "review">;
  commitStatus: GiteaEntityNative<TVersion, "commitStatus">;
  blob: GiteaBlobNative<TVersion>;
  configuredRule: GiteaBranchRuleEntityNative<TVersion, "configuredRule">;
  effectiveProtection: GiteaBranchRuleEntityNative<TVersion, "effectiveProtection">;
  currentUserProfile: GiteaCurrentUserProfileNative<TVersion>;
  issue: GiteaIssueEntityNative<TVersion, "issue">;
  issueComment: GiteaIssueEntityNative<TVersion, "issueComment">;
  package: GiteaPackageEntityNative<TVersion, "package">;
  packageFile: GiteaPackageEntityNative<TVersion, "packageFile">;
  pullRequestReview: GiteaPullRequestReviewNative<TVersion>;
  release: GiteaReleaseEntityNative<TVersion, "release">;
  releaseAsset: GiteaReleaseEntityNative<TVersion, "releaseAsset">;
  repositoryWebhook: GiteaRepositoryWebhookNative<TVersion>;
  workflow: GiteaCiEntityNative<TVersion, "workflow">;
  run: GiteaCiEntityNative<TVersion, "run">;
  job: GiteaCiEntityNative<TVersion, "job">;
  artifact: GiteaCiEntityNative<TVersion, "artifact">;
}>;

/** Single source of truth for every implemented provider/version native door. */
export type ProviderNativeRegistry = Readonly<{
  gitlab: Readonly<{ [V in GitLabVersion]: GitLabProviderNativeRegistry<V> }>;
  gitea: Readonly<
    {
      [TVersion in GiteaVersion]: GiteaProviderNativeRegistry<TVersion>;
    }
  >;
}>;

type EmptyProviderNative = Record<never, never>;

type RegisteredProviderNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends keyof GiteaProviderNativeRegistry<GiteaVersion>,
> = TProvider extends "gitea" ? GiteaProviderNativeRegistry<TVersion & GiteaVersion>[TKind]
  : TProvider extends "gitlab" ? GitLabProviderNativeRegistry<TVersion & GitLabVersion>[TKind]
  : EmptyProviderNative;

/** Fluent-client native door narrowed to the selected implemented provider. */
export type ProviderClientNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "client">;

/** Repository-container native door narrowed to the selected implemented provider. */
export type ProviderRepositoryContainerNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "repositoryContainer">;

/** Repository native door narrowed to the selected implemented provider. */
export type ProviderRepositoryNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "repository">;

/** Core entity native door narrowed to the selected provider, version, and entity kind. */
export type ProviderEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderCoreEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional SHA-addressed blob native door. */
export type ProviderBlobNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "blob">;

/** Optional branch-rule native door narrowed by normalized entity kind. */
export type ProviderBranchRuleEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderBranchRuleEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional CI discovery native door narrowed by normalized entity kind. */
export type ProviderCiEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderCiEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional authenticated-user-profile native door. */
export type ProviderCurrentUserProfileNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "currentUserProfile">;

/** Optional issue native door narrowed by normalized entity kind. */
export type ProviderIssueEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderIssueEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional package native door narrowed by normalized entity kind. */
export type ProviderPackageEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderPackageEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional submitted pull-request review native door. */
export type ProviderPullRequestReviewNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "pullRequestReview">;

/** Optional release native door narrowed by normalized entity kind. */
export type ProviderReleaseEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderReleaseEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional repository-webhook native door. */
export type ProviderRepositoryWebhookNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "repositoryWebhook">;
