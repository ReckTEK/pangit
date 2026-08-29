# Common core: provider method map

**One core method per card. One provider per line.**

`→` means an ordered multi-call adapter. `or` means either native method can satisfy the core
operation. All names below are exact methods from the analyzed generated clients.

## Repositories

### List repositories — `listRepositories`

| Provider             | Maps to                    |
| -------------------- | -------------------------- |
| **Gitea**            | `orgListRepos`             |
| **Codeberg**         | `orgListRepos`             |
| **GitHub**           | `reposListForOrg`          |
| **GitLab**           | `getApiV4GroupsIdProjects` |
| **Bitbucket Cloud**  | `getRepositoriesWorkspace` |
| **Azure DevOps Git** | `repositoriesList`         |

### Get repository — `getRepository`

| Provider             | Maps to                            |
| -------------------- | ---------------------------------- |
| **Gitea**            | `repoGet` or `repoGetById`         |
| **Codeberg**         | `repoGet` or `repoGetById`         |
| **GitHub**           | `reposGet`                         |
| **GitLab**           | `getApiV4ProjectsId`               |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlug` |
| **Azure DevOps Git** | `repositoriesGetRepository`        |

### Create repository — `createRepository`

| Provider             | Maps to                                    |
| -------------------- | ------------------------------------------ |
| **Gitea**            | `createOrgRepo` or `createCurrentUserRepo` |
| **Codeberg**         | `createOrgRepo` or `createCurrentUserRepo` |
| **GitHub**           | `reposCreateInOrg`                         |
| **GitLab**           | `postApiV4Projects`                        |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlug`        |
| **Azure DevOps Git** | `repositoriesCreate`                       |

### Rename repository — `renameRepository`

| Provider             | Maps to                            |
| -------------------- | ---------------------------------- |
| **Gitea**            | `repoEdit`                         |
| **Codeberg**         | `repoEdit`                         |
| **GitHub**           | `reposUpdate`                      |
| **GitLab**           | `putApiV4ProjectsId`               |
| **Bitbucket Cloud**  | `putRepositoriesWorkspaceRepoSlug` |
| **Azure DevOps Git** | `repositoriesUpdate`               |

### Delete repository — `deleteRepository`

| Provider             | Maps to                               |
| -------------------- | ------------------------------------- |
| **Gitea**            | `repoDelete`                          |
| **Codeberg**         | `repoDelete`                          |
| **GitHub**           | `reposDelete`                         |
| **GitLab**           | `deleteApiV4ProjectsId`               |
| **Bitbucket Cloud**  | `deleteRepositoriesWorkspaceRepoSlug` |
| **Azure DevOps Git** | `repositoriesDelete`                  |

### List repository forks — `listForks`

| Provider             | Maps to                                 |
| -------------------- | --------------------------------------- |
| **Gitea**            | `listForks`                             |
| **Codeberg**         | `listForks`                             |
| **GitHub**           | `reposListForks`                        |
| **GitLab**           | `getApiV4ProjectsIdForks`               |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugForks` |
| **Azure DevOps Git** | `forksList`                             |

### Fork repository — `createFork`

| Provider             | Maps to                                  |
| -------------------- | ---------------------------------------- |
| **Gitea**            | `createFork`                             |
| **Codeberg**         | `createFork`                             |
| **GitHub**           | `reposCreateFork`                        |
| **GitLab**           | `postApiV4ProjectsIdFork`                |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugForks` |
| **Azure DevOps Git** | `repositoriesCreate`                     |

## Branches

### List branches — `listBranches`

| Provider             | Maps to                                        |
| -------------------- | ---------------------------------------------- |
| **Gitea**            | `repoListBranches`                             |
| **Codeberg**         | `repoListBranches`                             |
| **GitHub**           | `reposListBranches`                            |
| **GitLab**           | `getApiV4ProjectsIdRepositoryBranches`         |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsBranches` |
| **Azure DevOps Git** | `refsList` or `statsList`                      |

### Get branch — `getBranch`

| Provider             | Maps to                                            |
| -------------------- | -------------------------------------------------- |
| **Gitea**            | `repoGetBranch`                                    |
| **Codeberg**         | `repoGetBranch`                                    |
| **GitHub**           | `reposGetBranch`                                   |
| **GitLab**           | `getApiV4ProjectsIdRepositoryBranchesBranch`       |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsBranchesName` |
| **Azure DevOps Git** | `statsGet`                                         |

### Check whether branch exists — `branchExists`

| Provider             | Maps to                                            |
| -------------------- | -------------------------------------------------- |
| **Gitea**            | `repoGetBranch`                                    |
| **Codeberg**         | `repoGetBranch`                                    |
| **GitHub**           | `reposGetBranch`                                   |
| **GitLab**           | `headApiV4ProjectsIdRepositoryBranchesBranch`      |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsBranchesName` |
| **Azure DevOps Git** | `statsGet`                                         |

### Create branch — `createBranch`

| Provider             | Maps to                                         |
| -------------------- | ----------------------------------------------- |
| **Gitea**            | `repoCreateBranch`                              |
| **Codeberg**         | `repoCreateBranch`                              |
| **GitHub**           | `gitCreateRef`                                  |
| **GitLab**           | `postApiV4ProjectsIdRepositoryBranches`         |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugRefsBranches` |
| **Azure DevOps Git** | `refsUpdateRefs`                                |

### Rename branch — `renameBranch`

| Provider             | Maps to                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gitea**            | `repoRenameBranch`                                                                                                                                                       |
| **Codeberg**         | `repoUpdateBranch`                                                                                                                                                       |
| **GitHub**           | `reposRenameBranch`                                                                                                                                                      |
| **GitLab**           | `getApiV4ProjectsIdRepositoryBranchesBranch` → `postApiV4ProjectsIdRepositoryBranches` → `deleteApiV4ProjectsIdRepositoryBranchesBranch` _(adapter)_                     |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsBranchesName` → `postRepositoriesWorkspaceRepoSlugRefsBranches` → `deleteRepositoriesWorkspaceRepoSlugRefsBranchesName` _(adapter)_ |
| **Azure DevOps Git** | `refsList` → `refsUpdateRefs` _(adapter)_                                                                                                                                |

### Delete branch — `deleteBranch`

| Provider             | Maps to                                               |
| -------------------- | ----------------------------------------------------- |
| **Gitea**            | `repoDeleteBranch`                                    |
| **Codeberg**         | `repoDeleteBranch`                                    |
| **GitHub**           | `gitDeleteRef`                                        |
| **GitLab**           | `deleteApiV4ProjectsIdRepositoryBranchesBranch`       |
| **Bitbucket Cloud**  | `deleteRepositoriesWorkspaceRepoSlugRefsBranchesName` |
| **Azure DevOps Git** | `refsUpdateRefs`                                      |

### Get branch divergence — `getDivergence`

| Provider             | Maps to                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit` _(adapter)_                                                                                                                               |
| **Codeberg**         | `repoGetSingleCommit` _(adapter)_                                                                                                                               |
| **GitHub**           | `reposGetBranch` → `reposCompareCommits` _(adapter)_                                                                                                            |
| **GitLab**           | `getApiV4ProjectsIdRepositoryBranches` → `getApiV4ProjectsIdRepositoryCommitsSha` _(adapter)_                                                                   |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsBranches` → `getRepositoriesWorkspaceRepoSlugCommitCommit` → `getRepositoriesWorkspaceRepoSlugCommitsRevision` _(adapter)_ |
| **Azure DevOps Git** | `statsGet`                                                                                                                                                      |

### List branch divergences — `listBranchDivergences`

| Provider             | Maps to                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoListBranches` → `repoGetSingleCommit` _(adapter)_                                                                                                          |
| **Codeberg**         | `repoListBranches` → `repoGetSingleCommit` _(adapter)_                                                                                                          |
| **GitHub**           | `reposListBranches` → `reposCompareCommits` _(adapter)_                                                                                                         |
| **GitLab**           | `getApiV4ProjectsIdRepositoryBranches` → `getApiV4ProjectsIdRepositoryCommitsSha` _(adapter)_                                                                   |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsBranches` → `getRepositoriesWorkspaceRepoSlugCommitCommit` → `getRepositoriesWorkspaceRepoSlugCommitsRevision` _(adapter)_ |
| **Azure DevOps Git** | `statsList`                                                                                                                                                     |

## Tags

### List tags — `listTags`

| Provider             | Maps to                                    |
| -------------------- | ------------------------------------------ |
| **Gitea**            | `repoListTags`                             |
| **Codeberg**         | `repoListTags`                             |
| **GitHub**           | `reposListTags`                            |
| **GitLab**           | `getApiV4ProjectsIdRepositoryTags`         |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsTags` |
| **Azure DevOps Git** | `refsList`                                 |

### Get tag — `getTag`

| Provider             | Maps to                                                  |
| -------------------- | -------------------------------------------------------- |
| **Gitea**            | `repoGetTag`                                             |
| **Codeberg**         | `repoGetTag`                                             |
| **GitHub**           | `gitGetRef` → `gitGetTag` → `reposGetCommit` _(adapter)_ |
| **GitLab**           | `getApiV4ProjectsIdRepositoryTagsTagName`                |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefsTagsName`           |
| **Azure DevOps Git** | `refsList`                                               |

### Create tag — `createTag`

| Provider             | Maps to                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| **Gitea**            | `repoCreateTag`                                                             |
| **Codeberg**         | `repoCreateTag`                                                             |
| **GitHub**           | `reposGet` → `reposGetCommit` → `gitCreateTag` → `gitCreateRef` _(adapter)_ |
| **GitLab**           | `postApiV4ProjectsIdRepositoryTags`                                         |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugRefsTags`                                 |
| **Azure DevOps Git** | `annotatedTagsCreate` → `refsList` → `refsUpdateRefs` _(adapter)_           |

### Delete tag — `deleteTag`

| Provider             | Maps to                                           |
| -------------------- | ------------------------------------------------- |
| **Gitea**            | `repoDeleteTag`                                   |
| **Codeberg**         | `repoDeleteTag`                                   |
| **GitHub**           | `gitDeleteRef`                                    |
| **GitLab**           | `deleteApiV4ProjectsIdRepositoryTagsTagName`      |
| **Bitbucket Cloud**  | `deleteRepositoriesWorkspaceRepoSlugRefsTagsName` |
| **Azure DevOps Git** | `refsUpdateRefs`                                  |

## Commits and references

### List commits — `listCommits`

| Provider             | Maps to                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoGetAllCommits`                                                                                                                                                                                |
| **Codeberg**         | `repoGetAllCommits`                                                                                                                                                                                |
| **GitHub**           | `reposListCommits`                                                                                                                                                                                 |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommits`                                                                                                                                                              |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommits` or `getRepositoriesWorkspaceRepoSlugCommitsRevision` or `postRepositoriesWorkspaceRepoSlugCommits` or `postRepositoriesWorkspaceRepoSlugCommitsRevision` |
| **Azure DevOps Git** | `commitsGetCommitsBatch` or `commitsGetCommits`                                                                                                                                                    |

### Get commit — `getCommit`

| Provider             | Maps to                                        |
| -------------------- | ---------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit`                          |
| **Codeberg**         | `repoGetSingleCommit`                          |
| **GitHub**           | `reposGetCommit`                               |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsSha`       |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitCommit` |
| **Azure DevOps Git** | `commitsGet`                                   |

### Get multiple commits — `getCommits`

| Provider             | Maps to                                              |
| -------------------- | ---------------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit` _(adapter)_                    |
| **Codeberg**         | `repoGetSingleCommit` _(adapter)_                    |
| **GitHub**           | `reposGetCommit` _(adapter)_                         |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsSha` _(adapter)_ |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitCommit`       |
| **Azure DevOps Git** | `commitsGetCommitsBatch` or `commitsGetCommits`      |

### Compare commits — `compareCommits`

| Provider             | Maps to                                           |
| -------------------- | ------------------------------------------------- |
| **Gitea**            | `repoCompareDiff`                                 |
| **Codeberg**         | `repoCompareDiff`                                 |
| **GitHub**           | `reposCompareCommits`                             |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCompare`             |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitsRevision` |
| **Azure DevOps Git** | `commitsGetCommits` _(adapter)_                   |

### List files changed by commit — `listCommitFiles`

| Provider             | Maps to                                        |
| -------------------- | ---------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit`                          |
| **Codeberg**         | `repoGetSingleCommit`                          |
| **GitHub**           | `reposGetCommit`                               |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsShaDiff`   |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugDiffstatSpec` |
| **Azure DevOps Git** | `commitsGetChanges`                            |

### Find merge bases — `findMergeBases`

| Provider             | Maps to                                                    |
| -------------------- | ---------------------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit` _(adapter)_                          |
| **Codeberg**         | `repoGetSingleCommit` _(adapter)_                          |
| **GitHub**           | `gitGetCommit` _(adapter)_                                 |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsSha` _(adapter)_       |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitCommit` _(adapter)_ |
| **Azure DevOps Git** | `mergeBasesList`                                           |

### Count reachable commits — `countReachableCommits`

| Provider             | Maps to                                                    |
| -------------------- | ---------------------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit` _(adapter)_                          |
| **Codeberg**         | `repoGetSingleCommit` _(adapter)_                          |
| **GitHub**           | `gitGetCommit` _(adapter)_                                 |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsShaSequence`           |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitCommit` _(adapter)_ |
| **Azure DevOps Git** | `commitsGet` _(adapter)_                                   |

### Find references containing commit — `findRefsForCommit`

| Provider             | Maps to                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Gitea**            | `repoListBranches` → `repoListTags` → `repoGetSingleCommit` _(adapter)_                                |
| **Codeberg**         | `repoListBranches` → `repoListTags` → `repoGetSingleCommit` _(adapter)_                                |
| **GitHub**           | `gitListMatchingRefs` → `gitGetTag` → `reposCompareCommits` _(adapter)_                                |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsShaRefs`                                                           |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugRefs` → `getRepositoriesWorkspaceRepoSlugCommitsRevision` _(adapter)_ |
| **Azure DevOps Git** | `refsList` → `commitsGetCommits` _(adapter)_                                                           |

### List contributors — `listContributors`

| Provider             | Maps to                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoGet` → `repoGetAllCommits` _(adapter)_                                                        |
| **Codeberg**         | `repoGet` → `repoGetAllCommits` _(adapter)_                                                        |
| **GitHub**           | `reposListContributors`                                                                            |
| **GitLab**           | `getApiV4ProjectsIdRepositoryContributors`                                                         |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlug` → `getRepositoriesWorkspaceRepoSlugCommitsRevision` _(adapter)_ |
| **Azure DevOps Git** | `repositoriesGetRepository` → `commitsGetCommits` _(adapter)_                                      |

## Files and directories

### Read repository content — `readContent`

| Provider             | Maps to                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoGetContents`                                                                                                                        |
| **Codeberg**         | `repoGetContents`                                                                                                                        |
| **GitHub**           | `reposGetContent`                                                                                                                        |
| **GitLab**           | `getApiV4ProjectsIdRepositoryTree` → `getApiV4ProjectsIdRepositoryFilesFilePath` → `getApiV4ProjectsIdRepositoryBlobsShaRaw` _(adapter)_ |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugSrcCommitPath`                                                                                          |
| **Azure DevOps Git** | `itemsGet` → `itemsList` _(adapter)_                                                                                                     |

### Read multiple files — `readFiles`

| Provider             | Maps to                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gitea**            | `repoGetFileContents` or `repoGetFileContentsPost`                                                                                                                       |
| **Codeberg**         | `repoGetContents` _(adapter)_                                                                                                                                            |
| **GitHub**           | `reposGetContent` _(adapter)_                                                                                                                                            |
| **GitLab**           | **19.3.1:** `postApiV4ProjectsIdRepositoryBlobsBatch` · **18.11.11:** `getApiV4ProjectsIdRepositoryCommitsSha` → `getApiV4ProjectsIdRepositoryFilesFilePath` _(adapter)_ |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugSrcCommitPath` _(adapter)_                                                                                                              |
| **Azure DevOps Git** | `itemsGet` → `blobsGetBlob` _(adapter)_                                                                                                                                  |

### Get directory metadata — `getDirectory`

| Provider             | Maps to                                         |
| -------------------- | ----------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit` → `getTree` _(adapter)_   |
| **Codeberg**         | `repoGetSingleCommit` → `getTree` _(adapter)_   |
| **GitHub**           | `reposGetContent`                               |
| **GitLab**           | `getApiV4ProjectsIdRepositoryTree`              |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugSrcCommitPath` |
| **Azure DevOps Git** | `itemsGet`                                      |

### List directory — `listDirectory`

| Provider             | Maps to                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **Gitea**            | **1.27.2:** `repoGetContentsList` or `repoGetContents` · **1.26.4:** `repoGetContentsList` |
| **Codeberg**         | `repoGetContentsList` or `repoGetContents`                                                 |
| **GitHub**           | `reposGetContent`                                                                          |
| **GitLab**           | `getApiV4ProjectsIdRepositoryTree`                                                         |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugSrcCommitPath`                                            |
| **Azure DevOps Git** | `itemsList`                                                                                |

### Read path metadata batch (first parent) — `readPathMetadataBatch`

| Provider             | Maps to                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoGetSingleCommit` → `getTree` _(adapter)_                                                                                           |
| **Codeberg**         | `repoGetSingleCommit` → `getTree` _(adapter)_                                                                                           |
| **GitHub**           | `reposGetCommit` → `gitGetTree` _(adapter)_                                                                                             |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsSha` → `getApiV4ProjectsIdRepositoryTree` → `getApiV4ProjectsIdRepositoryFilesFilePath` _(adapter)_ |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitCommit` → `getRepositoriesWorkspaceRepoSlugSrcCommitPath` _(adapter)_                            |
| **Azure DevOps Git** | `itemsGetItemsBatch`                                                                                                                    |

### Read symlink — `readSymlink`

| Provider             | Maps to                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Gitea**            | `repoGetContents`                                                                       |
| **Codeberg**         | `repoGetContents`                                                                       |
| **GitHub**           | `reposGet` → `reposGetCommit` → `gitGetTree` → `gitGetBlob` _(adapter)_                 |
| **GitLab**           | `getApiV4ProjectsIdRepositoryTree` → `getApiV4ProjectsIdRepositoryBlobsSha` _(adapter)_ |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugSrcCommitPath` _(adapter)_                             |
| **Azure DevOps Git** | `commitsGet` → `treesGet` → `blobsGetBlob` _(adapter)_                                  |

### Read submodule — `readSubmodule`

| Provider             | Maps to                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoGetContents`                                                                            |
| **Codeberg**         | `repoGetContents`                                                                            |
| **GitHub**           | `reposGetContent`                                                                            |
| **GitLab**           | `getApiV4ProjectsIdRepositoryTree` → `getApiV4ProjectsIdRepositoryFilesFilePath` _(adapter)_ |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugSrcCommitPath` _(adapter)_                                  |
| **Azure DevOps Git** | `commitsGet` → `treesGet` → `itemsGet` _(adapter)_                                           |

### Commit file changes — `commitFileChanges`

| Provider             | Maps to                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoChangeFiles`                                                                                                    |
| **Codeberg**         | `repoChangeFiles`                                                                                                    |
| **GitHub**           | `reposGetCommit` → `gitGetTree` → `gitCreateBlob` → `gitCreateTree` → `gitCreateCommit` → `gitUpdateRef` _(adapter)_ |
| **GitLab**           | `postApiV4ProjectsIdRepositoryCommits`                                                                               |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugSrc`                                                                               |
| **Azure DevOps Git** | `pushesCreate`                                                                                                       |

## Pull requests and reviews

### List pull requests — `listPullRequests`

| Provider             | Maps to                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| **Gitea**            | `repoListPullRequests`                                                  |
| **Codeberg**         | `repoListPullRequests`                                                  |
| **GitHub**           | `pullsList`                                                             |
| **GitLab**           | `getApiV4ProjectsIdMergeRequests`                                       |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugPullrequests`                          |
| **Azure DevOps Git** | `pullRequestsGetPullRequestsByProject` or `pullRequestsGetPullRequests` |

### Get pull request — `getPullRequest`

| Provider             | Maps to                                                     |
| -------------------- | ----------------------------------------------------------- |
| **Gitea**            | `repoGetPullRequest`                                        |
| **Codeberg**         | `repoGetPullRequest`                                        |
| **GitHub**           | `pullsGet`                                                  |
| **GitLab**           | `getApiV4ProjectsIdMergeRequestsMergeRequestIid`            |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` |
| **Azure DevOps Git** | `pullRequestsGetPullRequest`                                |

### Find pull request by base and head — `findPullRequest`

| Provider             | Maps to                                        |
| -------------------- | ---------------------------------------------- |
| **Gitea**            | `repoGetPullRequestByBaseHead`                 |
| **Codeberg**         | `repoGetPullRequestByBaseHead`                 |
| **GitHub**           | `pullsList` → `pullsGet` _(adapter)_           |
| **GitLab**           | `getApiV4ProjectsIdMergeRequests`              |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugPullrequests` |
| **Azure DevOps Git** | `pullRequestsGetPullRequests`                  |

### Check whether pull request is merged — `isMerged`

| Provider             | Maps to                                                     |
| -------------------- | ----------------------------------------------------------- |
| **Gitea**            | `repoPullRequestIsMerged`                                   |
| **Codeberg**         | `repoPullRequestIsMerged`                                   |
| **GitHub**           | `pullsCheckIfMerged`                                        |
| **GitLab**           | `getApiV4ProjectsIdMergeRequestsMergeRequestIid`            |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` |
| **Azure DevOps Git** | `pullRequestsGetPullRequest`                                |

### List pull-request commits — `listPullRequestCommits`

| Provider             | Maps to                                                            |
| -------------------- | ------------------------------------------------------------------ |
| **Gitea**            | `repoGetPullRequestCommits`                                        |
| **Codeberg**         | `repoGetPullRequestCommits`                                        |
| **GitHub**           | `pullsListCommits`                                                 |
| **GitLab**           | `getApiV4ProjectsIdMergeRequestsMergeRequestIidCommits`            |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommits` |
| **Azure DevOps Git** | `pullRequestCommitsGetPullRequestCommits`                          |

### List pull-request files — `listPullRequestFiles`

| Provider             | Maps to                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| **Gitea**            | `repoGetPullRequestFiles`                                                  |
| **Codeberg**         | `repoGetPullRequestFiles`                                                  |
| **GitHub**           | `pullsListFiles`                                                           |
| **GitLab**           | `getApiV4ProjectsIdMergeRequestsMergeRequestIidDiffs`                      |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDiffstat`        |
| **Azure DevOps Git** | `pullRequestIterationsList` → `pullRequestIterationChangesGet` _(adapter)_ |

### Create pull request — `createPullRequest`

| Provider             | Maps to                                         |
| -------------------- | ----------------------------------------------- |
| **Gitea**            | `repoCreatePullRequest`                         |
| **Codeberg**         | `repoCreatePullRequest`                         |
| **GitHub**           | `pullsCreate`                                   |
| **GitLab**           | `postApiV4ProjectsIdMergeRequests`              |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugPullrequests` |
| **Azure DevOps Git** | `pullRequestsCreate`                            |

### Update pull request — `updatePullRequest`

| Provider             | Maps to                                                     |
| -------------------- | ----------------------------------------------------------- |
| **Gitea**            | `repoEditPullRequest`                                       |
| **Codeberg**         | `repoEditPullRequest`                                       |
| **GitHub**           | `pullsUpdate`                                               |
| **GitLab**           | `putApiV4ProjectsIdMergeRequestsMergeRequestIid`            |
| **Bitbucket Cloud**  | `putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` |
| **Azure DevOps Git** | `pullRequestsUpdate`                                        |

### Close pull request — `closePullRequest`

| Provider             | Maps to                                                             |
| -------------------- | ------------------------------------------------------------------- |
| **Gitea**            | `repoEditPullRequest`                                               |
| **Codeberg**         | `repoEditPullRequest`                                               |
| **GitHub**           | `pullsUpdate`                                                       |
| **GitLab**           | `putApiV4ProjectsIdMergeRequestsMergeRequestIid`                    |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDecline` |
| **Azure DevOps Git** | `pullRequestsUpdate`                                                |

### Merge pull request — `mergePullRequest`

| Provider             | Maps to                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gitea**            | `repoMergePullRequest`                                                                                                                                                                                                         |
| **Codeberg**         | `repoMergePullRequest`                                                                                                                                                                                                         |
| **GitHub**           | `pullsMerge`                                                                                                                                                                                                                   |
| **GitLab**           | `putApiV4ProjectsIdMergeRequestsMergeRequestIidMerge`                                                                                                                                                                          |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdMerge` → `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdMergeTaskStatusTaskId` → `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` _(adapter)_ |
| **Azure DevOps Git** | `pullRequestsUpdate` → `pullRequestsGetPullRequest` _(adapter)_                                                                                                                                                                |

### Request reviewers — `requestReviewers`

| Provider             | Maps to                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | `repoCreatePullReviewRequests`                                                                                                        |
| **Codeberg**         | `repoCreatePullReviewRequests`                                                                                                        |
| **GitHub**           | `pullsRequestReviewers`                                                                                                               |
| **GitLab**           | `getApiV4ProjectsIdMergeRequestsMergeRequestIidReviewers` → `putApiV4ProjectsIdMergeRequestsMergeRequestIid` _(adapter)_              |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` → `putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` _(adapter)_ |
| **Azure DevOps Git** | `pullRequestReviewersCreatePullRequestReviewers`                                                                                      |

### Approve pull request — `approvePullRequest`

| Provider             | Maps to                                                             |
| -------------------- | ------------------------------------------------------------------- |
| **Gitea**            | `repoCreatePullReview` or `repoSubmitPullReview`                    |
| **Codeberg**         | `repoCreatePullReview` or `repoSubmitPullReview`                    |
| **GitHub**           | `pullsCreateReview`                                                 |
| **GitLab**           | `postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove`            |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove` |
| **Azure DevOps Git** | `pullRequestReviewersCreatePullRequestReviewer`                     |

### Publish pull-request comment — `publishPullRequestComment`

| Provider             | Maps to                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gitea**            | text: `issueCreateComment`; inline: `repoCreatePullReview`                                                                                                                                                                                                                                                                                                                      |
| **Codeberg**         | text: `issueCreateComment`; inline: `repoCreatePullReview`                                                                                                                                                                                                                                                                                                                      |
| **GitHub**           | text: `issuesCreateComment`; inline: `pullsGet` → `pullsCreateReviewComment` _(adapter)_                                                                                                                                                                                                                                                                                        |
| **GitLab**           | text: `postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes` → `putApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteIdPublish` _(adapter)_; inline: `getApiV4ProjectsIdMergeRequestsMergeRequestIid` → `postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes` → `putApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteIdPublish` _(adapter)_ |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments`                                                                                                                                                                                                                                                                                                            |
| **Azure DevOps Git** | `pullRequestThreadsCreate`                                                                                                                                                                                                                                                                                                                                                      |

## Commit statuses

### List commit statuses — `listCommitStatuses`

| Provider             | Maps to                                                |
| -------------------- | ------------------------------------------------------ |
| **Gitea**            | `repoListStatuses`                                     |
| **Codeberg**         | `repoListStatuses`                                     |
| **GitHub**           | `reposListCommitStatusesForRef`                        |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsShaStatuses`       |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitCommitStatuses` |
| **Azure DevOps Git** | `statusesList`                                         |

### Get commit status — `getCommitStatus`

| Provider             | Maps to                                                        |
| -------------------- | -------------------------------------------------------------- |
| **Gitea**            | `repoListStatuses`                                             |
| **Codeberg**         | `repoListStatuses`                                             |
| **GitHub**           | `reposListCommitStatusesForRef`                                |
| **GitLab**           | `getApiV4ProjectsIdRepositoryCommitsShaStatuses`               |
| **Bitbucket Cloud**  | `getRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuildKey` |
| **Azure DevOps Git** | `statusesList`                                                 |

### Set commit status — `setCommitStatus`

| Provider             | Maps to                                                      |
| -------------------- | ------------------------------------------------------------ |
| **Gitea**            | `repoCreateStatus`                                           |
| **Codeberg**         | `repoCreateStatus`                                           |
| **GitHub**           | `reposCreateCommitStatus`                                    |
| **GitLab**           | `postApiV4ProjectsIdStatusesSha`                             |
| **Bitbucket Cloud**  | `postRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuild` |
| **Azure DevOps Git** | `statusesCreate`                                             |
