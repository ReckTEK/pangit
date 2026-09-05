import {
  runCoreAuthentication,
  runCoreBranches,
  runCoreCommits,
  runCoreCommitStatuses,
  runCoreContentReads,
  runCoreFileChangeCommits,
  runCoreForks,
  runCorePullRequestDiscovery,
  runCorePullRequestMerge,
  runCorePullRequestMutation,
  runCorePullRequestReviewsComments,
  runCoreRepositories,
  runCoreTags,
  runGiteaExtensionBranchRulePriority,
  runGiteaExtensionCommitStatus,
  runGiteaExtensionCompareDiffPatch,
  runGiteaExtensionFileChangeCommit,
  runGiteaExtensionIssueContentVersion,
  runGiteaExtensionPullRequestMerge,
  runGiteaExtensionPullRequestReview,
  runNativeAccessGiteaClient,
  runNativeAccessGiteaEntities,
  runSharedCapabilityBlobReads,
  runSharedCapabilityBranchRules,
  runSharedCapabilityCiRunDiscovery,
  runSharedCapabilityCurrentUserProfile,
  runSharedCapabilityIssues,
  runSharedCapabilityPackages,
  runSharedCapabilityPullRequestReviews,
  runSharedCapabilityReleases,
  runSharedCapabilityRepositoryWebhooks,
  runSharedCapabilityUnsupportedGiteaModules,
} from "./catalog/mod.ts";
import type { GiteaContractCatalogEntry } from "./catalog/context.ts";
export type { GiteaContractCatalogEntry, GiteaContractContext } from "./catalog/context.ts";
import { type GiteaFluentContractId, giteaFluentContractIds } from "./gitea-contract-ids.ts";

const runners: Record<GiteaFluentContractId, GiteaContractCatalogEntry["run"]> = {
  "core/authentication": runCoreAuthentication,
  "core/repositories": runCoreRepositories,
  "core/forks": runCoreForks,
  "core/branches": runCoreBranches,
  "core/tags": runCoreTags,
  "core/commits": runCoreCommits,
  "core/content-reads": runCoreContentReads,
  "core/file-change-commits": runCoreFileChangeCommits,
  "core/pull-request-discovery": runCorePullRequestDiscovery,
  "core/pull-request-mutation": runCorePullRequestMutation,
  "core/pull-request-merge": runCorePullRequestMerge,
  "core/pull-request-reviews-comments": runCorePullRequestReviewsComments,
  "core/commit-statuses": runCoreCommitStatuses,
  "gitea-extension/file-change-commit": runGiteaExtensionFileChangeCommit,
  "gitea-extension/compare-diff-patch": runGiteaExtensionCompareDiffPatch,
  "gitea-extension/pull-request-merge": runGiteaExtensionPullRequestMerge,
  "gitea-extension/pull-request-review": runGiteaExtensionPullRequestReview,
  "gitea-extension/commit-status": runGiteaExtensionCommitStatus,
  "shared-capability/current-user-profile": runSharedCapabilityCurrentUserProfile,
  "shared-capability/issues": runSharedCapabilityIssues,
  "gitea-extension/issue-content-version": runGiteaExtensionIssueContentVersion,
  "shared-capability/releases": runSharedCapabilityReleases,
  "shared-capability/repository-webhooks": runSharedCapabilityRepositoryWebhooks,
  "shared-capability/ci-run-discovery": runSharedCapabilityCiRunDiscovery,
  "shared-capability/packages": runSharedCapabilityPackages,
  "shared-capability/blob-reads": runSharedCapabilityBlobReads,
  "shared-capability/pull-request-reviews": runSharedCapabilityPullRequestReviews,
  "shared-capability/branch-rules": runSharedCapabilityBranchRules,
  "gitea-extension/branch-rule-priority": runGiteaExtensionBranchRulePriority,
  "shared-capability/unsupported-gitea-modules": runSharedCapabilityUnsupportedGiteaModules,
  "native-access/gitea/client": runNativeAccessGiteaClient,
  "native-access/gitea/entities": runNativeAccessGiteaEntities,
};

/** Stable ordered Gitea contract catalog; IDs and implementations must be added together. */
export const giteaContractCatalog: readonly GiteaContractCatalogEntry[] = Object.freeze(
  giteaFluentContractIds.map((id) => Object.freeze({ id, run: runners[id] })),
);

/** Select one stable contract or the complete ordered catalog. */
export function selectGiteaContracts(
  requestedId?: string,
): readonly GiteaContractCatalogEntry[] {
  if (requestedId === undefined) return giteaContractCatalog;
  const found = giteaContractCatalog.find((entry) => entry.id === requestedId);
  if (found === undefined) throw new TypeError(`Unknown Gitea fluent contract: ${requestedId}`);
  return Object.freeze([found]);
}
