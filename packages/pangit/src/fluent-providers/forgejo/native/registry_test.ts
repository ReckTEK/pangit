import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { ForgejoBlobNative } from "./ForgejoBlobNative.ts";
import type { ForgejoBranchRuleEntityNative } from "./ForgejoBranchRuleNative.ts";
import type { ForgejoCiEntityNative } from "./ForgejoCiRunDiscoveryNative.ts";
import type { ForgejoClientNative } from "./ForgejoClientNative.ts";
import type { ForgejoCurrentUserProfileNative } from "./ForgejoCurrentUserProfileNative.ts";
import type { ForgejoEntityNative, ForgejoVersion } from "./ForgejoEntityNative.ts";
import type { ForgejoIssueEntityNative } from "./ForgejoIssueNative.ts";
import type { ForgejoPackageEntityNative } from "./ForgejoPackageNative.ts";
import type { ForgejoPullRequestReviewNative } from "./ForgejoPullRequestReviewNative.ts";
import type { ForgejoReleaseEntityNative } from "./ForgejoReleaseNative.ts";
import type { ForgejoRepositoryContainerNative } from "./ForgejoRepositoryContainerNative.ts";
import type { ForgejoRepositoryNative } from "./ForgejoRepositoryNative.ts";
import type { ForgejoRepositoryWebhookNative } from "./ForgejoRepositoryWebhookNative.ts";
import type {
  ProviderBlobNative,
  ProviderBranchRuleEntityNative,
  ProviderCiEntityNative,
  ProviderClientNative,
  ProviderCurrentUserProfileNative,
  ProviderEntityNative,
  ProviderIssueEntityNative,
  ProviderNativeRegistry,
  ProviderPackageEntityNative,
  ProviderPullRequestReviewNative,
  ProviderReleaseEntityNative,
  ProviderRepositoryContainerNative,
  ProviderRepositoryNative,
  ProviderRepositoryWebhookNative,
} from "../../../fluent-api/native-access/ProviderNativeRegistry.ts";

type Equal<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true
  : false;

type Assert<TValue extends true> = TValue;

type ExpectedForgejoRegistry<TVersion extends ForgejoVersion> = Readonly<{
  client: ForgejoClientNative<TVersion>;
  repositoryContainer: ForgejoRepositoryContainerNative<TVersion>;
  repository: ForgejoRepositoryNative<TVersion>;
  branch: ForgejoEntityNative<TVersion, "branch">;
  tag: ForgejoEntityNative<TVersion, "tag">;
  commit: ForgejoEntityNative<TVersion, "commit">;
  content: ForgejoEntityNative<TVersion, "content">;
  pullRequest: ForgejoEntityNative<TVersion, "pullRequest">;
  review: ForgejoEntityNative<TVersion, "review">;
  commitStatus: ForgejoEntityNative<TVersion, "commitStatus">;
  blob: ForgejoBlobNative<TVersion>;
  configuredRule: ForgejoBranchRuleEntityNative<TVersion, "configuredRule">;
  effectiveProtection: ForgejoBranchRuleEntityNative<TVersion, "effectiveProtection">;
  currentUserProfile: ForgejoCurrentUserProfileNative<TVersion>;
  issue: ForgejoIssueEntityNative<TVersion, "issue">;
  issueComment: ForgejoIssueEntityNative<TVersion, "issueComment">;
  package: ForgejoPackageEntityNative<TVersion, "package">;
  packageFile: ForgejoPackageEntityNative<TVersion, "packageFile">;
  pullRequestReview: ForgejoPullRequestReviewNative<TVersion>;
  release: ForgejoReleaseEntityNative<TVersion, "release">;
  releaseAsset: ForgejoReleaseEntityNative<TVersion, "releaseAsset">;
  repositoryWebhook: ForgejoRepositoryWebhookNative<TVersion>;
  workflow: ForgejoCiEntityNative<TVersion, "workflow">;
  run: ForgejoCiEntityNative<TVersion, "run">;
  job: ForgejoCiEntityNative<TVersion, "job">;
  artifact: ForgejoCiEntityNative<TVersion, "artifact">;
}>;

type RegistryAssertions = readonly [
  Assert<
    Equal<
      {
        readonly [K in keyof ExpectedForgejoRegistry<"15.0.7">]: ProviderNativeRegistry<
          "15.0.7",
          K,
          ForgejoProviderTypes
        >["forgejo"];
      },
      ExpectedForgejoRegistry<"15.0.7">
    >
  >,
  Assert<
    Equal<
      {
        readonly [K in keyof ExpectedForgejoRegistry<"16.0.3">]: ProviderNativeRegistry<
          "16.0.3",
          K,
          ForgejoProviderTypes
        >["forgejo"];
      },
      ExpectedForgejoRegistry<"16.0.3">
    >
  >,
  Assert<
    Equal<
      ProviderClientNative<"forgejo", "16.0.3", ForgejoProviderTypes>,
      ForgejoClientNative<"16.0.3">
    >
  >,
  Assert<
    Equal<
      ProviderRepositoryContainerNative<"forgejo", "16.0.3", ForgejoProviderTypes>,
      ForgejoRepositoryContainerNative<"16.0.3">
    >
  >,
  Assert<
    Equal<
      ProviderRepositoryNative<"forgejo", "16.0.3", ForgejoProviderTypes>,
      ForgejoRepositoryNative<"16.0.3">
    >
  >,
  Assert<
    Equal<
      ProviderEntityNative<"forgejo", "16.0.3", "branch", ForgejoProviderTypes>,
      ForgejoEntityNative<"16.0.3", "branch">
    >
  >,
  Assert<
    Equal<
      ProviderBlobNative<"forgejo", "16.0.3", ForgejoProviderTypes>,
      ForgejoBlobNative<"16.0.3">
    >
  >,
  Assert<
    Equal<
      ProviderBranchRuleEntityNative<"forgejo", "16.0.3", "configuredRule", ForgejoProviderTypes>,
      ForgejoBranchRuleEntityNative<"16.0.3", "configuredRule">
    >
  >,
  Assert<
    Equal<
      ProviderCiEntityNative<"forgejo", "16.0.3", "artifact", ForgejoProviderTypes>,
      ForgejoCiEntityNative<"16.0.3", "artifact">
    >
  >,
  Assert<
    Equal<
      ProviderCurrentUserProfileNative<"forgejo", "16.0.3", ForgejoProviderTypes>,
      ForgejoCurrentUserProfileNative<"16.0.3">
    >
  >,
  Assert<
    Equal<
      ProviderIssueEntityNative<"forgejo", "16.0.3", "issueComment", ForgejoProviderTypes>,
      ForgejoIssueEntityNative<"16.0.3", "issueComment">
    >
  >,
  Assert<
    Equal<
      ProviderPackageEntityNative<"forgejo", "16.0.3", "packageFile", ForgejoProviderTypes>,
      ForgejoPackageEntityNative<"16.0.3", "packageFile">
    >
  >,
  Assert<
    Equal<
      ProviderPullRequestReviewNative<"forgejo", "16.0.3", ForgejoProviderTypes>,
      ForgejoPullRequestReviewNative<"16.0.3">
    >
  >,
  Assert<
    Equal<
      ProviderReleaseEntityNative<"forgejo", "16.0.3", "releaseAsset", ForgejoProviderTypes>,
      ForgejoReleaseEntityNative<"16.0.3", "releaseAsset">
    >
  >,
  Assert<
    Equal<
      ProviderRepositoryWebhookNative<"forgejo", "16.0.3", ForgejoProviderTypes>,
      ForgejoRepositoryWebhookNative<"16.0.3">
    >
  >,
  Assert<Equal<ProviderClientNative<"github", "latest">, Record<never, never>>>,
];

Deno.test("provider native registry covers every Forgejo native door with exact versions", () => {
  const assertions: RegistryAssertions = [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ];
  if (assertions.some((assertion) => !assertion)) throw new Error("native registry mismatch");
});
