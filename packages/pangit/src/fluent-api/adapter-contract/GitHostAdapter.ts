import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";
import type { ProviderExtensions } from "../provider-extensions/ExtensionSupport.ts";
import type { UnsupportedOptionalCapabilityMap } from "./optional/unsupported-capabilities.ts";

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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends
  AuthenticationAdapter<
    TProvider,
    TVersion,
    GitHostAdapter<TProvider, TVersion, TRegistry>,
    TRegistry
  >,
  RepositoryAdapter<TProvider, TVersion, TRegistry>,
  ForkAdapter<TProvider, TVersion, TRegistry>,
  BranchAdapter<TProvider, TVersion, TRegistry>,
  TagAdapter<TProvider, TVersion, TRegistry>,
  CommitAdapter<TProvider, TVersion, TRegistry>,
  ContentAdapter<TProvider, TVersion, TRegistry>,
  PullRequestAdapter<TProvider, TVersion, TRegistry>,
  CommitStatusAdapter<TProvider, TVersion, TRegistry>,
  CurrentUserProfileAdapter<TProvider, TVersion, TRegistry>,
  IssueAdapter<TProvider, TVersion, TRegistry>,
  ReleaseAdapter<TProvider, TVersion, TRegistry>,
  RepositoryWebhookAdapter<TProvider, TVersion, TRegistry>,
  CiRunDiscoveryAdapter<TProvider, TVersion, TRegistry>,
  PackageAdapter<TProvider, TVersion, TRegistry>,
  BlobReadAdapter<TProvider, TVersion, TRegistry>,
  PullRequestReviewAdapter<TProvider, TVersion, TRegistry>,
  BranchRuleAdapter<TProvider, TVersion, TRegistry> {
  readonly provider: TProvider;
  readonly extensions: ProviderExtensions<TProvider, TRegistry>;
  readonly unsupportedOptionalCapabilities: UnsupportedOptionalCapabilityMap;
  readonly version: TVersion;
  /** Full exact-version generated client at the explicit native boundary. */
  readonly native: ProviderClientNative<TProvider, TVersion, TRegistry>;
}
