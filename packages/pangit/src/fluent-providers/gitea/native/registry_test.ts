import type {} from "../registration.ts";
import type { GiteaBlobNative } from "./GiteaBlobNative.ts";
import type { GiteaBranchRuleEntityNative } from "./GiteaBranchRuleNative.ts";
import type { GiteaCiEntityNative } from "./GiteaCiRunDiscoveryNative.ts";
import type { GiteaClientNative } from "./GiteaClientNative.ts";
import type { GiteaCurrentUserProfileNative } from "./GiteaCurrentUserProfileNative.ts";
import type { GiteaEntityNative, GiteaVersion } from "./GiteaEntityNative.ts";
import type { GiteaIssueEntityNative } from "./GiteaIssueNative.ts";
import type { GiteaPackageEntityNative } from "./GiteaPackageNative.ts";
import type { GiteaPullRequestReviewNative } from "./GiteaPullRequestReviewNative.ts";
import type { GiteaReleaseEntityNative } from "./GiteaReleaseNative.ts";
import type { GiteaRepositoryContainerNative } from "./GiteaRepositoryContainerNative.ts";
import type { GiteaRepositoryNative } from "./GiteaRepositoryNative.ts";
import type { GiteaRepositoryWebhookNative } from "./GiteaRepositoryWebhookNative.ts";
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

type ExpectedGiteaRegistry<TVersion extends GiteaVersion> = Readonly<{
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

type RegistryAssertions = readonly [
  Assert<
    Equal<
      {
        readonly [K in keyof ExpectedGiteaRegistry<"1.26.4">]: ProviderNativeRegistry<
          "1.26.4",
          K
        >["gitea"];
      },
      ExpectedGiteaRegistry<"1.26.4">
    >
  >,
  Assert<
    Equal<
      {
        readonly [K in keyof ExpectedGiteaRegistry<"1.27.2">]: ProviderNativeRegistry<
          "1.27.2",
          K
        >["gitea"];
      },
      ExpectedGiteaRegistry<"1.27.2">
    >
  >,
  Assert<Equal<ProviderClientNative<"gitea", "1.27.2">, GiteaClientNative<"1.27.2">>>,
  Assert<
    Equal<
      ProviderRepositoryContainerNative<"gitea", "1.27.2">,
      GiteaRepositoryContainerNative<"1.27.2">
    >
  >,
  Assert<Equal<ProviderRepositoryNative<"gitea", "1.27.2">, GiteaRepositoryNative<"1.27.2">>>,
  Assert<
    Equal<ProviderEntityNative<"gitea", "1.27.2", "branch">, GiteaEntityNative<"1.27.2", "branch">>
  >,
  Assert<Equal<ProviderBlobNative<"gitea", "1.27.2">, GiteaBlobNative<"1.27.2">>>,
  Assert<
    Equal<
      ProviderBranchRuleEntityNative<"gitea", "1.27.2", "configuredRule">,
      GiteaBranchRuleEntityNative<"1.27.2", "configuredRule">
    >
  >,
  Assert<
    Equal<
      ProviderCiEntityNative<"gitea", "1.27.2", "artifact">,
      GiteaCiEntityNative<"1.27.2", "artifact">
    >
  >,
  Assert<
    Equal<
      ProviderCurrentUserProfileNative<"gitea", "1.27.2">,
      GiteaCurrentUserProfileNative<"1.27.2">
    >
  >,
  Assert<
    Equal<
      ProviderIssueEntityNative<"gitea", "1.27.2", "issueComment">,
      GiteaIssueEntityNative<"1.27.2", "issueComment">
    >
  >,
  Assert<
    Equal<
      ProviderPackageEntityNative<"gitea", "1.27.2", "packageFile">,
      GiteaPackageEntityNative<"1.27.2", "packageFile">
    >
  >,
  Assert<
    Equal<
      ProviderPullRequestReviewNative<"gitea", "1.27.2">,
      GiteaPullRequestReviewNative<"1.27.2">
    >
  >,
  Assert<
    Equal<
      ProviderReleaseEntityNative<"gitea", "1.27.2", "releaseAsset">,
      GiteaReleaseEntityNative<"1.27.2", "releaseAsset">
    >
  >,
  Assert<
    Equal<
      ProviderRepositoryWebhookNative<"gitea", "1.27.2">,
      GiteaRepositoryWebhookNative<"1.27.2">
    >
  >,
  Assert<Equal<ProviderClientNative<"github", "latest">, Record<never, never>>>,
];

Deno.test("provider native registry covers every Gitea native door with exact versions", () => {
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
