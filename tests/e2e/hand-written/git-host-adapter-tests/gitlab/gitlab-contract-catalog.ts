import {
  runCoreAuthentication,
  runCoreBranches,
  runCoreCommitFilesPagination,
  runCoreCommits,
  runCoreCommitStatuses,
  runCoreContentReads,
  runCoreFileChanges,
  runCoreForks,
  runCoreLinks,
  runCoreOauth,
  runCorePullRequestApproval,
  runCorePullRequestComments,
  runCorePullRequestMerge,
  runCorePullRequests,
  runCoreRepositories,
  runCoreTags,
  runGitlabExtensionOperations,
  runSharedCapabilityBlobReads,
  runSharedCapabilityBranchProtectionEnforcement,
  runSharedCapabilityBranchRules,
  runSharedCapabilityCiRunDiscovery,
  runSharedCapabilityIssues,
  runSharedCapabilityPackages,
  runSharedCapabilityReleases,
  runSharedCapabilityUnsupportedModules,
  runSharedCapabilityWebhooks,
} from "./catalog/mod.ts";
import type { GitLabE2EFixtureDriver } from "./GitLabE2EFixtureDriver.ts";

const contracts = {
  "core/authentication": runCoreAuthentication,
  "core/oauth": runCoreOauth,
  "gitlab-extension/operations": runGitlabExtensionOperations,
  "core/repositories": runCoreRepositories,
  "core/forks": runCoreForks,
  "core/branches": runCoreBranches,
  "core/tags": runCoreTags,
  "core/commits": runCoreCommits,
  "core/commit-files-pagination": runCoreCommitFilesPagination,
  "core/content-reads": runCoreContentReads,
  "core/file-changes": runCoreFileChanges,
  "core/links": runCoreLinks,
  "core/pull-requests": runCorePullRequests,
  "core/pull-request-merge": runCorePullRequestMerge,
  "core/pull-request-comments": runCorePullRequestComments,
  "core/pull-request-approval": runCorePullRequestApproval,
  "core/commit-statuses": runCoreCommitStatuses,
  "shared-capability/issues": runSharedCapabilityIssues,
  "shared-capability/releases": runSharedCapabilityReleases,
  "shared-capability/packages": runSharedCapabilityPackages,
  "shared-capability/branch-rules": runSharedCapabilityBranchRules,
  "shared-capability/branch-protection-enforcement": runSharedCapabilityBranchProtectionEnforcement,
  "shared-capability/webhooks": runSharedCapabilityWebhooks,
  "shared-capability/ci-run-discovery": runSharedCapabilityCiRunDiscovery,
  "shared-capability/blob-reads": runSharedCapabilityBlobReads,
  "shared-capability/unsupported-modules": runSharedCapabilityUnsupportedModules,
} satisfies Record<string, (f: GitLabE2EFixtureDriver) => Promise<void>>;

export const gitlabContractCatalog = Object.freeze(
  Object.entries(contracts).map(([id, run]) => Object.freeze({ id, run })),
);
export function selectGitLabContracts(id?: string) {
  if (id === undefined) return gitlabContractCatalog;
  const contract = gitlabContractCatalog.find((c) => c.id === id);
  if (!contract) throw new TypeError(`Unknown GitLab fluent contract: ${id}`);
  return [contract];
}
