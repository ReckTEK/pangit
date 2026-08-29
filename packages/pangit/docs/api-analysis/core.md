# Common core

Every group below is implementable across all six providers and all eight included clients. Names
are proposed interface methods. Shared capability does **not** mean one request everywhere.

## API surface

| Group               | Methods / options                                                                                       | Boundary that affects implementation                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Repositories        | `listRepositories`, `getRepository`; include fork parent                                                | List inside a known owning container.                                                        |
| Repository creation | `createRepository`; empty or initialized                                                                | Organization/group/workspace/project stays explicit; templates are optional.                 |
| Repository mutation | `renameRepository`, `deleteRepository`                                                                  | The shared editable metadata field is **name**, not arbitrary settings.                      |
| Forks               | `listForks`, `createFork`                                                                               | Native destination scope; creation can be asynchronous.                                      |
| Branch discovery    | `listBranches`, `getBranch`, `branchExists`; substring filter                                           | Inaccessible is not the same as nonexistent.                                                 |
| Branch mutation     | `createBranch`, `renameBranch`, `deleteBranch`                                                          | Rename: deletable non-default branches under exclusive administration; may be create/delete. |
| Divergence          | `getDivergence`, `listBranchDivergences`                                                                | Ancestry counts, not protection settings.                                                    |
| Tags                | `listTags`, `getTag`, `createTag`, `deleteTag`; annotated tags                                          | Signing, arbitrary tagger identity and lightweight mode are not universal.                   |
| Commits             | `listCommits`, `getCommit`, `getCommits`                                                                | Explicit-ID batches may require multiple calls.                                              |
| Commit comparison   | `compareCommits`, `listCommitFiles`                                                                     | Commit range / changed-file metadata; no complete-patch guarantee.                           |
| Commit ancestry     | `findMergeBases`, `countReachableCommits`; known cross-fork refs                                        | Preserve multiple merge bases and incomplete-history failures.                               |
| Commit references   | `findRefsForCommit`; branch/tag, head/contains modes                                                    | Head equality and ancestry containment are different queries.                                |
| Contributors        | `listContributors`                                                                                      | Attribution and history/count limits remain native.                                          |
| File reads          | `readContent`, `readFiles`; metadata, bytes, last commit, first parent                                  | First parent is not “previous change”; preserve size/encoding limits.                        |
| Directories         | `getDirectory`, `listDirectory`, `readPathMetadataBatch`; recursive / single-folder chains              | Revision and recursion mode must be explicit.                                                |
| Git links           | `readSymlink`, `readSubmodule`; raw target / internal dereference                                       | Do not fetch external targets implicitly.                                                    |
| File writes         | `commitFileChanges`; create/update/upsert/delete/move, optional new branch                              | A batch forms one commit; branch creation/publication may be separate.                       |
| PR discovery        | `listPullRequests`, `getPullRequest`, `findPullRequest`, `isMerged`; container, base/head, text filters | No shared advanced search grammar.                                                           |
| PR contents         | `listPullRequestCommits`, `listPullRequestFiles`                                                        | Native list limits remain; not a full diff guarantee.                                        |
| PR creation         | `createPullRequest`; same-repo or cross-fork                                                            | Supply both source and target identities.                                                    |
| PR mutation         | `updatePullRequest`, `closePullRequest`; title, description, target branch                              | No arbitrary fields; preserve open-state restrictions and text limits.                       |
| PR merge            | `mergePullRequest`; native/default or squash, optional source cleanup                                   | Wait for completion; cleanup can be separate. Rebase is not universal.                       |
| Review actions      | `requestReviewers`, `approvePullRequest`                                                                | Does not imply common review objects, vetoes or approval policies.                           |
| PR comments         | `publishPullRequestComment`; text or one old/new file line                                              | Publication only: no common returned public ID, replies or comment CRUD.                     |
| Commit statuses     | `listCommitStatuses`, `getCommitStatus`, `setCommitStatus`; ref/latest/PR-head modes                    | Shared states: pending/success/failure. These are not CI jobs or check runs.                 |

### Repository listing note

`listRepositories` always targets one explicit repository-owning container: a named user account or
organization in Gitea/Codeberg, an organization in GitHub, a group in GitLab, a workspace in
Bitbucket Cloud, a project in Azure DevOps, or the provider's equivalent container. It is never a
global, account-wide, or access-wide repository search. PanGit preserves the returned order exactly
as supplied by the selected provider and makes no ordering guarantee of its own.

### Repository creation note

One `createRepository` request can create an empty repository or initialize one with a named
initial/default branch and arbitrary caller-supplied files and content. A README, `.gitignore`, and
similar content are ordinary files, not provider template choices.

For initialized creation, an adapter may compose native calls: create the repository, create the
initial commit and files on the named branch, set that branch as the repository default, then
resolve only when the resulting repository is usable. The native calls may differ, but this is
common, synchronous PanGit behavior across providers. PanGit does not promise an empty materialized
branch: a real branch has a commit.

### Repository mutation note

`renameRepository` and `deleteRepository` are common across all supported providers. Rename changes
the repository name; delete deletes the repository.

### Fork readiness note

For Gitea and Codeberg, a `202` response with a repository body counts as a successful fork request.
PanGit immediately calls `getRepository`. If the fork is found, `createFork` returns it as ready. If
it is absent, PanGit retries after small bounded delays until it appears or the normal
timeout/failure result is reached. The public `createFork` abstraction is synchronous for consumers:
it resolves only with a usable fork.

### Branch discovery note

`listBranches` and `getBranch` are straightforward common abstractions across all supported
providers. `branchExists` may use `getBranch`: it returns `true` when the branch is found and
`false` only for a confirmed not-found result. Access and permission failures remain errors, not
`false`.

### Branch mutation note

`createBranch`, `renameBranch`, and `deleteBranch` are common abstractions. PanGit consistently
rejects renaming or deleting the repository's current default branch, even if the provider would
allow it. Where a provider lacks native rename, adapters can create the new branch at the old
branch's commit, then delete the old branch.

### Branch divergence note

Arbitrary branch-to-branch ahead/behind divergence is a common PanGit abstraction across all
supported providers. For Azure DevOps, do not rely only on branch stats, which are relative to the
default branch. Use its existing `Diffs_Get` operation with `baseVersion` and `targetVersion` branch
inputs; it finds a common commit and returns `aheadCount` and `behindCount`.

### Tags note

PanGit exposes common tag operations, then operation-specific fluent provider switches,
conceptually: `tags.create(common).github(callback).codeberg(callback)`. Each callback receives that
provider's tag-specific context and capabilities, not a generic provider client, and only the
callback matching the selected provider runs. This preserves common behavior while exposing
provider-only tag capabilities. The same pattern can be operation-specific elsewhere; pull request
callbacks receive PR-specific contexts.

### Remaining operations note

Every remaining repository operation after Tags follows the same design: PanGit provides its common
core contract, while provider-only behavior is exposed through fluent branches specific to that
operation. At runtime, only the branch matching the configured provider executes.

## Native entry points

<details>
<summary>Native method bindings — implementation lookup</summary>

Exact generated method names. Gitea and Codeberg share the names in their column below. `*` needs
additional calls or adapter logic; these are entry points, not complete call sequences. Derived
helpers above reuse these operations and the linked [client sources](README.md#scope).

| Operation                 | Gitea / Codeberg               | GitHub                                                                   | GitLab                                                                                                                                       | Bitbucket Cloud                                                      | Azure DevOps Git                                 |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| List repositories         | `orgListRepos`                 | `reposListForOrg`                                                        | `getApiV4GroupsIdProjects`                                                                                                                   | `getRepositoriesWorkspace`                                           | `repositoriesList`                               |
| Get repository            | `repoGet`                      | `reposGet`                                                               | `getApiV4ProjectsId`                                                                                                                         | `getRepositoriesWorkspaceRepoSlug`                                   | `repositoriesGetRepository`                      |
| Create repository         | `createOrgRepo`                | `reposCreateInOrg`                                                       | `postApiV4Projects`                                                                                                                          | `postRepositoriesWorkspaceRepoSlug`                                  | `repositoriesCreate`                             |
| Rename repository         | `repoEdit`                     | `reposUpdate`                                                            | `putApiV4ProjectsId`                                                                                                                         | `putRepositoriesWorkspaceRepoSlug`                                   | `repositoriesUpdate`                             |
| Delete repository         | `repoDelete`                   | `reposDelete`                                                            | `deleteApiV4ProjectsId`                                                                                                                      | `deleteRepositoriesWorkspaceRepoSlug`                                | `repositoriesDelete`                             |
| Fork repository           | `createFork`                   | `reposCreateFork`                                                        | `postApiV4ProjectsIdFork`                                                                                                                    | `postRepositoriesWorkspaceRepoSlugForks`                             | `repositoriesCreate`                             |
| List branches             | `repoListBranches`             | `reposListBranches`                                                      | `getApiV4ProjectsIdRepositoryBranches`                                                                                                       | `getRepositoriesWorkspaceRepoSlugRefsBranches`                       | `refsList`                                       |
| Get branch                | `repoGetBranch`                | `reposGetBranch`                                                         | `getApiV4ProjectsIdRepositoryBranchesBranch`                                                                                                 | `getRepositoriesWorkspaceRepoSlugRefsBranchesName`                   | `statsGet`                                       |
| Create branch             | `repoCreateBranch`             | `gitCreateRef`                                                           | `postApiV4ProjectsIdRepositoryBranches`                                                                                                      | `postRepositoriesWorkspaceRepoSlugRefsBranches`                      | `refsUpdateRefs`                                 |
| Delete branch             | `repoDeleteBranch`             | `gitDeleteRef`                                                           | `deleteApiV4ProjectsIdRepositoryBranchesBranch`                                                                                              | `deleteRepositoriesWorkspaceRepoSlugRefsBranchesName`                | `refsUpdateRefs`                                 |
| List tags                 | `repoListTags`                 | `reposListTags`                                                          | `getApiV4ProjectsIdRepositoryTags`                                                                                                           | `getRepositoriesWorkspaceRepoSlugRefsTags`                           | `refsList`                                       |
| Create annotated tag      | `repoCreateTag`                | `gitCreateTag` + `gitCreateRef` *                                        | `postApiV4ProjectsIdRepositoryTags`                                                                                                          | `postRepositoriesWorkspaceRepoSlugRefsTags`                          | `annotatedTagsCreate` + `refsUpdateRefs` *       |
| List commits              | `repoGetAllCommits`            | `reposListCommits`                                                       | `getApiV4ProjectsIdRepositoryCommits`                                                                                                        | `getRepositoriesWorkspaceRepoSlugCommits`                            | `commitsGetCommits`                              |
| Get commit                | `repoGetSingleCommit`          | `reposGetCommit`                                                         | `getApiV4ProjectsIdRepositoryCommitsSha`                                                                                                     | `getRepositoriesWorkspaceRepoSlugCommitCommit`                       | `commitsGet`                                     |
| Compare commits           | `repoCompareDiff`              | `reposCompareCommits`                                                    | `getApiV4ProjectsIdRepositoryCompare`                                                                                                        | `getRepositoriesWorkspaceRepoSlugCommitsRevision`                    | `commitsGetCommits` *                            |
| Read raw file             | `repoGetRawFile`               | `reposGetContent`                                                        | `getApiV4ProjectsIdRepositoryFilesFilePathRaw`                                                                                               | `getRepositoriesWorkspaceRepoSlugSrcCommitPath`                      | `itemsGet`                                       |
| List directory            | `repoGetContentsList`          | `reposGetContent`                                                        | `getApiV4ProjectsIdRepositoryTree`                                                                                                           | `getRepositoriesWorkspaceRepoSlugSrcCommitPath`                      | `itemsList`                                      |
| Commit file changes       | `repoChangeFiles`              | `gitCreateBlob` + `gitCreateTree` + `gitCreateCommit` + `gitUpdateRef` * | `postApiV4ProjectsIdRepositoryCommits` *                                                                                                     | `postRepositoriesWorkspaceRepoSlugSrc`                               | `pushesCreate` *                                 |
| List PRs                  | `repoListPullRequests`         | `pullsList`                                                              | `getApiV4ProjectsIdMergeRequests`                                                                                                            | `getRepositoriesWorkspaceRepoSlugPullrequests`                       | `pullRequestsGetPullRequests`                    |
| Get PR                    | `repoGetPullRequest`           | `pullsGet`                                                               | `getApiV4ProjectsIdMergeRequestsMergeRequestIid`                                                                                             | `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId`          | `pullRequestsGetPullRequest`                     |
| Create PR                 | `repoCreatePullRequest`        | `pullsCreate`                                                            | `postApiV4ProjectsIdMergeRequests`                                                                                                           | `postRepositoriesWorkspaceRepoSlugPullrequests`                      | `pullRequestsCreate`                             |
| Update PR                 | `repoEditPullRequest`          | `pullsUpdate`                                                            | `putApiV4ProjectsIdMergeRequestsMergeRequestIid`                                                                                             | `putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId`          | `pullRequestsUpdate`                             |
| Merge PR                  | `repoMergePullRequest`         | `pullsMerge`                                                             | `putApiV4ProjectsIdMergeRequestsMergeRequestIidMerge`                                                                                        | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdMerge` *  | `pullRequestsUpdate` *                           |
| Request reviewers         | `repoCreatePullReviewRequests` | `pullsRequestReviewers`                                                  | `putApiV4ProjectsIdMergeRequestsMergeRequestIid` *                                                                                           | `putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` *        | `pullRequestReviewersCreatePullRequestReviewers` |
| Approve PR                | `repoCreatePullReview`         | `pullsCreateReview`                                                      | `postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove`                                                                                     | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove`  | `pullRequestReviewersCreatePullRequestReviewer`  |
| Publish PR comment        | `issueCreateComment`           | `issuesCreateComment`                                                    | `postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes` + `putApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteIdPublish` * | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments` | `pullRequestThreadsCreate`                       |
| Publish inline PR comment | `repoCreatePullReview`         | `pullsCreateReviewComment` *                                             | `postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes` + `putApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteIdPublish` * | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments` | `pullRequestThreadsCreate`                       |
| List commit statuses      | `repoListStatuses`             | `reposListCommitStatusesForRef`                                          | `getApiV4ProjectsIdRepositoryCommitsShaStatuses`                                                                                             | `getRepositoriesWorkspaceRepoSlugCommitCommitStatuses`               | `statusesList`                                   |
| Set commit status         | `repoCreateStatus`             | `reposCreateCommitStatus`                                                | `postApiV4ProjectsIdStatusesSha`                                                                                                             | `postRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuild`         | `statusesCreate`                                 |

File batches need raw-body overrides: GitLab's schema omits commit fields; Azure's schema omits
`item.path`.

</details>

## Keep these out of core

Issues, releases, webhooks, CI execution, packages, account/container administration and protection
policy control are [supplements](supplements.md). Do not add optional fields for them to core types.
Put stronger guarantees—atomic branch rename, file-SHA guards, complete patches, review objects and
provider-specific merge modes—behind explicit capabilities.
