import type { ProviderExtensions } from "../provider-extensions/ExtensionSupport.ts";
import type { UnsupportedOptionalCapabilityMap } from "./optional/unsupported-capabilities.ts";
import type { Provider, ProviderVersion } from "./provider.ts";
import type { AuthenticationAdapter } from "./authentication.ts";
import type { BranchAdapter } from "./branches.ts";
import type { CommitStatusAdapter } from "./commit-statuses.ts";
import type { CommitAdapter } from "./commits.ts";
import type { ContentAdapter } from "./content.ts";
import type { ForkAdapter } from "./forks.ts";
import type { BlobReadAdapter } from "./optional/blob-reads.ts";
import type { BranchRuleAdapter } from "./optional/branch-rules.ts";
import type { CiRunDiscoveryAdapter } from "./optional/ci-run-discovery.ts";
import type { CurrentUserProfileAdapter } from "./optional/current-user-profile.ts";
import type { IssueAdapter } from "./optional/issues.ts";
import type { PackageAdapter } from "./optional/packages.ts";
import type { PullRequestReviewAdapter } from "./optional/pull-request-reviews.ts";
import type { ReleaseAdapter } from "./optional/releases.ts";
import type { RepositoryWebhookAdapter } from "./optional/repository-webhooks.ts";
import type { PullRequestAdapter } from "./pull-requests.ts";
import type { RepositoryAdapter } from "./repositories.ts";
import type { TagAdapter } from "./tags.ts";
import type { ProviderClientNative } from "../native-access/ProviderNativeRegistry.ts";

/** One provider's complete implementation of the universal fluent Git-host contract. */
export interface GitHostAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> extends
  AuthenticationAdapter<TProvider, TVersion, GitHostAdapter<TProvider, TVersion>>,
  RepositoryAdapter<TProvider, TVersion>,
  ForkAdapter<TProvider, TVersion>,
  BranchAdapter<TProvider, TVersion>,
  TagAdapter<TProvider, TVersion>,
  CommitAdapter<TProvider, TVersion>,
  ContentAdapter<TProvider, TVersion>,
  PullRequestAdapter<TProvider, TVersion>,
  CommitStatusAdapter<TProvider, TVersion>,
  CurrentUserProfileAdapter<TProvider, TVersion>,
  IssueAdapter<TProvider, TVersion>,
  ReleaseAdapter<TProvider, TVersion>,
  RepositoryWebhookAdapter<TProvider, TVersion>,
  CiRunDiscoveryAdapter<TProvider, TVersion>,
  PackageAdapter<TProvider, TVersion>,
  BlobReadAdapter<TProvider, TVersion>,
  PullRequestReviewAdapter<TProvider, TVersion>,
  BranchRuleAdapter<TProvider, TVersion> {
  readonly provider: TProvider;
  readonly extensions: ProviderExtensions<TProvider>;
  readonly unsupportedOptionalCapabilities: UnsupportedOptionalCapabilityMap;
  readonly version: TVersion;
  /** Full exact-version generated client at the explicit native boundary. */
  readonly native: ProviderClientNative<TProvider, TVersion>;
}
