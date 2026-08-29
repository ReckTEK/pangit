# Supplemental APIs

## Shared by some providers

Use optional feature interfaces for these families. `✓` means the analyzed client exposes the
family, not every possible operation or option. `—` means no matching surface in this snapshot.
Azure's column covers **Git only**.

| Optional module                     | Gitea | Codeberg | GitHub | GitLab | Bitbucket | Azure |
| ----------------------------------- | ----- | -------- | ------ | ------ | --------- | ----- |
| Current-user profile                | ✓     | ✓        | ✓      | —      | ✓         | —     |
| Issues                              | ✓     | ✓        | ✓      | ✓      | Legacy    | —     |
| Releases                            | ✓     | ✓        | ✓      | ✓      | —         | —     |
| Repository webhooks                 | ✓     | ✓        | ✓      | ✓      | ✓         | —     |
| CI run discovery                    | ✓     | ✓        | ✓      | ✓      | ✓         | —     |
| Deployments / environments          | —     | —        | ✓      | ✓      | ✓         | —     |
| Package metadata / lifecycle        | ✓     | ✓        | ✓      | ✓      | —         | —     |
| SHA-addressed blob reads            | ✓     | ✓        | ✓      | ✓      | —         | ✓     |
| Gists / snippets                    | —     | —        | ✓      | ✓      | ✓         | —     |
| Submitted PR review objects         | ✓     | ✓        | ✓      | —      | —         | —     |
| Configure branch protection / rules | ✓     | ✓        | ✓      | ✓      | ✓         | —     |

- **Identity:** these GitLab clients expose token identity, not a full current-user profile.
- **Issues:** do not build a new portable adapter around Bitbucket's legacy tracker surface.
- **Rules and reviews:** configured rules, effective protection, approval votes and review objects
  need separate contracts. Azure exposes Git policy inspection, not general policy administration.
- **CI and packages:** status updates are already core; execution, secrets, runners, artifacts and
  registry upload protocols need narrower optional methods.

## Individual provider supplements

The module lists group native behavior. The examples beneath them are **provider-only within the
analyzed clients**, not claims that other platforms could never offer similar features. Method names
are exact; request types are in the [client sources](README.md#scope).

### Gitea

Native modules: instance administration, repository settings/mirrors, identity/access,
Actions/runners, issue extensions, wikis and notifications.

- User administration badges: `adminAddUserBadges`.
- Ordered branch-protection priorities: `repoUpdateBranchProtectionPriories`.
- Issue-description update guarded by `content_version`: `issueEditIssue`.

### Codeberg / Forgejo

Native modules: quotas, federation, repository policy flags, runner ownership, fork synchronization
and Forgejo-specific repository/wiki controls.

- Named quota groups and resource rules: `adminCreateQuotaGroup`.
- Repository ActivityPub actor: `activitypubRepository`.
- Replace the complete native policy-flag collection: `repoReplaceAllFlags`.

### GitHub

Native modules: Apps/installations, Actions, check runs, rulesets/security, Git-object construction,
Codespaces/Copilot, Projects, organization/enterprise administration and billing.

- Installation-scoped app tokens: `appsCreateInstallationAccessToken`.
- Repository-backed Codespaces: `codespacesCreateWithRepoForAuthenticatedUser`.
- Organization Copilot seat allocation: `copilotAddCopilotSeatsForUsers`.

### GitLab

Native modules: group hierarchy/access, CI/runners, MR approval policy, service integrations,
package/container registry protocols, Kubernetes, Terraform, feature flags and audit/administration.

- Lock a named Terraform state: `postApiV4ProjectsIdTerraformStateNameLock`.
- Register a project Kubernetes agent: `postApiV4ProjectsIdClusterAgents`.
- Purge group dependency-proxy cache: `deleteApiV4GroupsIdDependencyProxyCache`.

### Bitbucket Cloud

Native modules: workspace projects, Pipelines, branching models/restrictions, PR tasks, app-owned
properties, and native snippet/access controls.

- Configured branching-model roles/prefixes:
  `getRepositoriesWorkspaceRepoSlugBranchingModelSettings`.
- First-class PR tasks: `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdTasks`.
- App-owned commit properties: `getCommitHostedPropertyValue`.

### Azure DevOps Git

Native modules: compare-and-swap refs/pushes, PR iterations/votes/policies, imports,
cherry-pick/revert jobs, recycle bin, favorites and advanced revision selectors. Keep its wider
platform APIs out of this snapshot's claims.

- Per-identity ref favorites: `refsFavoritesCreate`.
- Status on a specific PR iteration: `pullRequestIterationStatusesCreate`.
- Persisted push resources addressed by push ID: `pushesGet`.
