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
  runForgejoExtensionCommitStatus,
  runForgejoExtensionFileChangeCommit,
  runForgejoExtensionPullRequestMerge,
  runForgejoExtensionPullRequestReview,
  runNativeAccessForgejoClient,
  runNativeAccessForgejoEntities,
  runSharedCapabilityBlobReads,
  runSharedCapabilityBranchRules,
  runSharedCapabilityCiRunDiscovery,
  runSharedCapabilityCurrentUserProfile,
  runSharedCapabilityIssues,
  runSharedCapabilityPackages,
  runSharedCapabilityPullRequestReviews,
  runSharedCapabilityReleases,
  runSharedCapabilityRepositoryWebhooks,
  runSharedCapabilityUnsupportedForgejoModules,
} from "./catalog/mod.ts";
import type { ForgejoContractCatalogEntry } from "./catalog/context.ts";
export type { ForgejoContractCatalogEntry, ForgejoContractContext } from "./catalog/context.ts";
import { type ForgejoFluentContractId, forgejoFluentContractIds } from "./forgejo-contract-ids.ts";

const runners: Record<ForgejoFluentContractId, ForgejoContractCatalogEntry["run"]> = {
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
  "forgejo-extension/file-change-commit": runForgejoExtensionFileChangeCommit,
  "forgejo-extension/pull-request-merge": runForgejoExtensionPullRequestMerge,
  "forgejo-extension/pull-request-review": runForgejoExtensionPullRequestReview,
  "forgejo-extension/commit-status": runForgejoExtensionCommitStatus,
  "shared-capability/current-user-profile": runSharedCapabilityCurrentUserProfile,
  "shared-capability/issues": runSharedCapabilityIssues,
  "shared-capability/releases": runSharedCapabilityReleases,
  "shared-capability/repository-webhooks": runSharedCapabilityRepositoryWebhooks,
  "shared-capability/ci-run-discovery": runSharedCapabilityCiRunDiscovery,
  "shared-capability/packages": runSharedCapabilityPackages,
  "shared-capability/blob-reads": runSharedCapabilityBlobReads,
  "shared-capability/pull-request-reviews": runSharedCapabilityPullRequestReviews,
  "shared-capability/branch-rules": runSharedCapabilityBranchRules,
  "shared-capability/unsupported-forgejo-modules": runSharedCapabilityUnsupportedForgejoModules,
  "native-access/forgejo/client": runNativeAccessForgejoClient,
  "native-access/forgejo/entities": runNativeAccessForgejoEntities,
};

/** Stable ordered Forgejo contract catalog; IDs and implementations must be added together. */
export const forgejoContractCatalog: readonly ForgejoContractCatalogEntry[] = Object.freeze(
  forgejoFluentContractIds.map((id) => Object.freeze({ id, run: runners[id] })),
);

/** Select one stable contract or the complete ordered catalog. */
export function selectForgejoContracts(
  requestedId?: string,
): readonly ForgejoContractCatalogEntry[] {
  if (requestedId === undefined) return forgejoContractCatalog;
  const found = forgejoContractCatalog.find((entry) => entry.id === requestedId);
  if (found === undefined) throw new TypeError(`Unknown Forgejo fluent contract: ${requestedId}`);
  return Object.freeze([found]);
}
