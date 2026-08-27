# Generated REST Client Capability Graph

> This document compares the generated clients in this repository, not every feature offered by each hosted product. `—` means no accepted mapping in the generated snapshot, not confirmed product absence.

Capability equivalence means the same user-visible intent can be adapted. It does **not** mean request or response types, authorization, side effects, pagination, or wire semantics are interchangeable.

## Inputs

| Client | Spec title/version | Methods | Normalized input | SHA-256 |
|---|---|---:|---|---|
| `AzureDevOpsRestClient` | Git 7.2-preview | 112 | `codegen/specs/normalized/azure-devops.json` | `61f6bae3599da524de477a0bb8085dd89e2e17577fb53a30a02b90024c26200d` |
| `BitbucketRestClient` | Bitbucket API 2.0 | 297 | `codegen/specs/normalized/bitbucket.json` | `06d3c5af3c0c25a43f6a1bb81bd062e7e397df5c8d3f2f0e792c3e2df8cd8f2b` |
| `CodebergRestClient` | Forgejo API 16.0.0-dev-712-d6a6972c+gitea-1.22.0 | 506 | `codegen/specs/normalized/codeberg.json` | `812ececc3344d92764107dfe7b15d788557e7b8e160f8f51218ee638034931bb` |
| `GiteaRestClient` | Gitea API 0.0.0+GITEA-API-APP-VERSION | 536 | `codegen/specs/normalized/gitea.json` | `494600191353515013b7bc8321639c9bdd37e1703f438ff7f1f12fac1f895f95` |
| `GitHubRestClient` | GitHub v3 REST API 1.1.4 | 1221 | `codegen/specs/normalized/github.json` | `8b2223268244a081f3dc8a5479b59b679527721cb7f470fb3e6852c150f646c5` |
| `GitLabRestClient` | GitLab API v4 | 1149 | `codegen/specs/normalized/gitlab.json` | `4711d39c54d9e97991f68811ddb901fa9b4be10d07702d5990018576c28e2c9d` |
| **Total** |  | **3821** |  |  |

Reviewed rule-set SHA-256: `bb3115cc4b773231a049545c022b978728765a891c9f9251696af29e40fcc0c8`

Azure `x-ms-paths` operations are included. GitHub `x-webhooks` are excluded because they describe inbound webhook deliveries rather than outbound REST client methods.

## Legend

| Mark | Meaning |
|---|---|
| `E` | Reviewed equivalent user-visible capability. Provider-specific adaptation is still required. |
| `P` | Reviewed partial mapping with a material semantic, scope, composition, or specification difference. |
| `N` | Tempting apparent match that is explicitly rejected. |
| `U` | Reviewed provider-specific surface with no accepted common contract. |
| `—` | No accepted generated mapping. |
| `Unmatched` | Method is inventoried but has not been assigned to a reviewed capability or unique surface. |

## Coverage

| Classification | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---:|---:|---:|---:|---:|---:|
| Equivalent | 23 | 37 | 119 | 120 | 90 | 54 |
| Partial | 17 | 58 | 22 | 26 | 59 | 68 |
| Verified unique | 6 | 11 | 14 | 12 | 20 | 22 |
| Unmatched | 66 | 191 | 351 | 378 | 1052 | 1005 |
| **Total** | **112** | **297** | **506** | **536** | **1221** | **1149** |

Counts classify each method once with precedence `E`, `P`, `U`, then `Unmatched`. A method may also be cross-referenced by multiple capability rows.

## Capability Equivalence Graph

### Branches and tags

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Create branch**<br>`branch.create.v1` | Create one branch ref at a selected commit.<br><sub>Azure and GitHub use generic ref mutation; Bitbucket's generated body is incomplete.</sub> | **P**<br>`AzureDevOpsRestClient.refsUpdateRefs`<br><sub>Batch generic ref mutation rather than dedicated branch creation.</sub> | **P**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugRefsBranches`<br><sub>Normalized specification omits the required branch body.</sub> | **E**<br>`CodebergRestClient.repoCreateBranch` | **E**<br>`GiteaRestClient.repoCreateBranch` | **P**<br>`GitHubRestClient.gitCreateRef`<br><sub>Caller must construct refs/heads/name explicitly.</sub> | **E**<br>`GitLabRestClient.postApiV4ProjectsIdRepositoryBranches` |
| **Delete branch**<br>`branch.delete.v1` | Delete one branch ref without deleting the repository.<br><sub>Azure and GitHub expose generic ref deletion; protected/default branch rules remain provider-specific.</sub> | **P**<br>`AzureDevOpsRestClient.refsUpdateRefs`<br><sub>Deletion is encoded as a zero object ID in a batch mutation.</sub> | **E**<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugRefsBranchesName` | **E**<br>`CodebergRestClient.repoDeleteBranch` | **E**<br>`GiteaRestClient.repoDeleteBranch` | **P**<br>`GitHubRestClient.gitDeleteRef`<br><sub>Caller must address refs/heads/name explicitly.</sub> | **E**<br>`GitLabRestClient.deleteApiV4ProjectsIdRepositoryBranchesBranch` |
| **Get branch**<br>`branch.get.v1` | Read one named branch and its tip.<br><sub>Azure resolves this through generic refs or branch statistics rather than a dedicated branch object.</sub> | **P**<br>`AzureDevOpsRestClient.refsList`<br>`AzureDevOpsRestClient.statsGet`<br><sub>Requires an exact ref filter or returns statistics rather than a common branch model.</sub> | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsBranchesName` | **E**<br>`CodebergRestClient.repoGetBranch` | **E**<br>`GiteaRestClient.repoGetBranch` | **E**<br>`GitHubRestClient.reposGetBranch` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryBranchesBranch` |
| **List branches**<br>`branch.list.v1` | List branch refs and their current tips for a repository.<br><sub>Azure uses the generic ref list and requires a heads filter; other providers expose branch resources.</sub> | **P**<br>`AzureDevOpsRestClient.refsList`<br><sub>Caller must filter refs/heads and receives generic refs.</sub> | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsBranches` | **E**<br>`CodebergRestClient.repoListBranches` | **E**<br>`GiteaRestClient.repoListBranches` | **E**<br>`GitHubRestClient.reposListBranches` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryBranches` |
| **Read branch protection**<br>`branch.protection.read.v1` | Read effective branch protection or policy configuration.<br><sub>Policy models are not interchangeable: Azure policies, Bitbucket restrictions, GitHub protections/rulesets, and protected branches elsewhere.</sub> | **P**<br>`AzureDevOpsRestClient.policyConfigurationsGet`<br><sub>Read-only inherited policy evaluation.</sub> | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugBranchRestrictions`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugBranchRestrictionsId`<br><sub>Returns individual restriction rules.</sub> | **E**<br>`CodebergRestClient.repoListBranchProtection`<br>`CodebergRestClient.repoGetBranchProtection` | **E**<br>`GiteaRestClient.repoListBranchProtection`<br>`GiteaRestClient.repoGetBranchProtection` | **P**<br>`GitHubRestClient.reposGetBranchProtection`<br>`GitHubRestClient.reposGetRepoRulesets`<br>`GitHubRestClient.reposGetRepoRuleset`<br><sub>Classic protection and rulesets are separate models.</sub> | **P**<br>`GitLabRestClient.getApiV4ProjectsIdProtectedBranches`<br>`GitLabRestClient.getApiV4ProjectsIdProtectedBranchesName`<br><sub>Protected patterns and access levels differ from rule objects.</sub> |
| **Write branch protection**<br>`branch.protection.write.v1` | Create, update, or remove branch protection policy.<br><sub>No accepted Azure mapping exists in the Git-only snapshot; every other provider has a materially different rule model.</sub> | — | **P**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugBranchRestrictions`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlugBranchRestrictionsId`<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugBranchRestrictionsId`<br><sub>Mutates individual restriction rules.</sub> | **E**<br>`CodebergRestClient.repoCreateBranchProtection`<br>`CodebergRestClient.repoEditBranchProtection`<br>`CodebergRestClient.repoDeleteBranchProtection` | **E**<br>`GiteaRestClient.repoCreateBranchProtection`<br>`GiteaRestClient.repoEditBranchProtection`<br>`GiteaRestClient.repoDeleteBranchProtection` | **P**<br>`GitHubRestClient.reposUpdateBranchProtection`<br>`GitHubRestClient.reposDeleteBranchProtection`<br>`GitHubRestClient.reposCreateRepoRuleset`<br>`GitHubRestClient.reposUpdateRepoRuleset`<br>`GitHubRestClient.reposDeleteRepoRuleset`<br><sub>Two protection systems with different scope and expressiveness.</sub> | **P**<br>`GitLabRestClient.postApiV4ProjectsIdProtectedBranches`<br>`GitLabRestClient.patchApiV4ProjectsIdProtectedBranchesName`<br>`GitLabRestClient.deleteApiV4ProjectsIdProtectedBranchesName`<br><sub>Pattern and access-level model.</sub> |
| **Create or delete tag**<br>`tag.create-delete.v1` | Create or delete a named lightweight or annotated tag.<br><sub>GitHub and Azure separate generic refs from annotated objects; Bitbucket always creates an annotated tag.</sub> | **P**<br>`AzureDevOpsRestClient.refsUpdateRefs`<br>`AzureDevOpsRestClient.annotatedTagsCreate`<br><sub>Tag ref and annotated tag object use different operations.</sub> | **P**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugRefsTags`<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugRefsTagsName`<br><sub>Create always produces an annotated tag.</sub> | **E**<br>`CodebergRestClient.repoCreateTag`<br>`CodebergRestClient.repoDeleteTag` | **E**<br>`GiteaRestClient.repoCreateTag`<br>`GiteaRestClient.repoDeleteTag` | **P**<br>`GitHubRestClient.gitCreateTag`<br>`GitHubRestClient.gitCreateRef`<br>`GitHubRestClient.gitDeleteRef`<br><sub>Annotated tags require object creation followed by ref creation.</sub> | **E**<br>`GitLabRestClient.postApiV4ProjectsIdRepositoryTags`<br>`GitLabRestClient.deleteApiV4ProjectsIdRepositoryTagsTagName` |
| **List or get tags**<br>`tag.list-get.v1` | Read tag refs and associated commit or tag-object metadata.<br><sub>Azure and GitHub generic refs do not return the same high-level tag representation.</sub> | **P**<br>`AzureDevOpsRestClient.refsList`<br>`AzureDevOpsRestClient.annotatedTagsGet`<br><sub>Lightweight refs and annotated tag objects are separate reads.</sub> | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsTags`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsTagsName` | **E**<br>`CodebergRestClient.repoListTags`<br>`CodebergRestClient.repoGetTag` | **E**<br>`GiteaRestClient.repoListTags`<br>`GiteaRestClient.repoGetTag` | **P**<br>`GitHubRestClient.reposListTags`<br>`GitHubRestClient.gitGetRef`<br>`GitHubRestClient.gitGetTag`<br><sub>High-level list, ref lookup, and annotated object lookup are separate.</sub> | **E**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryTags`<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryTagsTagName` |

### CI, artifacts, and runners

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Read and delete CI artifacts**<br>`ci.artifacts.v1` | List/download outputs produced by a CI execution and remove them where supported.<br><sub>Bitbucket Downloads and Azure PR attachments are explicitly rejected as CI artifacts.</sub> | — | — | **P**<br>`CodebergRestClient.listActionArtifacts`<br>`CodebergRestClient.listActionRunArtifacts`<br>`CodebergRestClient.getActionArtifact`<br>`CodebergRestClient.downloadActionArtifact`<br>`CodebergRestClient.deleteActionArtifact`<br><sub>Forgejo archive and quota lifecycle.</sub> | **P**<br>`GiteaRestClient.getArtifacts`<br>`GiteaRestClient.getArtifactsOfRun`<br>`GiteaRestClient.getArtifact`<br>`GiteaRestClient.downloadArtifact`<br>`GiteaRestClient.deleteArtifact`<br><sub>Gitea run artifact model.</sub> | **P**<br>`GitHubRestClient.actionsListWorkflowRunArtifacts`<br>`GitHubRestClient.actionsDownloadArtifact`<br>`GitHubRestClient.actionsDeleteArtifact`<br><sub>GitHub artifacts are named run-level archives with retention.</sub> | **P**<br>`GitLabRestClient.getApiV4ProjectsIdJobsJobIdArtifacts`<br>`GitLabRestClient.getApiV4ProjectsIdJobsJobIdArtifactsArtifactPath`<br>`GitLabRestClient.deleteApiV4ProjectsIdJobsJobIdArtifacts`<br>`GitLabRestClient.postApiV4ProjectsIdJobsJobIdArtifactsKeep`<br><sub>GitLab artifacts are job-scoped and support path/tree access and keep/erase.</sub> |
| **Read CI jobs and logs**<br>`ci.jobs-logs.v1` | List execution jobs/tasks and retrieve their logs or traces.<br><sub>Job identity, attempts, containers, and log archive/stream formats differ.</sub> | — | **P**<br>`BitbucketRestClient.getPipelineStepsForRepository`<br>`BitbucketRestClient.getPipelineStepForRepository`<br>`BitbucketRestClient.getPipelineStepLogForRepository`<br>`BitbucketRestClient.getPipelineContainerLog`<br><sub>Step/container model rather than jobs.</sub> | **P**<br>`CodebergRestClient.listActionRunJobs`<br>`CodebergRestClient.listActionTasks`<br>`CodebergRestClient.repoGetActionJobLogs`<br>`CodebergRestClient.repoGetActionRunLogs`<br><sub>Forgejo jobs/tasks are separate resources.</sub> | **P**<br>`GiteaRestClient.listWorkflowRunJobs`<br>`GiteaRestClient.downloadActionsRunJobLogs`<br>`GiteaRestClient.getWorkflowRunLogs`<br><sub>Supports run attempts and Gitea-specific jobs.</sub> | **P**<br>`GitHubRestClient.actionsListJobsForWorkflowRun`<br>`GitHubRestClient.actionsDownloadJobLogsForWorkflowRun`<br>`GitHubRestClient.actionsDownloadWorkflowRunLogs`<br><sub>Logs are download archives tied to workflow runs/jobs.</sub> | **P**<br>`GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineIdJobs`<br>`GitLabRestClient.getApiV4ProjectsIdJobsJobId`<br>`GitLabRestClient.getApiV4ProjectsIdJobsJobIdTrace`<br><sub>Jobs are pipeline/deployable resources with trace text.</sub> |
| **Trigger, inspect, and control CI run**<br>`ci.run.v1` | Trigger or inspect a repository CI execution and cancel or retry it.<br><sub>Workflow, pipeline, run, task, bridge, and target models differ; Azure build/pipeline APIs are outside its Git-only snapshot.</sub> | — | **P**<br>`BitbucketRestClient.createPipelineForRepository`<br>`BitbucketRestClient.getPipelineForRepository`<br>`BitbucketRestClient.getPipelinesForRepository`<br>`BitbucketRestClient.stopPipeline`<br><sub>Pipeline targets are a Bitbucket-specific discriminated union.</sub> | **P**<br>`CodebergRestClient.dispatchWorkflow`<br>`CodebergRestClient.getActionsRun`<br>`CodebergRestClient.listActionRuns`<br>`CodebergRestClient.cancelActionRun`<br><sub>Forgejo run/task model and token-context operation differ.</sub> | **P**<br>`GiteaRestClient.actionsDispatchWorkflow`<br>`GiteaRestClient.getWorkflowRun`<br>`GiteaRestClient.actionsListWorkflowRuns`<br>`GiteaRestClient.cancelWorkflowRun`<br>`GiteaRestClient.rerunWorkflowRun`<br><sub>Actions-like but not wire-compatible with GitHub.</sub> | **P**<br>`GitHubRestClient.actionsCreateWorkflowDispatch`<br>`GitHubRestClient.actionsGetWorkflowRun`<br>`GitHubRestClient.actionsListWorkflowRunsForRepo`<br>`GitHubRestClient.actionsCancelWorkflowRun`<br>`GitHubRestClient.actionsReRunWorkflow`<br><sub>Workflow/run hierarchy and GitHub trust controls are provider-specific.</sub> | **P**<br>`GitLabRestClient.postApiV4ProjectsIdPipeline`<br>`GitLabRestClient.getApiV4ProjectsIdPipelines`<br>`GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineId`<br>`GitLabRestClient.postApiV4ProjectsIdPipelinesPipelineIdCancel`<br>`GitLabRestClient.postApiV4ProjectsIdPipelinesPipelineIdRetry`<br><sub>Pipeline graphs include jobs and bridges/downstream pipelines.</sub> |
| **Manage self-hosted CI runners**<br>`ci.runners.v1` | List, register/configure, and remove execution agents attached to a provider scope.<br><sub>Scope, registration secret lifecycle, runner manager, labels, groups, and hosted runner concepts differ.</sub> | — | **P**<br>`BitbucketRestClient.createRepositoryRunner`<br>`BitbucketRestClient.getRepositoryRunners`<br>`BitbucketRestClient.updateRepositoryRunner`<br>`BitbucketRestClient.deleteRepositoryRunner`<br>`BitbucketRestClient.createWorkspaceRunner`<br>`BitbucketRestClient.getWorkspaceRunners`<br><sub>Repository/workspace runners include one-time OAuth credentials and cordoning.</sub> | **P**<br>`CodebergRestClient.registerAdminRunner`<br>`CodebergRestClient.registerOrgRunner`<br>`CodebergRestClient.registerRepoRunner`<br>`CodebergRestClient.registerUserRunner`<br><sub>Admin/org/repository/user scopes and registration token model.</sub> | **P**<br>`GiteaRestClient.getAdminRunners`<br>`GiteaRestClient.getOrgRunners`<br>`GiteaRestClient.getRepoRunners`<br>`GiteaRestClient.getUserRunners`<br><sub>Admin/org/repository/user scopes and registration tokens.</sub> | **P**<br>`GitHubRestClient.actionsListSelfHostedRunnersForOrg`<br>`GitHubRestClient.actionsListSelfHostedRunnersForRepo`<br>`GitHubRestClient.actionsGenerateRunnerJitconfigForOrg`<br>`GitHubRestClient.actionsDeleteSelfHostedRunnerFromOrg`<br><sub>Adds runner groups, hosted runners, images, and JIT configuration.</sub> | **P**<br>`GitLabRestClient.getApiV4RunnersAll`<br>`GitLabRestClient.getApiV4RunnersId`<br>`GitLabRestClient.getApiV4GroupsIdRunners`<br>`GitLabRestClient.getApiV4ProjectsIdRunners`<br>`GitLabRestClient.postApiV4ProjectsIdRunners`<br>`GitLabRestClient.deleteApiV4ProjectsIdRunnersRunnerId`<br><sub>Instance/group/project runners and runner managers.</sub> |

### Commits and Git data

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Compare commits**<br>`commit.compare.v1` | Compare two commits or refs and return commit/file differences.<br><sub>Operand order, merge-base behavior, raw media, and structured diff fidelity differ.</sub> | **E**<br>`AzureDevOpsRestClient.diffsGet` | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDiffSpec`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDiffstatSpec`<br><sub>Raw diff and diffstat are split; topic mode changes merge-base behavior.</sub> | **E**<br>`CodebergRestClient.repoCompareDiff` | **E**<br>`GiteaRestClient.repoCompareDiff` | **E**<br>`GitHubRestClient.reposCompareCommits` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryCompare` |
| **Get commit**<br>`commit.get.v1` | Read one commit and provider-level metadata by commit identifier.<br><sub>GitHub also exposes a lower-level Git commit object operation.</sub> | **E**<br>`AzureDevOpsRestClient.commitsGet` | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitCommit` | **E**<br>`CodebergRestClient.repoGetSingleCommit` | **E**<br>`GiteaRestClient.repoGetSingleCommit` | **E**<br>`GitHubRestClient.reposGetCommit`<br>`GitHubRestClient.gitGetCommit` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsSha` |
| **List commits**<br>`commit.list.v1` | List commits reachable from a repository ref, optionally filtered by path or author.<br><sub>Filter vocabularies and pagination differ but the core read maps directly.</sub> | **E**<br>`AzureDevOpsRestClient.commitsGetCommits`<br>`AzureDevOpsRestClient.commitsGetCommitsBatch` | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommits`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitsRevision` | **E**<br>`CodebergRestClient.repoGetAllCommits` | **E**<br>`GiteaRestClient.repoGetAllCommits` | **E**<br>`GitHubRestClient.reposListCommits` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryCommits` |
| **Read repository content**<br>`content.read.v1` | List a directory or read file metadata/content by repository path and revision.<br><sub>Raw and metadata representations differ; some normalized sources omit binary response variants.</sub> | **E**<br>`AzureDevOpsRestClient.itemsGet`<br>`AzureDevOpsRestClient.itemsList`<br>`AzureDevOpsRestClient.itemsGetItemsBatch` | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugSrc`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugSrcCommitPath`<br><sub>File and directory responses share an incompletely typed route.</sub> | **E**<br>`CodebergRestClient.repoGetContents`<br>`CodebergRestClient.repoGetContentsList`<br>`CodebergRestClient.repoGetRawFile` | **E**<br>`GiteaRestClient.repoGetContents`<br>`GiteaRestClient.repoGetContentsList`<br>`GiteaRestClient.repoGetRawFile`<br>`GiteaRestClient.repoGetContentsExt` | **P**<br>`GitHubRestClient.reposGetContent`<br><sub>Raw media is documented but not represented completely in the generated response union.</sub> | **P**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryTree`<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryFilesFilePath`<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryFilesFilePathRaw`<br><sub>Raw binary media is mislabeled or incomplete in the normalized source.</sub> |
| **Commit file changes**<br>`content.write.v1` | Create a commit from one or more file create/update/delete actions and advance a branch.<br><sub>Azure uses pushes; GitHub batch writes require raw Git composition; Bitbucket and GitLab request schemas are incomplete.</sub> | **P**<br>`AzureDevOpsRestClient.pushesCreate`<br><sub>Push operation combines commits and ref updates.</sub> | **P**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugSrc`<br><sub>Multipart request body is absent from the normalized schema.</sub> | **E**<br>`CodebergRestClient.repoCreateFile`<br>`CodebergRestClient.repoUpdateFile`<br>`CodebergRestClient.repoDeleteFile`<br>`CodebergRestClient.repoChangeFiles` | **E**<br>`GiteaRestClient.repoCreateFile`<br>`GiteaRestClient.repoUpdateFile`<br>`GiteaRestClient.repoDeleteFile`<br>`GiteaRestClient.repoChangeFiles` | **P**<br>`GitHubRestClient.reposCreateOrUpdateFileContents`<br>`GitHubRestClient.reposDeleteFile`<br>`GitHubRestClient.gitCreateBlob`<br>`GitHubRestClient.gitCreateTree`<br>`GitHubRestClient.gitCreateCommit`<br>`GitHubRestClient.gitUpdateRef`<br><sub>Single-file API is direct; batch writes require composition.</sub> | **P**<br>`GitLabRestClient.postApiV4ProjectsIdRepositoryCommits`<br>`GitLabRestClient.postApiV4ProjectsIdRepositoryFilesFilePath`<br>`GitLabRestClient.putApiV4ProjectsIdRepositoryFilesFilePath`<br>`GitLabRestClient.deleteApiV4ProjectsIdRepositoryFilesFilePath`<br><sub>Normalized request schemas omit the documented commit action fields.</sub> |
| **Read Git blob**<br>`git.blob.read.v1` | Read blob content or metadata by object ID.<br><sub>Bitbucket has no accepted blob-by-object-ID mapping; several normalized response schemas omit binary bodies.</sub> | **E**<br>`AzureDevOpsRestClient.blobsGetBlob` | — | **E**<br>`CodebergRestClient.getBlob` | **E**<br>`GiteaRestClient.getBlob` | **E**<br>`GitHubRestClient.gitGetBlob` | **P**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryBlobsSha`<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryBlobsShaRaw`<br><sub>Success body schemas are incomplete in the normalized source.</sub> |
| **Read generic Git refs**<br>`git.ref.read.v1` | List or retrieve refs without restricting them to branches or tags.<br><sub>GitLab has no generic ref operation in this snapshot.</sub> | **E**<br>`AzureDevOpsRestClient.refsList` | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefs` | **E**<br>`CodebergRestClient.repoListAllGitRefs`<br>`CodebergRestClient.repoListGitRefs` | **E**<br>`GiteaRestClient.repoListAllGitRefs`<br>`GiteaRestClient.repoListGitRefs` | **E**<br>`GitHubRestClient.gitGetRef`<br>`GitHubRestClient.gitListMatchingRefs` | — |
| **Read Git tree**<br>`git.tree.read.v1` | Read a tree or tree-like repository listing at a selected revision.<br><sub>Bitbucket and GitLab expose path listings rather than raw Git tree objects.</sub> | **E**<br>`AzureDevOpsRestClient.treesGet` | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugSrc`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugSrcCommitPath`<br><sub>Source listing is path-oriented, not a raw tree object.</sub> | **E**<br>`CodebergRestClient.getTree` | **E**<br>`GiteaRestClient.getTree` | **E**<br>`GitHubRestClient.gitGetTree` | **P**<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryTree`<br><sub>ls-tree-style path/ref listing rather than raw tree object.</sub> |

### Identity and namespaces

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Read namespace members**<br>`namespace.members.read.v1` | List principals with membership in a repository namespace.<br><sub>Direct, public, inherited, pending, and permission-binding semantics differ.</sub> | — | **E**<br>`BitbucketRestClient.getWorkspacesWorkspaceMembers`<br>`BitbucketRestClient.getWorkspacesWorkspaceMembersMember` | **E**<br>`CodebergRestClient.orgListMembers`<br>`CodebergRestClient.orgListPublicMembers` | **E**<br>`GiteaRestClient.orgListMembers`<br>`GiteaRestClient.orgListPublicMembers` | **E**<br>`GitHubRestClient.orgsListMembers`<br>`GitHubRestClient.orgsListOutsideCollaborators` | **P**<br>`GitLabRestClient.getApiV4GroupsIdMembers`<br>`GitLabRestClient.getApiV4GroupsIdMembersAll`<br><sub>members/all includes inherited membership.</sub> |
| **List or get repository namespaces**<br>`namespace.read.v1` | Read owner namespaces that can contain repositories.<br><sub>Organization, workspace, and group are only comparable as repository ownership boundaries, not as lossless resources.</sub> | — | **E**<br>`BitbucketRestClient.getUserWorkspaces`<br>`BitbucketRestClient.getWorkspacesWorkspace` | **E**<br>`CodebergRestClient.orgGetAll`<br>`CodebergRestClient.orgGet` | **E**<br>`GiteaRestClient.orgGetAll`<br>`GiteaRestClient.orgGet` | **E**<br>`GitHubRestClient.orgsList`<br>`GitHubRestClient.orgsGet` | **P**<br>`GitLabRestClient.getApiV4Groups`<br>`GitLabRestClient.getApiV4GroupsId`<br><sub>GitLab groups are hierarchical and can contain projects/subgroups.</sub> |
| **Manage teams**<br>`team.crud.v1` | Manage a named team with members and repository access inside a namespace.<br><sub>Bitbucket permission groups and GitLab subgroups are explicitly not accepted as team equivalents.</sub> | — | — | **E**<br>`CodebergRestClient.orgListTeams`<br>`CodebergRestClient.orgCreateTeam`<br>`CodebergRestClient.orgGetTeam`<br>`CodebergRestClient.orgEditTeam`<br>`CodebergRestClient.orgDeleteTeam`<br>`CodebergRestClient.orgListTeamMembers`<br>`CodebergRestClient.orgAddTeamMember`<br>`CodebergRestClient.orgRemoveTeamMember` | **E**<br>`GiteaRestClient.orgListTeams`<br>`GiteaRestClient.orgCreateTeam`<br>`GiteaRestClient.orgGetTeam`<br>`GiteaRestClient.orgEditTeam`<br>`GiteaRestClient.orgDeleteTeam`<br>`GiteaRestClient.orgListTeamMembers`<br>`GiteaRestClient.orgAddTeamMember`<br>`GiteaRestClient.orgRemoveTeamMember` | **E**<br>`GitHubRestClient.teamsList`<br>`GitHubRestClient.teamsCreate`<br>`GitHubRestClient.teamsGetByName`<br>`GitHubRestClient.teamsUpdateInOrg`<br>`GitHubRestClient.teamsDeleteInOrg`<br>`GitHubRestClient.teamsListMembersInOrg`<br>`GitHubRestClient.teamsAddOrUpdateMembershipForUserInOrg`<br>`GitHubRestClient.teamsRemoveMembershipForUserInOrg` | — |
| **Get authenticated user**<br>`user.current.read.v1` | Read the identity represented by current request credentials.<br><sub>Azure Git and the generated GitLab snapshot have no accepted current-user method.</sub> | — | **E**<br>`BitbucketRestClient.getUser` | **E**<br>`CodebergRestClient.userGetCurrent` | **E**<br>`GiteaRestClient.userGetCurrent` | **E**<br>`GitHubRestClient.usersGetAuthenticated` | — |
| **Get named user**<br>`user.named.read.v1` | Read one public provider user by username or provider identifier.<br><sub>Azure Git and the generated GitLab snapshot have no accepted direct user getter.</sub> | — | **E**<br>`BitbucketRestClient.getUsersSelectedUser` | **E**<br>`CodebergRestClient.userGet` | **E**<br>`GiteaRestClient.userGet` | **E**<br>`GitHubRestClient.usersGetByUsername`<br>`GitHubRestClient.usersGetById` | — |
| **Search users**<br>`user.search.v1` | Search provider users by a text query.<br><sub>GitLab search has an untyped generated response; Bitbucket and Azure expose no accepted mapping.</sub> | — | — | **E**<br>`CodebergRestClient.userSearch` | **E**<br>`GiteaRestClient.userSearch` | **E**<br>`GitHubRestClient.searchUsers` | **P**<br>`GitLabRestClient.getApiV4Search`<br><sub>Requires scope=users and the generated success body is undefined.</sub> |

### Issues and planning

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Manage issue comments**<br>`issue.comments.v1` | List, create, update, and delete issue conversation comments.<br><sub>GitLab ordinary issue notes are absent from the generated snapshot.</sub> | — | — | **E**<br>`CodebergRestClient.issueGetComments`<br>`CodebergRestClient.issueCreateComment`<br>`CodebergRestClient.issueGetComment`<br>`CodebergRestClient.issueEditComment`<br>`CodebergRestClient.issueDeleteComment` | **E**<br>`GiteaRestClient.issueGetComments`<br>`GiteaRestClient.issueCreateComment`<br>`GiteaRestClient.issueGetComment`<br>`GiteaRestClient.issueEditComment`<br>`GiteaRestClient.issueDeleteComment` | **E**<br>`GitHubRestClient.issuesListComments`<br>`GitHubRestClient.issuesCreateComment`<br>`GitHubRestClient.issuesGetComment`<br>`GitHubRestClient.issuesUpdateComment`<br>`GitHubRestClient.issuesDeleteComment` | — |
| **List or get issues**<br>`issue.read.v1` | List issues in a repository/namespace scope and read one issue.<br><sub>GitLab's generated snapshot only exposes global/group reads, and GitHub list endpoints can include pull requests.</sub> | — | — | **E**<br>`CodebergRestClient.issueListIssues`<br>`CodebergRestClient.issueGetIssue` | **E**<br>`GiteaRestClient.issueListIssues`<br>`GiteaRestClient.issueGetIssue` | **P**<br>`GitHubRestClient.issuesListForRepo`<br>`GitHubRestClient.issuesGet`<br><sub>Repository issue lists can include pull requests.</sub> | **P**<br>`GitLabRestClient.getApiV4Issues`<br>`GitLabRestClient.getApiV4IssuesId`<br>`GitLabRestClient.getApiV4GroupsIdIssues`<br><sub>Project-scoped core issue read operations are absent from the generated snapshot.</sub> |
| **Create, update, or delete issue**<br>`issue.write.v1` | Create and mutate issue state/content in a repository.<br><sub>GitHub has no issue delete; GitLab mutation is absent from the generated snapshot.</sub> | — | — | **E**<br>`CodebergRestClient.issueCreateIssue`<br>`CodebergRestClient.issueEditIssue`<br>`CodebergRestClient.issueDelete` | **E**<br>`GiteaRestClient.issueCreateIssue`<br>`GiteaRestClient.issueEditIssue`<br>`GiteaRestClient.issueDelete` | **P**<br>`GitHubRestClient.issuesCreate`<br>`GitHubRestClient.issuesUpdate`<br><sub>No generated issue deletion operation.</sub> | — |
| **Manage label catalog**<br>`label.catalog.v1` | List and manage reusable repository labels.<br><sub>Azure PR tags and GitLab MR label fields are attachment mechanisms, not accepted label catalogs.</sub> | — | — | **E**<br>`CodebergRestClient.issueListLabels`<br>`CodebergRestClient.issueCreateLabel`<br>`CodebergRestClient.issueGetLabel`<br>`CodebergRestClient.issueEditLabel`<br>`CodebergRestClient.issueDeleteLabel` | **E**<br>`GiteaRestClient.issueListLabels`<br>`GiteaRestClient.issueCreateLabel`<br>`GiteaRestClient.issueGetLabel`<br>`GiteaRestClient.issueEditLabel`<br>`GiteaRestClient.issueDeleteLabel` | **E**<br>`GitHubRestClient.issuesListLabelsForRepo`<br>`GitHubRestClient.issuesCreateLabel`<br>`GitHubRestClient.issuesGetLabel`<br>`GitHubRestClient.issuesUpdateLabel`<br>`GitHubRestClient.issuesDeleteLabel` | — |
| **Manage milestones**<br>`milestone.catalog.v1` | List and manage repository milestones assignable to issues or pull requests.<br><sub>GitLab MR milestone assignment exists, but catalog CRUD is absent from the generated snapshot.</sub> | — | — | **E**<br>`CodebergRestClient.issueGetMilestonesList`<br>`CodebergRestClient.issueCreateMilestone`<br>`CodebergRestClient.issueGetMilestone`<br>`CodebergRestClient.issueEditMilestone`<br>`CodebergRestClient.issueDeleteMilestone` | **E**<br>`GiteaRestClient.issueGetMilestonesList`<br>`GiteaRestClient.issueCreateMilestone`<br>`GiteaRestClient.issueGetMilestone`<br>`GiteaRestClient.issueEditMilestone`<br>`GiteaRestClient.issueDeleteMilestone` | **E**<br>`GitHubRestClient.issuesListMilestones`<br>`GitHubRestClient.issuesCreateMilestone`<br>`GitHubRestClient.issuesGetMilestone`<br>`GitHubRestClient.issuesUpdateMilestone`<br>`GitHubRestClient.issuesDeleteMilestone` | — |

### Notifications and search

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Read and update notifications**<br>`notification.read-state.v1` | List notification threads and update their read or completion state.<br><sub>Only Codeberg, Gitea, and GitHub expose a notification inbox in these snapshots.</sub> | — | — | **E**<br>`CodebergRestClient.notifyGetList`<br>`CodebergRestClient.notifyGetRepoList`<br>`CodebergRestClient.notifyReadList`<br>`CodebergRestClient.notifyReadThread` | **E**<br>`GiteaRestClient.notifyGetList`<br>`GiteaRestClient.notifyGetRepoList`<br>`GiteaRestClient.notifyReadList`<br>`GiteaRestClient.notifyReadThread` | **P**<br>`GitHubRestClient.activityListNotificationsForAuthenticatedUser`<br>`GitHubRestClient.activityListRepoNotificationsForAuthenticatedUser`<br>`GitHubRestClient.activityMarkNotificationsAsRead`<br>`GitHubRestClient.activityMarkThreadAsRead`<br>`GitHubRestClient.activityMarkThreadAsDone`<br><sub>GitHub adds a distinct done state and subscriptions.</sub> | — |
| **Search repository code**<br>`search.code.v1` | Search indexed source content across repositories in a provider-defined scope.<br><sub>Query languages and result schemas are incompatible; Bitbucket methods are deprecated and GitLab results are untyped.</sub> | — | **P**<br>`BitbucketRestClient.searchAccount`<br>`BitbucketRestClient.searchTeam`<br>`BitbucketRestClient.searchWorkspace`<br><sub>Code-only methods are deprecated effective November 2026.</sub> | — | — | **E**<br>`GitHubRestClient.searchCode` | **P**<br>`GitLabRestClient.getApiV4Search`<br>`GitLabRestClient.getApiV4GroupsIdSearch`<br>`GitLabRestClient.getApiV4ProjectsIdSearch`<br><sub>Requires blobs scope and generated success bodies are undefined.</sub> |
| **Manage snippets or gists**<br>`snippet.crud.v1` | Manage a small provider-hosted multi-file code snippet independent of a normal repository checkout.<br><sub>Ownership, project association, revision, fork, star, watch, and comment semantics differ.</sub> | — | **P**<br>`BitbucketRestClient.getSnippetsWorkspace`<br>`BitbucketRestClient.postSnippetsWorkspace`<br>`BitbucketRestClient.getSnippetsWorkspaceEncodedId`<br>`BitbucketRestClient.putSnippetsWorkspaceEncodedId`<br>`BitbucketRestClient.deleteSnippetsWorkspaceEncodedId`<br><sub>Workspace snippets have revisions/watchers and Bitbucket-specific identity.</sub> | — | — | **P**<br>`GitHubRestClient.gistsList`<br>`GitHubRestClient.gistsCreate`<br>`GitHubRestClient.gistsGet`<br>`GitHubRestClient.gistsUpdate`<br>`GitHubRestClient.gistsDelete`<br><sub>Gists have forks, stars, revisions, and public discovery.</sub> | **P**<br>`GitLabRestClient.getApiV4Snippets`<br>`GitLabRestClient.postApiV4Snippets`<br>`GitLabRestClient.getApiV4SnippetsId`<br>`GitLabRestClient.putApiV4SnippetsId`<br>`GitLabRestClient.deleteApiV4SnippetsId`<br>`GitLabRestClient.getApiV4ProjectsIdSnippets`<br>`GitLabRestClient.postApiV4ProjectsIdSnippets`<br><sub>Global/personal and project snippets are separate scopes.</sub> |
| **Manage repository wiki pages**<br>`wiki.crud.v1` | List, read, create, update, and delete wiki pages attached to a repository or namespace.<br><sub>GitHub Pages and GitLab Pages are static hosting, not accepted wiki equivalents.</sub> | — | — | **E**<br>`CodebergRestClient.repoGetWikiPages`<br>`CodebergRestClient.repoGetWikiPage`<br>`CodebergRestClient.repoCreateWikiPage`<br>`CodebergRestClient.repoEditWikiPage`<br>`CodebergRestClient.repoDeleteWikiPage` | **E**<br>`GiteaRestClient.repoGetWikiPages`<br>`GiteaRestClient.repoGetWikiPage`<br>`GiteaRestClient.repoCreateWikiPage`<br>`GiteaRestClient.repoEditWikiPage`<br>`GiteaRestClient.repoDeleteWikiPage` | — | **E**<br>`GitLabRestClient.getApiV4ProjectsIdWikis`<br>`GitLabRestClient.getApiV4ProjectsIdWikisSlug`<br>`GitLabRestClient.postApiV4ProjectsIdWikis`<br>`GitLabRestClient.putApiV4ProjectsIdWikisSlug`<br>`GitLabRestClient.deleteApiV4ProjectsIdWikisSlug` |

### Packages and deployments

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Read or manage deployments and environments**<br>`deployment.environment.v1` | Represent deployment history and named target environments for repository code.<br><sub>GitHub uses deployment plus status history; GitLab is CI-job linked; Bitbucket exposes environment CRUD and deployment reads.</sub> | — | **P**<br>`BitbucketRestClient.createEnvironment`<br>`BitbucketRestClient.getEnvironmentForRepository`<br>`BitbucketRestClient.getEnvironmentsForRepository`<br>`BitbucketRestClient.updateEnvironmentForRepository`<br>`BitbucketRestClient.getDeploymentForRepository`<br>`BitbucketRestClient.getDeploymentsForRepository`<br><sub>No generated deployment-create operation; pipeline owns deployment records.</sub> | — | — | **P**<br>`GitHubRestClient.reposCreateDeployment`<br>`GitHubRestClient.reposCreateDeploymentStatus`<br>`GitHubRestClient.reposGetAllEnvironments`<br>`GitHubRestClient.reposCreateOrUpdateEnvironment`<br><sub>Deployment requests and append-only statuses plus environment protection.</sub> | **P**<br>`GitLabRestClient.postApiV4ProjectsIdDeployments`<br>`GitLabRestClient.getApiV4ProjectsIdDeployments`<br>`GitLabRestClient.putApiV4ProjectsIdDeploymentsDeploymentId`<br>`GitLabRestClient.postApiV4ProjectsIdEnvironments`<br>`GitLabRestClient.postApiV4ProjectsIdEnvironmentsEnvironmentIdStop`<br><sub>Deployments are CI/deployable-centered and have approvals/review-app lifecycle.</sub> |
| **Read or manage package metadata**<br>`packages.metadata.v1` | List package/version metadata and delete or restore package records.<br><sub>GitLab protocol endpoints and container registry are not equivalent to metadata CRUD; Bitbucket and Azure have no accepted package methods.</sub> | — | — | **P**<br>`CodebergRestClient.listPackages`<br>`CodebergRestClient.getPackage`<br>`CodebergRestClient.listPackageFiles`<br>`CodebergRestClient.deletePackage`<br><sub>Forgejo metadata and repository linking; narrower version surface.</sub> | **P**<br>`GiteaRestClient.listPackages`<br>`GiteaRestClient.getPackage`<br>`GiteaRestClient.listPackageVersions`<br>`GiteaRestClient.getLatestPackageVersion`<br>`GiteaRestClient.listPackageFiles`<br>`GiteaRestClient.deletePackage`<br>`GiteaRestClient.deletePackageVersion`<br><sub>Gitea metadata/version/file lifecycle and repository linking.</sub> | **P**<br>`GitHubRestClient.packagesListPackagesForOrganization`<br>`GitHubRestClient.packagesGetAllPackageVersionsForPackageOwnedByOrg`<br>`GitHubRestClient.packagesDeletePackageVersionForOrg`<br>`GitHubRestClient.packagesRestorePackageVersionForOrg`<br><sub>Package metadata lifecycle after publication.</sub> | **P**<br>`GitLabRestClient.getApiV4ProjectsIdPackages`<br>`GitLabRestClient.getApiV4ProjectsIdPackagesPackageId`<br>`GitLabRestClient.getApiV4ProjectsIdPackagesPackageIdPackageFiles`<br>`GitLabRestClient.deleteApiV4ProjectsIdPackagesPackageId`<br><sub>Metadata subset only; ecosystem wire protocols remain provider-specific.</sub> |

### Pull and merge requests

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Read pull request commits and changes**<br>`pull-request.changes.v1` | Read commits and file-level changes belonging to a pull or merge request.<br><sub>Azure iteration changes and provider raw diff/patch representations are materially different.</sub> | **P**<br>`AzureDevOpsRestClient.pullRequestCommitsGetPullRequestCommits`<br>`AzureDevOpsRestClient.pullRequestIterationChangesGet`<br><sub>Change model is iteration-oriented and has no raw patch endpoint.</sub> | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommits`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDiff`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDiffstat` | **E**<br>`CodebergRestClient.repoGetPullRequestCommits`<br>`CodebergRestClient.repoGetPullRequestFiles`<br>`CodebergRestClient.repoDownloadPullDiffOrPatch` | **E**<br>`GiteaRestClient.repoGetPullRequestCommits`<br>`GiteaRestClient.repoGetPullRequestFiles`<br>`GiteaRestClient.repoDownloadPullDiffOrPatch` | **E**<br>`GitHubRestClient.pullsListCommits`<br>`GitHubRestClient.pullsListFiles` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidCommits`<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidChanges`<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidDiffs`<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidRawDiffs` |
| **Manage pull request comments**<br>`pull-request.comments.v1` | Read and write conversation or inline comments on a pull request.<br><sub>Comment containers differ: Azure threads, Bitbucket comments, shared issue comments, GitHub review comments, and GitLab draft notes.</sub> | **P**<br>`AzureDevOpsRestClient.pullRequestThreadsList`<br>`AzureDevOpsRestClient.pullRequestThreadsCreate`<br>`AzureDevOpsRestClient.pullRequestThreadCommentsCreate`<br>`AzureDevOpsRestClient.pullRequestThreadCommentsUpdate`<br>`AzureDevOpsRestClient.pullRequestThreadCommentsDelete`<br><sub>Thread-first model with nested comments.</sub> | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments`<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentId`<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentId` | **P**<br>`CodebergRestClient.issueGetComments`<br>`CodebergRestClient.issueCreateComment`<br>`CodebergRestClient.repoGetPullReviewComments`<br><sub>Conversation comments share issue routes; inline comments belong to reviews.</sub> | **P**<br>`GiteaRestClient.issueGetComments`<br>`GiteaRestClient.issueCreateComment`<br>`GiteaRestClient.repoGetPullReviewComments`<br>`GiteaRestClient.repoCreatePullReviewCommentReply`<br><sub>Conversation comments share issue routes; inline comments belong to reviews.</sub> | **P**<br>`GitHubRestClient.issuesListComments`<br>`GitHubRestClient.issuesCreateComment`<br>`GitHubRestClient.pullsListReviewComments`<br>`GitHubRestClient.pullsCreateReviewComment`<br><sub>Conversation and inline review comments are separate resources.</sub> | **P**<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes`<br>`GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes`<br>`GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesBulkPublish`<br><sub>Only draft positional notes are present; ordinary published notes are absent.</sub> |
| **List, create, read, and update pull request**<br>`pull-request.core.v1` | Manage a proposal to merge commits from a source branch into a target branch.<br><sub>All six map at the workflow level, but identity, source-branch ownership, draft state, and mergeability fields differ.</sub> | **E**<br>`AzureDevOpsRestClient.pullRequestsGetPullRequests`<br>`AzureDevOpsRestClient.pullRequestsCreate`<br>`AzureDevOpsRestClient.pullRequestsGetPullRequest`<br>`AzureDevOpsRestClient.pullRequestsUpdate` | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequests`<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequests`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` | **E**<br>`CodebergRestClient.repoListPullRequests`<br>`CodebergRestClient.repoCreatePullRequest`<br>`CodebergRestClient.repoGetPullRequest`<br>`CodebergRestClient.repoEditPullRequest` | **E**<br>`GiteaRestClient.repoListPullRequests`<br>`GiteaRestClient.repoCreatePullRequest`<br>`GiteaRestClient.repoGetPullRequest`<br>`GiteaRestClient.repoEditPullRequest` | **E**<br>`GitHubRestClient.pullsList`<br>`GitHubRestClient.pullsCreate`<br>`GitHubRestClient.pullsGet`<br>`GitHubRestClient.pullsUpdate` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequests`<br>`GitLabRestClient.postApiV4ProjectsIdMergeRequests`<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIid`<br>`GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIid` |
| **Merge or complete pull request**<br>`pull-request.merge.v1` | Apply the proposed source changes to the target branch.<br><sub>Azure completes by updating PR state; merge strategies and async behavior differ.</sub> | **P**<br>`AzureDevOpsRestClient.pullRequestsUpdate`<br><sub>Completion is a state update with completion options, not a dedicated merge operation.</sub> | **E**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdMerge` | **E**<br>`CodebergRestClient.repoMergePullRequest` | **E**<br>`GiteaRestClient.repoMergePullRequest` | **E**<br>`GitHubRestClient.pullsMerge`<br>`GitHubRestClient.pullsMergeAsync` | **E**<br>`GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIidMerge` |
| **Submit review or approval decision**<br>`pull-request.review.v1` | Record an authenticated review decision on a pull or merge request.<br><sub>Review entities only exist on Codeberg/Gitea/GitHub; Azure votes, Bitbucket participant state, and GitLab approvals are partial mappings.</sub> | **P**<br>`AzureDevOpsRestClient.pullRequestReviewersUpdatePullRequestReviewer`<br><sub>Numeric reviewer vote rather than a review entity.</sub> | **P**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove`<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdRequestChanges`<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove`<br><sub>Mutates authenticated participant state without a review object.</sub> | **E**<br>`CodebergRestClient.repoListPullReviews`<br>`CodebergRestClient.repoCreatePullReview`<br>`CodebergRestClient.repoGetPullReview`<br>`CodebergRestClient.repoSubmitPullReview`<br>`CodebergRestClient.repoDismissPullReview` | **E**<br>`GiteaRestClient.repoListPullReviews`<br>`GiteaRestClient.repoCreatePullReview`<br>`GiteaRestClient.repoGetPullReview`<br>`GiteaRestClient.repoSubmitPullReview`<br>`GiteaRestClient.repoDismissPullReview` | **E**<br>`GitHubRestClient.pullsListReviews`<br>`GitHubRestClient.pullsCreateReview`<br>`GitHubRestClient.pullsGetReview`<br>`GitHubRestClient.pullsSubmitReview`<br>`GitHubRestClient.pullsDismissReview` | **P**<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidApprovals`<br>`GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove`<br>`GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidUnapprove`<br><sub>Approval state has no GitHub-style review entity or request-changes decision.</sub> |
| **Read or request reviewers**<br>`pull-request.reviewers.v1` | Read assigned/requested reviewers and request or remove reviewer participation.<br><sub>Bitbucket and GitLab primarily set reviewer arrays in PR/MR bodies rather than dedicated request endpoints.</sub> | **E**<br>`AzureDevOpsRestClient.pullRequestReviewersList`<br>`AzureDevOpsRestClient.pullRequestReviewersCreatePullRequestReviewer`<br>`AzureDevOpsRestClient.pullRequestReviewersDelete` | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDefaultReviewers`<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequests`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId`<br><sub>Per-PR reviewers are body fields; dedicated methods manage defaults.</sub> | **E**<br>`CodebergRestClient.repoGetReviewers`<br>`CodebergRestClient.repoCreatePullReviewRequests`<br>`CodebergRestClient.repoDeletePullReviewRequests` | **E**<br>`GiteaRestClient.repoGetReviewers`<br>`GiteaRestClient.repoCreatePullReviewRequests`<br>`GiteaRestClient.repoDeletePullReviewRequests` | **E**<br>`GitHubRestClient.pullsListRequestedReviewers`<br>`GitHubRestClient.pullsRequestReviewers`<br>`GitHubRestClient.pullsRemoveRequestedReviewers` | **P**<br>`GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidReviewers`<br>`GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIid`<br><sub>Reviewer assignment is a merge-request update field.</sub> |

### Repositories

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Archive or unarchive repository**<br>`repository.archive.v1` | Transition a repository between active and archived states without deleting it.<br><sub>Only Codeberg, Gitea, GitHub, and GitLab expose an accepted generated mapping.</sub> | — | — | **P**<br>`CodebergRestClient.repoEdit`<br><sub>Archive is a field on generic repository update.</sub> | **P**<br>`GiteaRestClient.repoEdit`<br><sub>Archive is a field on generic repository update.</sub> | **P**<br>`GitHubRestClient.reposUpdate`<br><sub>Archive is a field on generic repository update.</sub> | **E**<br>`GitLabRestClient.postApiV4ProjectsIdArchive`<br>`GitLabRestClient.postApiV4ProjectsIdUnarchive` |
| **Create repository**<br>`repository.create.v1` | Create a repository in a selected user or namespace scope.<br><sub>Owner and namespace models differ; Bitbucket PUT can also replace repository settings.</sub> | **E**<br>`AzureDevOpsRestClient.repositoriesCreate` | **P**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlug`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlug`<br><sub>Workspace-scoped create routes have different PUT/POST semantics.</sub> | **E**<br>`CodebergRestClient.createCurrentUserRepo`<br>`CodebergRestClient.createOrgRepo` | **E**<br>`GiteaRestClient.createCurrentUserRepo`<br>`GiteaRestClient.createOrgRepo` | **E**<br>`GitHubRestClient.reposCreateForAuthenticatedUser`<br>`GitHubRestClient.reposCreateInOrg` | **E**<br>`GitLabRestClient.postApiV4Projects`<br>`GitLabRestClient.postApiV4ProjectsUserUserId` |
| **Delete repository**<br>`repository.delete.v1` | Remove a repository-bearing resource from its active namespace.<br><sub>Azure initially moves a repository to a recycle bin; other providers expose direct deletion with provider-specific retention policy.</sub> | **P**<br>`AzureDevOpsRestClient.repositoriesDelete`<br>`AzureDevOpsRestClient.repositoriesDeleteRepositoryFromRecycleBin`<br><sub>Soft deletion and permanent deletion are separate operations.</sub> | **E**<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlug` | **E**<br>`CodebergRestClient.repoDelete` | **E**<br>`GiteaRestClient.repoDelete` | **E**<br>`GitHubRestClient.reposDelete` | **P**<br>`GitLabRestClient.deleteApiV4ProjectsId`<br><sub>Delayed deletion policy can defer physical removal.</sub> |
| **Create repository fork**<br>`repository.fork.create.v1` | Create a repository whose initial lineage points to an existing repository.<br><sub>Azure models a fork through repository creation; destination namespace and asynchronous behavior differ.</sub> | **P**<br>`AzureDevOpsRestClient.repositoriesCreate`<br><sub>Forking is selected through parentRepository/sourceRef fields.</sub> | **E**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugForks` | **E**<br>`CodebergRestClient.createFork` | **E**<br>`GiteaRestClient.createFork` | **E**<br>`GitHubRestClient.reposCreateFork` | **E**<br>`GitLabRestClient.postApiV4ProjectsIdFork` |
| **List repository forks**<br>`repository.fork.list.v1` | List repositories whose recorded parent is the selected repository.<br><sub>Pagination and lineage fields differ but the read effect maps directly.</sub> | **E**<br>`AzureDevOpsRestClient.forksList` | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugForks` | **E**<br>`CodebergRestClient.listForks` | **E**<br>`GiteaRestClient.listForks` | **E**<br>`GitHubRestClient.reposListForks` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdForks` |
| **Get repository metadata**<br>`repository.get.v1` | Read one repository-bearing resource by stable provider identifier or owner/name pair.<br><sub>GitLab calls the repository-bearing unit a project; Azure requires organization and project context.</sub> | **E**<br>`AzureDevOpsRestClient.repositoriesGetRepository` | **E**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlug` | **E**<br>`CodebergRestClient.repoGet`<br>`CodebergRestClient.repoGetById` | **E**<br>`GiteaRestClient.repoGet`<br>`GiteaRestClient.repoGetById` | **E**<br>`GitHubRestClient.reposGet` | **E**<br>`GitLabRestClient.getApiV4ProjectsId` |
| **List repositories**<br>`repository.list.v1` | List repository-bearing resources visible in a selected owner or namespace scope.<br><sub>Scope selectors differ: Azure project, Bitbucket workspace, GitLab group/project, and user or organization elsewhere.</sub> | **E**<br>`AzureDevOpsRestClient.repositoriesList` | **E**<br>`BitbucketRestClient.getRepositories`<br>`BitbucketRestClient.getRepositoriesWorkspace` | **E**<br>`CodebergRestClient.userCurrentListRepos`<br>`CodebergRestClient.userListRepos`<br>`CodebergRestClient.orgListRepos` | **E**<br>`GiteaRestClient.userCurrentListRepos`<br>`GiteaRestClient.userListRepos`<br>`GiteaRestClient.orgListRepos` | **E**<br>`GitHubRestClient.reposListForAuthenticatedUser`<br>`GitHubRestClient.reposListForOrg`<br>`GitHubRestClient.reposListForUser` | **E**<br>`GitLabRestClient.getApiV4Projects`<br>`GitLabRestClient.getApiV4GroupsIdProjects`<br>`GitLabRestClient.getApiV4UsersUserIdProjects` |
| **Update repository metadata**<br>`repository.update.v1` | Change mutable repository metadata and settings without modifying Git objects.<br><sub>Writable fields vary substantially, so only the transport-level effect is equivalent.</sub> | **P**<br>`AzureDevOpsRestClient.repositoriesUpdate`<br><sub>The Git spec documents a narrow subset of repository fields.</sub> | **E**<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlug` | **E**<br>`CodebergRestClient.repoEdit` | **E**<br>`GiteaRestClient.repoEdit` | **E**<br>`GitHubRestClient.reposUpdate` | **E**<br>`GitLabRestClient.putApiV4ProjectsId` |

### Repository access and integrations

| Capability | Mapping contract | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab |
|---|---|---|---|---|---|---|---|
| **Read repository collaborators or members**<br>`collaborator.read.v1` | Read principals with direct or inherited access to a repository-bearing resource.<br><sub>Bitbucket permission entries and GitLab project membership are broader than collaborator invitations.</sub> | — | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPermissionsConfigUsers`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPermissionsConfigGroups`<br><sub>Returns direct user/group permission bindings.</sub> | **E**<br>`CodebergRestClient.repoListCollaborators`<br>`CodebergRestClient.repoCheckCollaborator` | **E**<br>`GiteaRestClient.repoListCollaborators`<br>`GiteaRestClient.repoCheckCollaborator` | **E**<br>`GitHubRestClient.reposListCollaborators`<br>`GitHubRestClient.reposCheckCollaborator`<br>`GitHubRestClient.reposGetCollaboratorPermissionLevel` | **P**<br>`GitLabRestClient.getApiV4ProjectsIdMembers`<br>`GitLabRestClient.getApiV4ProjectsIdMembersAll`<br><sub>Project members can include inherited group membership.</sub> |
| **Read and create commit statuses**<br>`commit-status.v1` | Attach external state/context information to a commit and list recorded statuses.<br><sub>Bitbucket also supports keyed updates; combined-status endpoints are not universal.</sub> | **E**<br>`AzureDevOpsRestClient.statusesCreate`<br>`AzureDevOpsRestClient.statusesList` | **E**<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuild`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitCommitStatuses`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuildKey` | **E**<br>`CodebergRestClient.repoCreateStatus`<br>`CodebergRestClient.repoListStatuses`<br>`CodebergRestClient.repoListStatusesByRef` | **E**<br>`GiteaRestClient.repoCreateStatus`<br>`GiteaRestClient.repoListStatuses`<br>`GiteaRestClient.repoListStatusesByRef` | **E**<br>`GitHubRestClient.reposCreateCommitStatus`<br>`GitHubRestClient.reposListCommitStatusesForRef` | **E**<br>`GitLabRestClient.postApiV4ProjectsIdStatusesSha`<br>`GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaStatuses` |
| **Manage deploy keys**<br>`deploy-key.crud.v1` | List, create, inspect, and remove repository-scoped SSH deploy keys.<br><sub>Azure Git has no accepted mapping; Bitbucket create/update bodies are incomplete.</sub> | — | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDeployKeys`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDeployKeysKeyId`<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugDeployKeys`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlugDeployKeysKeyId`<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugDeployKeysKeyId`<br><sub>Create and update request bodies are missing in the normalized source.</sub> | **E**<br>`CodebergRestClient.repoListKeys`<br>`CodebergRestClient.repoGetKey`<br>`CodebergRestClient.repoCreateKey`<br>`CodebergRestClient.repoDeleteKey` | **E**<br>`GiteaRestClient.repoListKeys`<br>`GiteaRestClient.repoGetKey`<br>`GiteaRestClient.repoCreateKey`<br>`GiteaRestClient.repoDeleteKey` | **E**<br>`GitHubRestClient.reposListDeployKeys`<br>`GitHubRestClient.reposGetDeployKey`<br>`GitHubRestClient.reposCreateDeployKey`<br>`GitHubRestClient.reposDeleteDeployKey` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdDeployKeys`<br>`GitLabRestClient.getApiV4ProjectsIdDeployKeysKeyId`<br>`GitLabRestClient.postApiV4ProjectsIdDeployKeys`<br>`GitLabRestClient.putApiV4ProjectsIdDeployKeysKeyId`<br>`GitLabRestClient.deleteApiV4ProjectsIdDeployKeysKeyId` |
| **Manage releases**<br>`release.crud.v1` | List, read, create, update, and delete releases attached to repository tags.<br><sub>Azure and Bitbucket have no accepted release resource in these generated snapshots.</sub> | — | — | **E**<br>`CodebergRestClient.repoListReleases`<br>`CodebergRestClient.repoGetRelease`<br>`CodebergRestClient.repoGetReleaseByTag`<br>`CodebergRestClient.repoCreateRelease`<br>`CodebergRestClient.repoEditRelease`<br>`CodebergRestClient.repoDeleteRelease` | **E**<br>`GiteaRestClient.repoListReleases`<br>`GiteaRestClient.repoGetRelease`<br>`GiteaRestClient.repoGetReleaseByTag`<br>`GiteaRestClient.repoCreateRelease`<br>`GiteaRestClient.repoEditRelease`<br>`GiteaRestClient.repoDeleteRelease` | **E**<br>`GitHubRestClient.reposListReleases`<br>`GitHubRestClient.reposGetRelease`<br>`GitHubRestClient.reposGetReleaseByTag`<br>`GitHubRestClient.reposCreateRelease`<br>`GitHubRestClient.reposUpdateRelease`<br>`GitHubRestClient.reposDeleteRelease` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdReleases`<br>`GitLabRestClient.getApiV4ProjectsIdReleasesTagName`<br>`GitLabRestClient.postApiV4ProjectsIdReleases`<br>`GitLabRestClient.putApiV4ProjectsIdReleasesTagName`<br>`GitLabRestClient.deleteApiV4ProjectsIdReleasesTagName` |
| **Manage repository webhooks**<br>`webhook.crud.v1` | List, create, update, test, and delete outbound repository webhooks.<br><sub>Delivery logs/replay and test-trigger capabilities differ; Bitbucket request bodies are incomplete.</sub> | — | **P**<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugHooks`<br>`BitbucketRestClient.getRepositoriesWorkspaceRepoSlugHooksUid`<br>`BitbucketRestClient.postRepositoriesWorkspaceRepoSlugHooks`<br>`BitbucketRestClient.putRepositoriesWorkspaceRepoSlugHooksUid`<br>`BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugHooksUid`<br><sub>Create/update bodies are absent from the normalized source.</sub> | **E**<br>`CodebergRestClient.repoListHooks`<br>`CodebergRestClient.repoGetHook`<br>`CodebergRestClient.repoCreateHook`<br>`CodebergRestClient.repoEditHook`<br>`CodebergRestClient.repoDeleteHook`<br>`CodebergRestClient.repoTestHook` | **E**<br>`GiteaRestClient.repoListHooks`<br>`GiteaRestClient.repoGetHook`<br>`GiteaRestClient.repoCreateHook`<br>`GiteaRestClient.repoEditHook`<br>`GiteaRestClient.repoDeleteHook`<br>`GiteaRestClient.repoTestHook` | **E**<br>`GitHubRestClient.reposListWebhooks`<br>`GitHubRestClient.reposGetWebhook`<br>`GitHubRestClient.reposCreateWebhook`<br>`GitHubRestClient.reposUpdateWebhook`<br>`GitHubRestClient.reposDeleteWebhook`<br>`GitHubRestClient.reposPingWebhook`<br>`GitHubRestClient.reposTestPushWebhook` | **E**<br>`GitLabRestClient.getApiV4ProjectsIdHooks`<br>`GitLabRestClient.getApiV4ProjectsIdHooksHookId`<br>`GitLabRestClient.postApiV4ProjectsIdHooks`<br>`GitLabRestClient.putApiV4ProjectsIdHooksHookId`<br>`GitLabRestClient.deleteApiV4ProjectsIdHooksHookId`<br>`GitLabRestClient.postApiV4ProjectsIdHooksHookIdTestTrigger` |

## Explicitly Rejected Mappings

These resources look similar by name but cannot share a safe common contract.

| Apparent match | Azure DevOps | Bitbucket | Codeberg | Gitea | GitHub | GitLab | Why mapping is rejected |
|---|---|---|---|---|---|---|---|
| **N: Checks, Code Insights, and commit statuses** | — | `BitbucketRestClient.createOrUpdateReport`<br>`BitbucketRestClient.bulkCreateOrUpdateAnnotations` | — | — | `GitHubRestClient.checksCreate`<br>`GitHubRestClient.checksCreateSuite`<br>`GitHubRestClient.checksListAnnotations` | — | GitHub Checks have app-owned suites/runs and rerequest behavior; Bitbucket Code Insights stores caller-authored reports/annotations. Only their narrower commit-status projections are portable. |
| **N: Project resources** | — | `BitbucketRestClient.getWorkspacesWorkspaceProjects` | — | `GiteaRestClient.repoListProjects` | `GitHubRestClient.projectsListForOrg` | `GitLabRestClient.getApiV4Projects` | Bitbucket projects group repositories, Gitea projects are issue boards, GitHub Projects are planning databases, and GitLab projects are repository-bearing application units. |
| **N: Release assets, GitLab asset links, and Bitbucket Downloads** | — | `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDownloads` | `CodebergRestClient.repoListReleaseAttachments` | `GiteaRestClient.repoListReleaseAttachments` | `GitHubRestClient.reposListReleaseAssets` | `GitLabRestClient.getApiV4ProjectsIdReleasesTagNameAssetsLinks` | Binary release objects, external release links, arbitrary repository Downloads, and separate project uploads have different ownership and lifecycle. |
| **N: Review entities and approval state** | `AzureDevOpsRestClient.pullRequestReviewersUpdatePullRequestReviewer` | `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove` | `CodebergRestClient.repoCreatePullReview` | `GiteaRestClient.repoCreatePullReview` | `GitHubRestClient.pullsCreateReview` | `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove` | Azure votes, Bitbucket participant state, GitLab approvals, and first-class review records must remain distinct even though all can signal acceptance. |
| **N: Webhook and server-side Git hook** | — | — | `CodebergRestClient.repoCreateHook`<br>`CodebergRestClient.repoEditGitHook` | `GiteaRestClient.repoCreateHook`<br>`GiteaRestClient.repoEditGitHook` | — | — | A webhook is an outbound HTTP callback; a server-side Git hook executes privileged forge-side code/configuration and is not a webhook subtype. |
| **N: Wiki pages and static Pages hosting** | — | — | `CodebergRestClient.repoGetWikiPages` | `GiteaRestClient.repoGetWikiPages` | `GitHubRestClient.reposGetPages` | `GitLabRestClient.getApiV4ProjectsIdWikis`<br>`GitLabRestClient.getApiV4ProjectsIdPages` | Wiki CRUD edits collaborative pages; Pages APIs configure static site hosting and deployments. Similar names do not imply a shared resource. |

## Provider-Specific Surfaces

### Azure DevOps

#### Pull request iteration and work-item model

Tracks PR updates as explicit iterations and links Azure work-item references.

Methods: `AzureDevOpsRestClient.pullRequestIterationsList`, `AzureDevOpsRestClient.pullRequestIterationChangesGet`, `AzureDevOpsRestClient.pullRequestWorkItemsList`.

**Why it remains provider-specific:** Other providers expose commits/diffs and issue links, but not this exact iteration/work-item contract in these clients.

#### Repository recycle bin

Azure exposes discovery, restoration, and permanent deletion of soft-deleted Git repositories as an explicit lifecycle.

Methods: `AzureDevOpsRestClient.repositoriesGetDeletedRepositories`, `AzureDevOpsRestClient.repositoriesGetRecycleBinRepositories`, `AzureDevOpsRestClient.repositoriesRestoreRepositoryFromRecycleBin`, `AzureDevOpsRestClient.repositoriesDeleteRepositoryFromRecycleBin`.

**Why it remains provider-specific:** GitLab delayed deletion has restoration policy, but its generated repository API does not expose the same recycle-bin inventory model.

#### Git ref locking

Locks or unlocks one Git ref independently of branch protection policy.

Methods: `AzureDevOpsRestClient.refsUpdateRef`.

**Why it remains provider-specific:** Branch protection elsewhere controls permissions/rules and is not an equivalent mutable lock bit.

The exhaustive inventory contains 66 additional unmatched Azure DevOps methods. They are not called unique until a semantic review confirms that classification.

### Bitbucket

#### Code Insights reports and annotations

Stores caller-authored reports and line annotations against a commit.

Methods: `BitbucketRestClient.createOrUpdateReport`, `BitbucketRestClient.getReportsForCommit`, `BitbucketRestClient.bulkCreateOrUpdateAnnotations`, `BitbucketRestClient.getAnnotationsForReport`.

**Why it remains provider-specific:** GitHub Checks are app-owned suites/runs with a different lifecycle; security alerts are provider-owned findings.

#### Bitbucket Connect add-on lifecycle

Manages installed Connect add-ons and their provider-hosted identity/configuration.

Methods: `BitbucketRestClient.getAddonAddonKeyClientKey`, `BitbucketRestClient.putAddon`, `BitbucketRestClient.deleteAddon`.

**Why it remains provider-specific:** GitHub Apps and GitLab integrations have different installation, token, descriptor, and permission models.

#### Pipeline SSH and OIDC configuration

Exposes pipeline known-host/key-pair configuration and OIDC discovery/JWKS directly.

Methods: `BitbucketRestClient.createRepositoryPipelineKnownHost`, `BitbucketRestClient.getRepositoryPipelineSshKeyPair`, `BitbucketRestClient.getOidcConfiguration`, `BitbucketRestClient.getOidcKeys`.

**Why it remains provider-specific:** GitHub customizes OIDC subject claims; GitLab configures cloud workload integrations. Those are not discovery-key endpoints.

The exhaustive inventory contains 191 additional unmatched Bitbucket methods. They are not called unique until a semantic review confirms that classification.

### Codeberg

#### Forgejo Actions token-context lookup

Retrieves the run associated with an automatic job token and provides Forgejo-specific run-job administration/search.

Methods: `CodebergRestClient.getActionsRun`, `CodebergRestClient.adminSearchRunJobs`.

**Why it remains provider-specific:** Other CI APIs inspect runs by explicit repository/run identifiers.

#### ActivityPub federation

Exposes federated actor, inbox, outbox, feed, repository actor, and remote-follow protocol operations.

Methods: `CodebergRestClient.activitypubInstanceActor`, `CodebergRestClient.activitypubPerson`, `CodebergRestClient.activitypubPersonInbox`, `CodebergRestClient.activitypubRepository`, `CodebergRestClient.activitypubRepositoryInbox`, `CodebergRestClient.userCurrentActivityPubFollow`.

**Why it remains provider-specific:** Local follows and webhooks do not model federated actor URIs, signed activities, or inbox delivery.

#### Quota rules, groups, and resource accounting

Composes enforceable quota rules/groups and reports effective usage by artifact, attachment, and package consumer.

Methods: `CodebergRestClient.adminCreateQuotaRule`, `CodebergRestClient.adminCreateQuotaGroup`, `CodebergRestClient.adminAddRuleToQuotaGroup`, `CodebergRestClient.adminSetUserQuotaGroups`, `CodebergRestClient.userGetQuota`, `CodebergRestClient.userCheckQuota`, `CodebergRestClient.orgGetQuota`.

**Why it remains provider-specific:** GitHub billing budgets and GitLab plan limits measure different dimensions and do not share this enforcement model.

The exhaustive inventory contains 351 additional unmatched Codeberg methods. They are not called unique until a semantic review confirms that classification.

### Gitea

#### Instance repository adoption and cron execution

Adopts repositories found on the forge filesystem and invokes instance maintenance tasks.

Methods: `GiteaRestClient.adminAdoptRepository`, `GiteaRestClient.adminUnadoptedList`, `GiteaRestClient.adminCronList`, `GiteaRestClient.adminCronRun`.

**Why it remains provider-specific:** Cloud-hosted provider administration does not expose filesystem adoption or arbitrary instance cron execution.

#### Issue stopwatch and tracked time

Models active per-user timers and accumulated issue time as explicit REST resources.

Methods: `GiteaRestClient.issueStartStopWatch`, `GiteaRestClient.issueStopStopWatch`, `GiteaRestClient.issueTrackedTimes`.

**Why it remains provider-specific:** GitLab has issue time estimates/spent time but no accepted active stopwatch mapping in this snapshot.

#### Issue-to-column project boards

Provides direct issue placement and movement across simple project columns at repository, organization, and user scopes.

Methods: `GiteaRestClient.repoCreateProject`, `GiteaRestClient.repoCreateProjectColumn`, `GiteaRestClient.repoAddIssueToProjectColumn`, `GiteaRestClient.repoMoveProjectIssue`, `GiteaRestClient.repoSetDefaultProjectColumn`.

**Why it remains provider-specific:** GitHub Projects V2 has typed fields/views/draft items and cannot be represented as a column board.

The exhaustive inventory contains 378 additional unmatched Gitea methods. They are not called unique until a semantic review confirms that classification.

### GitHub

#### GitHub App installation and token model

Installs permission-scoped apps on selected accounts/repositories and issues short-lived installation tokens.

Methods: `GitHubRestClient.appsCreateFromManifest`, `GitHubRestClient.appsListInstallations`, `GitHubRestClient.appsCreateInstallationAccessToken`, `GitHubRestClient.appsListReposAccessibleToInstallation`, `GitHubRestClient.appsSuspendInstallation`.

**Why it remains provider-specific:** OAuth client registrations and Bitbucket Connect descriptors use incompatible identity and authorization models.

#### Billing budgets and premium usage reports

Configures spending budgets and retrieves billable/premium/AI usage dimensions.

Methods: `GitHubRestClient.billingCreateOrganizationBudget`, `GitHubRestClient.billingGetAllBudgetsOrg`, `GitHubRestClient.billingGetGithubBillingUsageReportOrg`, `GitHubRestClient.billingGetGithubBillingAiCreditUsageReportOrg`.

**Why it remains provider-specific:** Forgejo storage quotas and GitLab plan limits are not monetary budget resources.

#### Codespaces, Copilot, and coding agents

Manages cloud development environments, AI product seats/spaces, and repository coding-agent tasks.

Methods: `GitHubRestClient.codespacesCreateWithRepoForAuthenticatedUser`, `GitHubRestClient.codespacesStartForAuthenticatedUser`, `GitHubRestClient.copilotAddCopilotSeatsForUsers`, `GitHubRestClient.copilotSpacesCreateForOrg`, `GitHubRestClient.agentTasksCreateTaskInRepo`.

**Why it remains provider-specific:** No corresponding generated resources exist in the other five clients.

#### Native scanning, advisory, and remediation lifecycle

Owns alert identity, locations, dismissal/remediation, SARIF ingestion, autofix, SBOM, and repository advisory/CVE workflows.

Methods: `GitHubRestClient.codeScanningListAlertsForRepo`, `GitHubRestClient.codeScanningUploadSarif`, `GitHubRestClient.codeScanningCreateAutofix`, `GitHubRestClient.secretScanningListAlertsForRepo`, `GitHubRestClient.dependencyGraphExportSbom`, `GitHubRestClient.securityAdvisoriesCreateRepositoryAdvisory`.

**Why it remains provider-specific:** Bitbucket Code Insights stores caller-authored reports; the generated GitLab snapshot lacks native vulnerability CRUD.

The exhaustive inventory contains 1052 additional unmatched GitHub methods. They are not called unique until a semantic review confirms that classification.

### GitLab

#### Runtime and instance feature flags

Separately manages project runtime flags with Unleash compatibility and self-managed instance feature gates.

Methods: `GitLabRestClient.getApiV4ProjectsIdFeatureFlags`, `GitLabRestClient.postApiV4ProjectsIdFeatureFlags`, `GitLabRestClient.getApiV4FeatureFlagsUnleashProjectIdClientFeatures`, `GitLabRestClient.getApiV4Features`, `GitLabRestClient.postApiV4FeaturesName`.

**Why it remains provider-specific:** Repository variables and environment configuration are not feature-evaluation services.

#### Geo and self-managed operational administration

Exposes Geo replication/proxy status and database/background-migration operations for self-managed instances.

Methods: `GitLabRestClient.postApiV4GeoStatus`, `GitLabRestClient.getApiV4AdminBatchedBackgroundMigrations`, `GitLabRestClient.putApiV4AdminBatchedBackgroundMigrationsIdPause`, `GitLabRestClient.getApiV4AdminDatabasesDatabaseNameDictionaryTablesTableName`.

**Why it remains provider-specific:** No other generated client exposes equivalent forge database or Geo operational controls.

#### Typed product integration catalog

Configures product-specific credentials, events, and bidirectional behavior through dedicated integration resources.

Methods: `GitLabRestClient.putApiV4ProjectsIdIntegrationsJenkins`, `GitLabRestClient.putApiV4ProjectsIdIntegrationsJira`, `GitLabRestClient.putApiV4ProjectsIdIntegrationsSlack`, `GitLabRestClient.putApiV4ProjectsIdIntegrationsGoogleCloudPlatformArtifactRegistry`.

**Why it remains provider-specific:** A generic webhook cannot preserve each integration's typed configuration or behavior.

#### Package ecosystem wire protocols

Implements ecosystem-specific upload, download, metadata, and index protocols across many package formats.

Methods: `GitLabRestClient.getApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName`, `GitLabRestClient.putApiV4ProjectsIdPackagesMavenPathFileName`, `GitLabRestClient.putApiV4ProjectsIdPackagesNpmPackageName`, `GitLabRestClient.putApiV4ProjectsIdPackagesNuget`, `GitLabRestClient.getApiV4ProjectsIdPackagesPypiSimplePackageName`.

**Why it remains provider-specific:** Other generated package clients primarily manage package metadata after publication, not ecosystem wire protocols.

#### Terraform state/module and Kubernetes agent resources

Hosts lockable Terraform state/module registries and manages Kubernetes connectivity agents/tokens.

Methods: `GitLabRestClient.getApiV4ProjectsIdTerraformStateName`, `GitLabRestClient.postApiV4ProjectsIdTerraformStateNameLock`, `GitLabRestClient.getApiV4ProjectsIdClusterAgents`, `GitLabRestClient.postApiV4ProjectsIdClusterAgents`.

**Why it remains provider-specific:** CI runners and OIDC cloud credentials do not provide state locking or Kubernetes agent resources.

The exhaustive inventory contains 1005 additional unmatched GitLab methods. They are not called unique until a semantic review confirms that classification.

## Complete Generated Method Inventory

Every generated operation appears below. `Unmatched` is intentionally conservative and does not claim product uniqueness.

### Azure DevOps: 112 methods

<details>
<summary><strong>Annotated Tags</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.annotatedTagsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/annotatedtags` | `P:tag.create-delete.v1` | Create an annotated tag. Repositories have both a name and an identifier. Identifiers are globally unique, but several projects may contain a repository of the same name. You don't need to include the project if you specify a repository by… |
| `AzureDevOpsRestClient.annotatedTagsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/annotatedtags/{objectId}` | `P:tag.list-get.v1` | Get an annotated tag. Repositories have both a name and an identifier. Identifiers are globally unique, but several projects may contain a repository of the same name. You don't need to include the project if you specify a repository by ID… |

</details>

<details>
<summary><strong>Blobs</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.blobsGetBlob` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/blobs/{sha1}` | `E:git.blob.read.v1` | Get a single blob. Repositories have both a name and an identifier. Identifiers are globally unique, but several projects may contain a repository of the same name. You don't need to include the project if you specify a repository by ID. H… |
| `AzureDevOpsRestClient.blobsGetBlobsZip` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/blobs` | Unmatched | Gets one or more blobs in a zip file download. |

</details>

<details>
<summary><strong>Cherry Picks</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.cherryPicksCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/cherryPicks` | Unmatched | Cherry pick a specific commit or commits that are associated to a pull request into a new branch. |
| `AzureDevOpsRestClient.cherryPicksGetCherryPick` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/cherryPicks/{cherryPickId}` | Unmatched | Retrieve information about a cherry pick operation by cherry pick Id. |
| `AzureDevOpsRestClient.cherryPicksGetCherryPickForRefName` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/cherryPicks` | Unmatched | Retrieve information about a cherry pick operation for a specific branch. This operation is expensive due to the underlying object structure, so this API only looks at the 1000 most recent cherry pick operations. |

</details>

<details>
<summary><strong>Commits</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.commitsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/commits/{commitId}` | `E:commit.get.v1` | Retrieve a particular commit. |
| `AzureDevOpsRestClient.commitsGetChanges` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/commits/{commitId}/changes` | Unmatched | Retrieve changes for a particular commit. |
| `AzureDevOpsRestClient.commitsGetCommits` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/commits` | `E:commit.list.v1` | Retrieve git commits for a project Parameters that use the searchCriteria prefix in their name can be specified without it as query parameters, e.g. searchCriteria.$top -> $top |
| `AzureDevOpsRestClient.commitsGetCommitsBatch` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/commitsbatch` | `E:commit.list.v1` | Retrieve git commits for a project matching the search criteria |
| `AzureDevOpsRestClient.commitsGetPushCommits` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/commits` | Unmatched | Retrieve a list of commits associated with a particular push. |

</details>

<details>
<summary><strong>Diffs</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.diffsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/diffs/commits` | `E:commit.compare.v1` | Find the closest common commit (the merge base) between base and target commits, and get the diff between either the base and target commits or common and target commits. |

</details>

<details>
<summary><strong>Forks</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.forksCreateForkSyncRequest` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryNameOrId}/forkSyncRequests` | Unmatched | Request that another repository's refs be fetched into this one. It syncs two existing forks. To create a fork, please see the <a href="https://docs.microsoft.com/en-us/rest/api/vsts/git/repositories/create?view=azure-devops-rest-5.1"> rep… |
| `AzureDevOpsRestClient.forksGetForkSyncRequest` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryNameOrId}/forkSyncRequests/{forkSyncOperationId}` | Unmatched | Get a specific fork sync operation's details. |
| `AzureDevOpsRestClient.forksGetForkSyncRequests` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryNameOrId}/forkSyncRequests` | Unmatched | Retrieve all requested fork sync operations on this repository. |
| `AzureDevOpsRestClient.forksList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryNameOrId}/forks/{collectionId}` | `E:repository.fork.list.v1` | Retrieve all forks of a repository in the collection. |

</details>

<details>
<summary><strong>Import Requests</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.importRequestsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/importRequests` | Unmatched | Create an import request. |
| `AzureDevOpsRestClient.importRequestsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/importRequests/{importRequestId}` | Unmatched | Retrieve a particular import request. |
| `AzureDevOpsRestClient.importRequestsQuery` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/importRequests` | Unmatched | Retrieve import requests for a repository. |
| `AzureDevOpsRestClient.importRequestsUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/importRequests/{importRequestId}` | Unmatched | Retry or abandon a failed import request. There can only be one active import request associated with a repository. Marking a failed import request abandoned makes it inactive. |

</details>

<details>
<summary><strong>Items</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.itemsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/items` | `E:content.read.v1` | Get Item Metadata and/or Content for a single item. The download parameter is to indicate whether the content should be available as a download or just sent as a stream in the response. Doesn't apply to zipped content, which is always retu… |
| `AzureDevOpsRestClient.itemsGetItemsBatch` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/itemsbatch` | `E:content.read.v1` | Retrieves a batch of items in a repo / project for a given list of paths or a long path |
| `AzureDevOpsRestClient.itemsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/items` | `E:content.read.v1` | Get Item Metadata and/or Content for a collection of items. The download parameter is to indicate whether the content should be available as a download or just sent as a stream in the response. Doesn't apply to zipped content which is alwa… |

</details>

<details>
<summary><strong>Merge Bases</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.mergeBasesList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryNameOrId}/commits/{commitId}/mergebases` | Unmatched | Find the merge bases of two commits, optionally across forks. If otherRepositoryId is not specified, the merge bases will only be calculated within the context of the local repositoryNameOrId. |

</details>

<details>
<summary><strong>Merges</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.mergesCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryNameOrId}/merges` | Unmatched | Request a git merge operation. Currently we support merging only 2 commits. |
| `AzureDevOpsRestClient.mergesGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryNameOrId}/merges/{mergeOperationId}` | Unmatched | Get a specific merge operation's details. |

</details>

<details>
<summary><strong>Policy Configurations</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.policyConfigurationsGet` | `GET` | `/{organization}/{project}/_apis/git/policy/configurations` | `P:branch.protection.read.v1` | Retrieve a list of policy configurations by a given set of scope/filtering criteria. Azure Repos uses two types of policies to protect your code: **Repository policies (push policies)** check every push to your repository. They validate th… |

</details>

<details>
<summary><strong>Pull Request Attachments</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestAttachmentsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/attachments/{fileName}` | Unmatched | Attach a new file to a pull request. |
| `AzureDevOpsRestClient.pullRequestAttachmentsDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/attachments/{fileName}` | Unmatched | Delete a pull request attachment. |
| `AzureDevOpsRestClient.pullRequestAttachmentsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/attachments/{fileName}` | Unmatched | Get the file content of a pull request attachment. |
| `AzureDevOpsRestClient.pullRequestAttachmentsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/attachments` | Unmatched | Get a list of files attached to a given pull request. |

</details>

<details>
<summary><strong>Pull Request Comment Likes</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestCommentLikesCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments/{commentId}/likes` | Unmatched | Add a like on a comment. |
| `AzureDevOpsRestClient.pullRequestCommentLikesDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments/{commentId}/likes` | Unmatched | Delete a like on a comment. |
| `AzureDevOpsRestClient.pullRequestCommentLikesList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments/{commentId}/likes` | Unmatched | Get likes for a comment. |

</details>

<details>
<summary><strong>Pull Request Commits</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestCommitsGetPullRequestCommits` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/commits` | `P:pull-request.changes.v1` | Get the commits for the specified pull request. |
| `AzureDevOpsRestClient.pullRequestCommitsGetPullRequestIterationCommits` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/commits` | Unmatched | Get the commits for the specified iteration of a pull request. |

</details>

<details>
<summary><strong>Pull Request Iteration Changes</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestIterationChangesGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/changes` | `P:pull-request.changes.v1`<br>`U:azure.pr-iterations` | Retrieve the changes made in a pull request between two iterations. |

</details>

<details>
<summary><strong>Pull Request Iteration Statuses</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestIterationStatusesCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/statuses` | Unmatched | Create a pull request status on the iteration. This operation will have the same result as Create status on pull request with specified iteration ID in the request body. The only required field for the status is `Context.Name` that uniquel… |
| `AzureDevOpsRestClient.pullRequestIterationStatusesDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/statuses/{statusId}` | Unmatched | Delete pull request iteration status. You can remove multiple statuses in one call by using Update operation. |
| `AzureDevOpsRestClient.pullRequestIterationStatusesGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/statuses/{statusId}` | Unmatched | Get the specific pull request iteration status by ID. The status ID is unique within the pull request across all iterations. |
| `AzureDevOpsRestClient.pullRequestIterationStatusesList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/statuses` | Unmatched | Get all the statuses associated with a pull request iteration. |
| `AzureDevOpsRestClient.pullRequestIterationStatusesUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/statuses` | Unmatched | Update pull request iteration statuses collection. The only supported operation type is `remove`. This operation allows to delete multiple statuses in one call. The path of the `remove` operation should refer to the ID of the pull request… |

</details>

<details>
<summary><strong>Pull Request Iterations</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestIterationsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}` | Unmatched | Get the specified iteration for a pull request. |
| `AzureDevOpsRestClient.pullRequestIterationsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations` | `U:azure.pr-iterations` | Get the list of iterations for the specified pull request. |

</details>

<details>
<summary><strong>Pull Request Labels</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestLabelsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/labels` | Unmatched | Create a tag (if that does not exists yet) and add that as a label (tag) for a specified pull request. The only required field is the name of the new label (tag). |
| `AzureDevOpsRestClient.pullRequestLabelsDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/labels/{labelIdOrName}` | Unmatched | Removes a label (tag) from the set of those assigned to the pull request. The tag itself will not be deleted. |
| `AzureDevOpsRestClient.pullRequestLabelsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/labels/{labelIdOrName}` | Unmatched | Retrieves a single label (tag) that has been assigned to a pull request. |
| `AzureDevOpsRestClient.pullRequestLabelsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/labels` | Unmatched | Get all the labels (tags) assigned to a pull request. |

</details>

<details>
<summary><strong>Pull Request Properties</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestPropertiesList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/properties` | Unmatched | Get external properties of the pull request. |
| `AzureDevOpsRestClient.pullRequestPropertiesUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/properties` | Unmatched | Create or update pull request external properties. The patch operation can be `add`, `replace` or `remove`. For `add` operation, the path can be empty. If the path is empty, the value must be a list of key value pairs. For `replace` operat… |

</details>

<details>
<summary><strong>Pull Request Query</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestQueryGet` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullrequestquery` | Unmatched | This API is used to find what pull requests are related to a given commit. It can be used to either find the pull request that created a particular merge commit or it can be used to find all pull requests that have ever merged a particular… |

</details>

<details>
<summary><strong>Pull Request Reviewers</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestReviewersCreatePullRequestReviewer` | `PUT` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers/{reviewerId}` | `E:pull-request.reviewers.v1` | Add a reviewer to a pull request or cast a vote. |
| `AzureDevOpsRestClient.pullRequestReviewersCreatePullRequestReviewers` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers` | Unmatched | Add reviewers to a pull request. |
| `AzureDevOpsRestClient.pullRequestReviewersCreateUnmaterializedPullRequestReviewer` | `PUT` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers` | Unmatched | Add an unmaterialized identity to the reviewers of a pull request. |
| `AzureDevOpsRestClient.pullRequestReviewersDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers/{reviewerId}` | `E:pull-request.reviewers.v1` | Remove a reviewer from a pull request. |
| `AzureDevOpsRestClient.pullRequestReviewersGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers/{reviewerId}` | Unmatched | Retrieve information about a particular reviewer on a pull request |
| `AzureDevOpsRestClient.pullRequestReviewersList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers` | `E:pull-request.reviewers.v1` | Retrieve the reviewers for a pull request |
| `AzureDevOpsRestClient.pullRequestReviewersUpdatePullRequestReviewer` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers/{reviewerId}` | `P:pull-request.review.v1` | Edit a reviewer entry. These fields are patchable: isFlagged, hasDeclined |
| `AzureDevOpsRestClient.pullRequestReviewersUpdatePullRequestReviewers` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/reviewers` | Unmatched | Reset the votes of multiple reviewers on a pull request. NOTE: This endpoint only supports updating votes, but does not support updating required reviewers (use policy) or display names. |

</details>

<details>
<summary><strong>Pull Request Share</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestShareSharePullRequest` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/share` | Unmatched | Sends an e-mail notification about a specific pull request to a set of recipients |

</details>

<details>
<summary><strong>Pull Request Statuses</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestStatusesCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/statuses` | Unmatched | Create a pull request status. The only required field for the status is `Context.Name` that uniquely identifies the status. Note that you can specify iterationId in the request body to post the status on the iteration. |
| `AzureDevOpsRestClient.pullRequestStatusesDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/statuses/{statusId}` | Unmatched | Delete pull request status. You can remove multiple statuses in one call by using Update operation. |
| `AzureDevOpsRestClient.pullRequestStatusesGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/statuses/{statusId}` | Unmatched | Get the specific pull request status by ID. The status ID is unique within the pull request across all iterations. |
| `AzureDevOpsRestClient.pullRequestStatusesList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/statuses` | Unmatched | Get all the statuses associated with a pull request. |
| `AzureDevOpsRestClient.pullRequestStatusesUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/statuses` | Unmatched | Update pull request statuses collection. The only supported operation type is `remove`. This operation allows to delete multiple statuses in one call. The path of the `remove` operation should refer to the ID of the pull request status. Fo… |

</details>

<details>
<summary><strong>Pull Request Thread Comments</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestThreadCommentsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments` | `P:pull-request.comments.v1` | Create a comment on a specific thread in a pull request (up to 500 comments can be created per thread). |
| `AzureDevOpsRestClient.pullRequestThreadCommentsDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments/{commentId}` | `P:pull-request.comments.v1` | Delete a comment associated with a specific thread in a pull request. |
| `AzureDevOpsRestClient.pullRequestThreadCommentsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments/{commentId}` | Unmatched | Retrieve a comment associated with a specific thread in a pull request. |
| `AzureDevOpsRestClient.pullRequestThreadCommentsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments` | Unmatched | Retrieve all comments associated with a specific thread in a pull request. |
| `AzureDevOpsRestClient.pullRequestThreadCommentsUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}/comments/{commentId}` | `P:pull-request.comments.v1` | Update a comment associated with a specific thread in a pull request. |

</details>

<details>
<summary><strong>Pull Request Threads</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestThreadsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads` | `P:pull-request.comments.v1` | Create a thread in a pull request. |
| `AzureDevOpsRestClient.pullRequestThreadsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}` | Unmatched | Retrieve a thread in a pull request. |
| `AzureDevOpsRestClient.pullRequestThreadsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads` | `P:pull-request.comments.v1` | Retrieve all threads in a pull request. |
| `AzureDevOpsRestClient.pullRequestThreadsUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/threads/{threadId}` | Unmatched | Update a thread in a pull request. |

</details>

<details>
<summary><strong>Pull Request Work Items</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestWorkItemsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullRequests/{pullRequestId}/workitems` | `U:azure.pr-iterations` | Retrieve a list of work items associated with a pull request. |

</details>

<details>
<summary><strong>Pull Requests</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pullRequestsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullrequests` | `E:pull-request.core.v1` | Create a pull request. |
| `AzureDevOpsRestClient.pullRequestsGetPullRequest` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}` | `E:pull-request.core.v1` | Retrieve a pull request. |
| `AzureDevOpsRestClient.pullRequestsGetPullRequestById` | `GET` | `/{organization}/{project}/_apis/git/pullrequests/{pullRequestId}` | Unmatched | Retrieve a pull request. |
| `AzureDevOpsRestClient.pullRequestsGetPullRequests` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullrequests` | `E:pull-request.core.v1` | Retrieve all pull requests matching a specified criteria. Please note that description field will be truncated up to 400 symbols in the result. |
| `AzureDevOpsRestClient.pullRequestsGetPullRequestsByProject` | `GET` | `/{organization}/{project}/_apis/git/pullrequests` | Unmatched | Retrieve all pull requests matching a specified criteria. Please note that description field will be truncated up to 400 symbols in the result. |
| `AzureDevOpsRestClient.pullRequestsUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pullrequests/{pullRequestId}` | `E:pull-request.core.v1`<br>`P:pull-request.merge.v1` | Update a pull request These are the properties that can be updated with the API: - Status - Title - Description (up to 4000 characters) - CompletionOptions - MergeOptions - AutoCompleteSetBy.Id - TargetRefName (when the PR retargeting feat… |

</details>

<details>
<summary><strong>Pushes</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.pushesCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pushes` | `P:content.write.v1` | Push changes to the repository. |
| `AzureDevOpsRestClient.pushesGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pushes/{pushId}` | Unmatched | Retrieves a particular push. |
| `AzureDevOpsRestClient.pushesList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/pushes` | Unmatched | Retrieves pushes associated with the specified repository. |

</details>

<details>
<summary><strong>Refs</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.refsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/refs` | `P:branch.get.v1`<br>`P:branch.list.v1`<br>`E:git.ref.read.v1`<br>`P:tag.list-get.v1` | Queries the provided repository for its refs and returns them. |
| `AzureDevOpsRestClient.refsUpdateRef` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/refs` | `U:azure.ref-lock` | Lock or Unlock a branch. |
| `AzureDevOpsRestClient.refsUpdateRefs` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/refs` | `P:branch.create.v1`<br>`P:branch.delete.v1`<br>`P:tag.create-delete.v1` | Creating, updating, or deleting refs(branches). Updating a ref means making it point at a different commit than it used to. You must specify both the old and new commit to avoid race conditions. |

</details>

<details>
<summary><strong>Refs Favorites</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.refsFavoritesCreate` | `POST` | `/{organization}/{project}/_apis/git/favorites/refs` | Unmatched | Creates a ref favorite |
| `AzureDevOpsRestClient.refsFavoritesDelete` | `DELETE` | `/{organization}/{project}/_apis/git/favorites/refs/{favoriteId}` | Unmatched | Deletes the refs favorite specified |
| `AzureDevOpsRestClient.refsFavoritesGet` | `GET` | `/{organization}/{project}/_apis/git/favorites/refs/{favoriteId}` | Unmatched | Gets the refs favorite for a favorite Id. |
| `AzureDevOpsRestClient.refsFavoritesList` | `GET` | `/{organization}/{project}/_apis/git/favorites/refs` | Unmatched | Gets the refs favorites for a repo and an identity. |

</details>

<details>
<summary><strong>Refs Favorites For Project</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.refsFavoritesForProjectList` | `GET` | `/{organization}/{project}/_apis/git/favorites/refsForProject` | Unmatched |  |

</details>

<details>
<summary><strong>Repositories</strong> (10)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.repositoriesCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories` | `E:repository.create.v1`<br>`P:repository.fork.create.v1` | Create a git repository in a team project. |
| `AzureDevOpsRestClient.repositoriesDelete` | `DELETE` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}` | `P:repository.delete.v1` | Delete a git repository |
| `AzureDevOpsRestClient.repositoriesDeleteRepositoryFromRecycleBin` | `DELETE` | `/{organization}/{project}/_apis/git/recycleBin/repositories/{repositoryId}` | `P:repository.delete.v1`<br>`U:azure.recycle-bin` | Destroy (hard delete) a soft-deleted Git repository. |
| `AzureDevOpsRestClient.repositoriesGetDeletedRepositories` | `GET` | `/{organization}/{project}/_apis/git/deletedrepositories` | `U:azure.recycle-bin` | Retrieve deleted git repositories. |
| `AzureDevOpsRestClient.repositoriesGetRecycleBinRepositories` | `GET` | `/{organization}/{project}/_apis/git/recycleBin/repositories` | `U:azure.recycle-bin` | Retrieve soft-deleted git repositories from the recycle bin. |
| `AzureDevOpsRestClient.repositoriesGetRepository` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}` | `E:repository.get.v1` | Retrieve a git repository. |
| `AzureDevOpsRestClient.repositoriesGetRepositoryWithParent` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}` | Unmatched | Retrieve a git repository. |
| `AzureDevOpsRestClient.repositoriesList` | `GET` | `/{organization}/{project}/_apis/git/repositories` | `E:repository.list.v1` | Retrieve git repositories. |
| `AzureDevOpsRestClient.repositoriesRestoreRepositoryFromRecycleBin` | `PATCH` | `/{organization}/{project}/_apis/git/recycleBin/repositories/{repositoryId}` | `U:azure.recycle-bin` | Recover a soft-deleted Git repository. Recently deleted repositories go into a soft-delete state for a period of time before they are hard deleted and become unrecoverable. |
| `AzureDevOpsRestClient.repositoriesUpdate` | `PATCH` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}` | `P:repository.update.v1` | Updates the Git repository with either a new repo name or a new default branch. |

</details>

<details>
<summary><strong>Reverts</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.revertsCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/reverts` | Unmatched | Starts the operation to create a new branch which reverts changes introduced by either a specific commit or commits that are associated to a pull request. |
| `AzureDevOpsRestClient.revertsGetRevert` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/reverts/{revertId}` | Unmatched | Retrieve information about a revert operation by revert Id. |
| `AzureDevOpsRestClient.revertsGetRevertForRefName` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/reverts` | Unmatched | Retrieve information about a revert operation for a specific branch. |

</details>

<details>
<summary><strong>Stats</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.statsGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/stats/branches` | `P:branch.get.v1` | Retrieve statistics about a single branch. |
| `AzureDevOpsRestClient.statsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/stats/branches` | Unmatched | Retrieve statistics about all branches within a repository. |

</details>

<details>
<summary><strong>Statuses</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.statusesCreate` | `POST` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/commits/{commitId}/statuses` | `E:commit-status.v1` | Create Git commit status. |
| `AzureDevOpsRestClient.statusesList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/commits/{commitId}/statuses` | `E:commit-status.v1` | Get statuses associated with the Git commit. |

</details>

<details>
<summary><strong>Suggestions</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.suggestionsList` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/suggestions` | Unmatched | Retrieve a pull request suggestion for a particular repository or team project. |

</details>

<details>
<summary><strong>Trees</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `AzureDevOpsRestClient.treesGet` | `GET` | `/{organization}/{project}/_apis/git/repositories/{repositoryId}/trees/{sha1}` | `E:git.tree.read.v1` | The Tree endpoint returns the collection of objects underneath the specified tree. Trees are folders in a Git repository. Repositories have both a name and an identifier. Identifiers are globally unique, but several projects may contain a… |

</details>

### Bitbucket: 297 methods

<details>
<summary><strong>Addon</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteAddon` | `DELETE` | `/addon` | `U:bitbucket.connect` | Delete an app |
| `BitbucketRestClient.getAddonAddonKeyClientKey` | `GET` | `/addon/{addon_key}/client-key` | `U:bitbucket.connect` | Get the client key of a Connect addon |
| `BitbucketRestClient.putAddon` | `PUT` | `/addon` | `U:bitbucket.connect` | Update an installed app |

</details>

<details>
<summary><strong>Branch restrictions</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugBranchRestrictionsId` | `DELETE` | `/repositories/{workspace}/{repo_slug}/branch-restrictions/{id}` | `P:branch.protection.write.v1` | Delete a branch restriction rule |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugBranchRestrictions` | `GET` | `/repositories/{workspace}/{repo_slug}/branch-restrictions` | `P:branch.protection.read.v1` | List branch restrictions |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugBranchRestrictionsId` | `GET` | `/repositories/{workspace}/{repo_slug}/branch-restrictions/{id}` | `P:branch.protection.read.v1` | Get a branch restriction rule |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugBranchRestrictions` | `POST` | `/repositories/{workspace}/{repo_slug}/branch-restrictions` | `P:branch.protection.write.v1` | Create a branch restriction rule |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugBranchRestrictionsId` | `PUT` | `/repositories/{workspace}/{repo_slug}/branch-restrictions/{id}` | `P:branch.protection.write.v1` | Update a branch restriction rule |

</details>

<details>
<summary><strong>Branching model</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugBranchingModel` | `GET` | `/repositories/{workspace}/{repo_slug}/branching-model` | Unmatched | Get the branching model for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugBranchingModelSettings` | `GET` | `/repositories/{workspace}/{repo_slug}/branching-model/settings` | Unmatched | Get the branching model config for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugEffectiveBranchingModel` | `GET` | `/repositories/{workspace}/{repo_slug}/effective-branching-model` | Unmatched | Get the effective, or currently applied, branching model for a repository |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyBranchingModel` | `GET` | `/workspaces/{workspace}/projects/{project_key}/branching-model` | Unmatched | Get the branching model for a project |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyBranchingModelSettings` | `GET` | `/workspaces/{workspace}/projects/{project_key}/branching-model/settings` | Unmatched | Get the branching model config for a project |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugBranchingModelSettings` | `PUT` | `/repositories/{workspace}/{repo_slug}/branching-model/settings` | Unmatched | Update the branching model config for a repository |
| `BitbucketRestClient.putWorkspacesWorkspaceProjectsProjectKeyBranchingModelSettings` | `PUT` | `/workspaces/{workspace}/projects/{project_key}/branching-model/settings` | Unmatched | Update the branching model config for a project |

</details>

<details>
<summary><strong>Commit statuses</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitCommitStatuses` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/statuses` | `E:commit-status.v1` | List commit statuses for a commit |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuildKey` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/statuses/build/{key}` | Unmatched | Get a build status for a commit |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdStatuses` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/statuses` | Unmatched | List commit statuses for a pull request |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuild` | `POST` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/statuses/build` | `E:commit-status.v1` | Create a build status for a commit |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuildKey` | `PUT` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/statuses/build/{key}` | `E:commit-status.v1` | Update a build status for a commit |

</details>

<details>
<summary><strong>Commits</strong> (26)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.bulkCreateOrUpdateAnnotations` | `POST` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}/annotations` | `U:bitbucket.code-insights` | Bulk create or update annotations |
| `BitbucketRestClient.createOrUpdateAnnotation` | `PUT` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}/annotations/{annotationId}` | Unmatched | Create or update an annotation |
| `BitbucketRestClient.createOrUpdateReport` | `PUT` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}` | `U:bitbucket.code-insights` | Create or update a report |
| `BitbucketRestClient.deleteAnnotation` | `DELETE` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}/annotations/{annotationId}` | Unmatched | Delete an annotation |
| `BitbucketRestClient.deleteReport` | `DELETE` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}` | Unmatched | Delete a report |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugCommitCommitApprove` | `DELETE` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/approve` | Unmatched | Unapprove a commit |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugCommitCommitCommentsCommentId` | `DELETE` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/comments/{comment_id}` | Unmatched | Delete a commit comment |
| `BitbucketRestClient.getAnnotation` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}/annotations/{annotationId}` | Unmatched | Get an annotation |
| `BitbucketRestClient.getAnnotationsForReport` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}/annotations` | `U:bitbucket.code-insights` | List annotations |
| `BitbucketRestClient.getReport` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{reportId}` | Unmatched | Get a report |
| `BitbucketRestClient.getReportsForCommit` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/reports` | `U:bitbucket.code-insights` | List reports |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitCommit` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}` | `E:commit.get.v1` | Get a commit |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitCommitComments` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/comments` | Unmatched | List a commit's comments |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitCommitCommentsCommentId` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/comments/{comment_id}` | Unmatched | Get a commit comment |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommits` | `GET` | `/repositories/{workspace}/{repo_slug}/commits` | `E:commit.list.v1` | List commits |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugCommitsRevision` | `GET` | `/repositories/{workspace}/{repo_slug}/commits/{revision}` | `E:commit.list.v1` | List commits for revision |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDiffSpec` | `GET` | `/repositories/{workspace}/{repo_slug}/diff/{spec}` | `P:commit.compare.v1` | Compare two commits |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDiffstatSpec` | `GET` | `/repositories/{workspace}/{repo_slug}/diffstat/{spec}` | `P:commit.compare.v1` | Compare two commit diff stats |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugFileConflictsSpec` | `GET` | `/repositories/{workspace}/{repo_slug}/file-conflicts/{spec}` | Unmatched | Get file conflicts for a commit spec |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugMergeBaseRevspec` | `GET` | `/repositories/{workspace}/{repo_slug}/merge-base/{revspec}` | Unmatched | Get the common ancestor between two commits |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPatchSpec` | `GET` | `/repositories/{workspace}/{repo_slug}/patch/{spec}` | Unmatched | Get a patch for two commits |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugCommitCommitApprove` | `POST` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/approve` | Unmatched | Approve a commit |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugCommitCommitComments` | `POST` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/comments` | Unmatched | Create comment for a commit |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugCommits` | `POST` | `/repositories/{workspace}/{repo_slug}/commits` | Unmatched | List commits with include/exclude |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugCommitsRevision` | `POST` | `/repositories/{workspace}/{repo_slug}/commits/{revision}` | Unmatched | List commits for revision using include/exclude |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugCommitCommitCommentsCommentId` | `PUT` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/comments/{comment_id}` | Unmatched | Update a commit comment |

</details>

<details>
<summary><strong>Deployments</strong> (16)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.createEnvironment` | `POST` | `/repositories/{workspace}/{repo_slug}/environments` | `P:deployment.environment.v1` | Create an environment |
| `BitbucketRestClient.deleteEnvironmentForRepository` | `DELETE` | `/repositories/{workspace}/{repo_slug}/environments/{environment_uuid}` | Unmatched | Delete an environment |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugDeployKeysKeyId` | `DELETE` | `/repositories/{workspace}/{repo_slug}/deploy-keys/{key_id}` | `P:deploy-key.crud.v1` | Delete a repository deploy key |
| `BitbucketRestClient.deleteWorkspacesWorkspaceProjectsProjectKeyDeployKeysKeyId` | `DELETE` | `/workspaces/{workspace}/projects/{project_key}/deploy-keys/{key_id}` | Unmatched | Delete a deploy key from a project |
| `BitbucketRestClient.getDeploymentForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/deployments/{deployment_uuid}` | `P:deployment.environment.v1` | Get a deployment |
| `BitbucketRestClient.getDeploymentsForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/deployments` | `P:deployment.environment.v1` | List deployments |
| `BitbucketRestClient.getEnvironmentForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/environments/{environment_uuid}` | `P:deployment.environment.v1` | Get an environment |
| `BitbucketRestClient.getEnvironmentsForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/environments` | `P:deployment.environment.v1` | List environments |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDeployKeys` | `GET` | `/repositories/{workspace}/{repo_slug}/deploy-keys` | `P:deploy-key.crud.v1` | List repository deploy keys |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDeployKeysKeyId` | `GET` | `/repositories/{workspace}/{repo_slug}/deploy-keys/{key_id}` | `P:deploy-key.crud.v1` | Get a repository deploy key |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyDeployKeys` | `GET` | `/workspaces/{workspace}/projects/{project_key}/deploy-keys` | Unmatched | List project deploy keys |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyDeployKeysKeyId` | `GET` | `/workspaces/{workspace}/projects/{project_key}/deploy-keys/{key_id}` | Unmatched | Get a project deploy key |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugDeployKeys` | `POST` | `/repositories/{workspace}/{repo_slug}/deploy-keys` | `P:deploy-key.crud.v1` | Add a repository deploy key |
| `BitbucketRestClient.postWorkspacesWorkspaceProjectsProjectKeyDeployKeys` | `POST` | `/workspaces/{workspace}/projects/{project_key}/deploy-keys` | Unmatched | Create a project deploy key |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugDeployKeysKeyId` | `PUT` | `/repositories/{workspace}/{repo_slug}/deploy-keys/{key_id}` | `P:deploy-key.crud.v1` | Update a repository deploy key |
| `BitbucketRestClient.updateEnvironmentForRepository` | `POST` | `/repositories/{workspace}/{repo_slug}/environments/{environment_uuid}/changes` | `P:deployment.environment.v1` | Update an environment |

</details>

<details>
<summary><strong>Downloads</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugDownloadsFilename` | `DELETE` | `/repositories/{workspace}/{repo_slug}/downloads/{filename}` | Unmatched | Delete a download artifact |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDownloads` | `GET` | `/repositories/{workspace}/{repo_slug}/downloads` | Unmatched | List download artifacts |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDownloadsFilename` | `GET` | `/repositories/{workspace}/{repo_slug}/downloads/{filename}` | Unmatched | Get a download artifact link |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugDownloads` | `POST` | `/repositories/{workspace}/{repo_slug}/downloads` | Unmatched | Upload a download artifact |

</details>

<details>
<summary><strong>GPG</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteUsersSelectedUserGpgKeysFingerprint` | `DELETE` | `/users/{selected_user}/gpg-keys/{fingerprint}` | Unmatched | Delete a GPG key |
| `BitbucketRestClient.getUsersSelectedUserGpgKeys` | `GET` | `/users/{selected_user}/gpg-keys` | Unmatched | List GPG keys |
| `BitbucketRestClient.getUsersSelectedUserGpgKeysFingerprint` | `GET` | `/users/{selected_user}/gpg-keys/{fingerprint}` | Unmatched | Get a GPG key |
| `BitbucketRestClient.postUsersSelectedUserGpgKeys` | `POST` | `/users/{selected_user}/gpg-keys` | Unmatched | Add a new GPG key |

</details>

<details>
<summary><strong>Pipelines</strong> (68)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.createDeploymentVariable` | `POST` | `/repositories/{workspace}/{repo_slug}/deployments_config/environments/{environment_uuid}/variables` | Unmatched | Create a variable for an environment |
| `BitbucketRestClient.createPipelineForRepository` | `POST` | `/repositories/{workspace}/{repo_slug}/pipelines` | `P:ci.run.v1` | Run a pipeline |
| `BitbucketRestClient.createPipelineVariableForTeam` | `POST` | `/teams/{username}/pipelines_config/variables` | Unmatched | [Deprecated] Create a variable for a user |
| `BitbucketRestClient.createPipelineVariableForUser` | `POST` | `/users/{selected_user}/pipelines_config/variables` | Unmatched | [Deprecated] Create a variable for a user |
| `BitbucketRestClient.createPipelineVariableForWorkspace` | `POST` | `/workspaces/{workspace}/pipelines-config/variables` | Unmatched | Create a variable for a workspace |
| `BitbucketRestClient.createRepositoryPipelineKnownHost` | `POST` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/known_hosts` | `U:bitbucket.pipeline-ssh-oidc` | Create a known host |
| `BitbucketRestClient.createRepositoryPipelineSchedule` | `POST` | `/repositories/{workspace}/{repo_slug}/pipelines_config/schedules` | Unmatched | Create a schedule |
| `BitbucketRestClient.createRepositoryPipelineVariable` | `POST` | `/repositories/{workspace}/{repo_slug}/pipelines_config/variables` | Unmatched | Create a variable for a repository |
| `BitbucketRestClient.createRepositoryRunner` | `POST` | `/repositories/{workspace}/{repo_slug}/pipelines-config/runners` | `P:ci.runners.v1` | Create repository runner |
| `BitbucketRestClient.createWorkspaceRunner` | `POST` | `/workspaces/{workspace}/pipelines-config/runners` | `P:ci.runners.v1` | Create workspace runner |
| `BitbucketRestClient.deleteDeploymentVariable` | `DELETE` | `/repositories/{workspace}/{repo_slug}/deployments_config/environments/{environment_uuid}/variables/{variable_uuid}` | Unmatched | Delete a variable for an environment |
| `BitbucketRestClient.deletePipelineVariableForTeam` | `DELETE` | `/teams/{username}/pipelines_config/variables/{variable_uuid}` | Unmatched | [Deprecated] Delete a variable for a team |
| `BitbucketRestClient.deletePipelineVariableForUser` | `DELETE` | `/users/{selected_user}/pipelines_config/variables/{variable_uuid}` | Unmatched | [Deprecated] Delete a variable for a user |
| `BitbucketRestClient.deletePipelineVariableForWorkspace` | `DELETE` | `/workspaces/{workspace}/pipelines-config/variables/{variable_uuid}` | Unmatched | Delete a variable for a workspace |
| `BitbucketRestClient.deleteRepositoryPipelineCache` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pipelines-config/caches/{cache_uuid}` | Unmatched | Delete a cache |
| `BitbucketRestClient.deleteRepositoryPipelineCaches` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pipelines-config/caches` | Unmatched | Delete caches |
| `BitbucketRestClient.deleteRepositoryPipelineKeyPair` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/key_pair` | Unmatched | Delete SSH key pair |
| `BitbucketRestClient.deleteRepositoryPipelineKnownHost` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/known_hosts/{known_host_uuid}` | Unmatched | Delete a known host |
| `BitbucketRestClient.deleteRepositoryPipelineSchedule` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pipelines_config/schedules/{schedule_uuid}` | Unmatched | Delete a schedule |
| `BitbucketRestClient.deleteRepositoryPipelineVariable` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pipelines_config/variables/{variable_uuid}` | Unmatched | Delete a variable for a repository |
| `BitbucketRestClient.deleteRepositoryRunner` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pipelines-config/runners/{runner_uuid}` | `P:ci.runners.v1` | Delete repository runner |
| `BitbucketRestClient.deleteWorkspaceRunner` | `DELETE` | `/workspaces/{workspace}/pipelines-config/runners/{runner_uuid}` | Unmatched | Delete workspace runner |
| `BitbucketRestClient.getDeploymentVariables` | `GET` | `/repositories/{workspace}/{repo_slug}/deployments_config/environments/{environment_uuid}/variables` | Unmatched | List variables for an environment |
| `BitbucketRestClient.getOidcConfiguration` | `GET` | `/workspaces/{workspace}/pipelines-config/identity/oidc/.well-known/openid-configuration` | `U:bitbucket.pipeline-ssh-oidc` | Get OpenID configuration for OIDC in Pipelines |
| `BitbucketRestClient.getOidcKeys` | `GET` | `/workspaces/{workspace}/pipelines-config/identity/oidc/keys.json` | `U:bitbucket.pipeline-ssh-oidc` | Get keys for OIDC in Pipelines |
| `BitbucketRestClient.getPipelineContainerLog` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/steps/{step_uuid}/logs/{log_uuid}` | `P:ci.jobs-logs.v1` | Get the logs for the build container or a service container for a given step of a pipeline. |
| `BitbucketRestClient.getPipelineForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}` | `P:ci.run.v1` | Get a pipeline |
| `BitbucketRestClient.getPipelineStepForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/steps/{step_uuid}` | `P:ci.jobs-logs.v1` | Get a step of a pipeline |
| `BitbucketRestClient.getPipelineStepLogForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/steps/{step_uuid}/log` | `P:ci.jobs-logs.v1` | Get log file for a step |
| `BitbucketRestClient.getPipelineStepsForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/steps` | `P:ci.jobs-logs.v1` | List steps for a pipeline |
| `BitbucketRestClient.getPipelineTestReportTestCaseReasons` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/steps/{step_uuid}/test_reports/test_cases/{test_case_uuid}/test_case_reasons` | Unmatched | Get test case reasons (output) for a given test case in a step of a pipeline. |
| `BitbucketRestClient.getPipelineTestReportTestCases` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/steps/{step_uuid}/test_reports/test_cases` | Unmatched | Get test cases for a given step of a pipeline. |
| `BitbucketRestClient.getPipelineTestReports` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/steps/{step_uuid}/test_reports` | Unmatched | Get a summary of test reports for a given step of a pipeline. |
| `BitbucketRestClient.getPipelineVariableForTeam` | `GET` | `/teams/{username}/pipelines_config/variables/{variable_uuid}` | Unmatched | [Deprecated] Get a variable for a team |
| `BitbucketRestClient.getPipelineVariableForUser` | `GET` | `/users/{selected_user}/pipelines_config/variables/{variable_uuid}` | Unmatched | [Deprecated] Get a variable for a user |
| `BitbucketRestClient.getPipelineVariableForWorkspace` | `GET` | `/workspaces/{workspace}/pipelines-config/variables/{variable_uuid}` | Unmatched | Get variable for a workspace |
| `BitbucketRestClient.getPipelineVariablesForTeam` | `GET` | `/teams/{username}/pipelines_config/variables` | Unmatched | [Deprecated] List variables for an account |
| `BitbucketRestClient.getPipelineVariablesForUser` | `GET` | `/users/{selected_user}/pipelines_config/variables` | Unmatched | [Deprecated] List variables for a user |
| `BitbucketRestClient.getPipelineVariablesForWorkspace` | `GET` | `/workspaces/{workspace}/pipelines-config/variables` | Unmatched | List variables for a workspace |
| `BitbucketRestClient.getPipelinesForRepository` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines` | `P:ci.run.v1` | List pipelines |
| `BitbucketRestClient.getRepositoryPipelineCacheContentUri` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines-config/caches/{cache_uuid}/content-uri` | Unmatched | Get cache content URI |
| `BitbucketRestClient.getRepositoryPipelineCaches` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines-config/caches` | Unmatched | List caches |
| `BitbucketRestClient.getRepositoryPipelineConfig` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config` | Unmatched | Get configuration |
| `BitbucketRestClient.getRepositoryPipelineKnownHost` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/known_hosts/{known_host_uuid}` | Unmatched | Get a known host |
| `BitbucketRestClient.getRepositoryPipelineKnownHosts` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/known_hosts` | Unmatched | List known hosts |
| `BitbucketRestClient.getRepositoryPipelineSchedule` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/schedules/{schedule_uuid}` | Unmatched | Get a schedule |
| `BitbucketRestClient.getRepositoryPipelineScheduleExecutions` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/schedules/{schedule_uuid}/executions` | Unmatched | List executions of a schedule |
| `BitbucketRestClient.getRepositoryPipelineSchedules` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/schedules` | Unmatched | List schedules |
| `BitbucketRestClient.getRepositoryPipelineSshKeyPair` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/key_pair` | `U:bitbucket.pipeline-ssh-oidc` | Get SSH key pair |
| `BitbucketRestClient.getRepositoryPipelineVariable` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/variables/{variable_uuid}` | Unmatched | Get a variable for a repository |
| `BitbucketRestClient.getRepositoryPipelineVariables` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines_config/variables` | Unmatched | List variables for a repository |
| `BitbucketRestClient.getRepositoryRunner` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines-config/runners/{runner_uuid}` | Unmatched | Get repository runner |
| `BitbucketRestClient.getRepositoryRunners` | `GET` | `/repositories/{workspace}/{repo_slug}/pipelines-config/runners` | `P:ci.runners.v1` | Get repository runners |
| `BitbucketRestClient.getWorkspaceRunner` | `GET` | `/workspaces/{workspace}/pipelines-config/runners/{runner_uuid}` | Unmatched | Get workspace runner |
| `BitbucketRestClient.getWorkspaceRunners` | `GET` | `/workspaces/{workspace}/pipelines-config/runners` | `P:ci.runners.v1` | Get workspace runners |
| `BitbucketRestClient.stopPipeline` | `POST` | `/repositories/{workspace}/{repo_slug}/pipelines/{pipeline_uuid}/stopPipeline` | `P:ci.run.v1` | Stop a pipeline |
| `BitbucketRestClient.updateDeploymentVariable` | `PUT` | `/repositories/{workspace}/{repo_slug}/deployments_config/environments/{environment_uuid}/variables/{variable_uuid}` | Unmatched | Update a variable for an environment |
| `BitbucketRestClient.updatePipelineVariableForTeam` | `PUT` | `/teams/{username}/pipelines_config/variables/{variable_uuid}` | Unmatched | [Deprecated] Update a variable for a team |
| `BitbucketRestClient.updatePipelineVariableForUser` | `PUT` | `/users/{selected_user}/pipelines_config/variables/{variable_uuid}` | Unmatched | [Deprecated] Update a variable for a user |
| `BitbucketRestClient.updatePipelineVariableForWorkspace` | `PUT` | `/workspaces/{workspace}/pipelines-config/variables/{variable_uuid}` | Unmatched | Update variable for a workspace |
| `BitbucketRestClient.updateRepositoryBuildNumber` | `PUT` | `/repositories/{workspace}/{repo_slug}/pipelines_config/build_number` | Unmatched | Update the next build number |
| `BitbucketRestClient.updateRepositoryPipelineConfig` | `PUT` | `/repositories/{workspace}/{repo_slug}/pipelines_config` | Unmatched | Update configuration |
| `BitbucketRestClient.updateRepositoryPipelineKeyPair` | `PUT` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/key_pair` | Unmatched | Update SSH key pair |
| `BitbucketRestClient.updateRepositoryPipelineKnownHost` | `PUT` | `/repositories/{workspace}/{repo_slug}/pipelines_config/ssh/known_hosts/{known_host_uuid}` | Unmatched | Update a known host |
| `BitbucketRestClient.updateRepositoryPipelineSchedule` | `PUT` | `/repositories/{workspace}/{repo_slug}/pipelines_config/schedules/{schedule_uuid}` | Unmatched | Update a schedule |
| `BitbucketRestClient.updateRepositoryPipelineVariable` | `PUT` | `/repositories/{workspace}/{repo_slug}/pipelines_config/variables/{variable_uuid}` | Unmatched | Update a variable for a repository |
| `BitbucketRestClient.updateRepositoryRunner` | `PUT` | `/repositories/{workspace}/{repo_slug}/pipelines-config/runners/{runner_uuid}` | `P:ci.runners.v1` | Update repository runner |
| `BitbucketRestClient.updateWorkspaceRunner` | `PUT` | `/workspaces/{workspace}/pipelines-config/runners/{runner_uuid}` | Unmatched | Update workspace runner |

</details>

<details>
<summary><strong>Projects</strong> (16)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteWorkspacesWorkspaceProjectsProjectKey` | `DELETE` | `/workspaces/{workspace}/projects/{project_key}` | Unmatched | Delete a project for a workspace |
| `BitbucketRestClient.deleteWorkspacesWorkspaceProjectsProjectKeyDefaultReviewersSelectedUser` | `DELETE` | `/workspaces/{workspace}/projects/{project_key}/default-reviewers/{selected_user}` | Unmatched | Remove the specific user from the project's default reviewers |
| `BitbucketRestClient.deleteWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigGroupsGroupSlug` | `DELETE` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/groups/{group_slug}` | Unmatched | Delete an explicit group permission for a project |
| `BitbucketRestClient.deleteWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigUsersSelectedUserId` | `DELETE` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/users/{selected_user_id}` | Unmatched | Delete an explicit user permission for a project |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKey` | `GET` | `/workspaces/{workspace}/projects/{project_key}` | Unmatched | Get a project for a workspace |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyDefaultReviewers` | `GET` | `/workspaces/{workspace}/projects/{project_key}/default-reviewers` | Unmatched | List the default reviewers in a project |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyDefaultReviewersSelectedUser` | `GET` | `/workspaces/{workspace}/projects/{project_key}/default-reviewers/{selected_user}` | Unmatched | Get a default reviewer |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigGroups` | `GET` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/groups` | Unmatched | List explicit group permissions for a project |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigGroupsGroupSlug` | `GET` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/groups/{group_slug}` | Unmatched | Get an explicit group permission for a project |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigUsers` | `GET` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/users` | Unmatched | List explicit user permissions for a project |
| `BitbucketRestClient.getWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigUsersSelectedUserId` | `GET` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/users/{selected_user_id}` | Unmatched | Get an explicit user permission for a project |
| `BitbucketRestClient.postWorkspacesWorkspaceProjects` | `POST` | `/workspaces/{workspace}/projects` | Unmatched | Create a project in a workspace |
| `BitbucketRestClient.putWorkspacesWorkspaceProjectsProjectKey` | `PUT` | `/workspaces/{workspace}/projects/{project_key}` | Unmatched | Update a project for a workspace |
| `BitbucketRestClient.putWorkspacesWorkspaceProjectsProjectKeyDefaultReviewersSelectedUser` | `PUT` | `/workspaces/{workspace}/projects/{project_key}/default-reviewers/{selected_user}` | Unmatched | Add the specific user as a default reviewer for the project |
| `BitbucketRestClient.putWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigGroupsGroupSlug` | `PUT` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/groups/{group_slug}` | Unmatched | Update an explicit group permission for a project |
| `BitbucketRestClient.putWorkspacesWorkspaceProjectsProjectKeyPermissionsConfigUsersSelectedUserId` | `PUT` | `/workspaces/{workspace}/projects/{project_key}/permissions-config/users/{selected_user_id}` | Unmatched | Update an explicit user permission for a project |

</details>

<details>
<summary><strong>Pullrequests</strong> (37)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugDefaultReviewersTargetUsername` | `DELETE` | `/repositories/{workspace}/{repo_slug}/default-reviewers/{target_username}` | Unmatched | Remove a user from the default reviewers |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/approve` | `P:pull-request.review.v1` | Unapprove a pull request |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentId` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}` | `E:pull-request.comments.v1` | Delete a comment on a pull request |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentIdResolve` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}/resolve` | Unmatched | Reopen a comment thread |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdRequestChanges` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/request-changes` | Unmatched | Remove change request for a pull request |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdTasksTaskId` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/tasks/{task_id}` | Unmatched | Delete a task on a pull request |
| `BitbucketRestClient.getPullrequestsForCommit` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/pullrequests` | Unmatched | List pull requests that contain a commit |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDefaultReviewers` | `GET` | `/repositories/{workspace}/{repo_slug}/default-reviewers` | `P:pull-request.reviewers.v1` | List default reviewers |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugDefaultReviewersTargetUsername` | `GET` | `/repositories/{workspace}/{repo_slug}/default-reviewers/{target_username}` | Unmatched | Get a default reviewer |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugEffectiveDefaultReviewers` | `GET` | `/repositories/{workspace}/{repo_slug}/effective-default-reviewers` | Unmatched | List effective default reviewers |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequests` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests` | `E:pull-request.core.v1` | List pull requests |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsActivity` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/activity` | Unmatched | List a pull request activity log |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}` | `E:pull-request.core.v1` | Get a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdActivity` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/activity` | Unmatched | List a pull request activity log |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments` | `E:pull-request.comments.v1` | List comments on a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentId` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}` | Unmatched | Get a comment on a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommits` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/commits` | `E:pull-request.changes.v1` | List commits on a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdConflicts` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/conflicts` | Unmatched | Get file conflicts for a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDiff` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diff` | `E:pull-request.changes.v1` | List changes in a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDiffstat` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diffstat` | `E:pull-request.changes.v1` | Get the diff stat for a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdMergeTaskStatusTaskId` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/merge/task-status/{task_id}` | Unmatched | Get the merge task status for a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdPatch` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/patch` | Unmatched | Get the patch for a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdTasks` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/tasks` | Unmatched | List tasks on a pull request |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdTasksTaskId` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/tasks/{task_id}` | Unmatched | Get a task on a pull request |
| `BitbucketRestClient.getWorkspacesWorkspacePullrequestsSelectedUser` | `GET` | `/workspaces/{workspace}/pullrequests/{selected_user}` | Unmatched | List workspace pull requests for a user |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequests` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests` | `E:pull-request.core.v1`<br>`P:pull-request.reviewers.v1` | Create a pull request |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/approve` | `P:pull-request.review.v1` | Approve a pull request |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments` | `E:pull-request.comments.v1` | Create a comment on a pull request |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentIdResolve` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}/resolve` | Unmatched | Resolve a comment thread |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDecline` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/decline` | Unmatched | Decline a pull request |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdMerge` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/merge` | `E:pull-request.merge.v1` | Merge a pull request |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdRequestChanges` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/request-changes` | `P:pull-request.review.v1` | Request changes for a pull request |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdTasks` | `POST` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/tasks` | Unmatched | Create a task on a pull request |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugDefaultReviewersTargetUsername` | `PUT` | `/repositories/{workspace}/{repo_slug}/default-reviewers/{target_username}` | Unmatched | Add a user to the default reviewers |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId` | `PUT` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}` | `E:pull-request.core.v1`<br>`P:pull-request.reviewers.v1` | Update a pull request |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentId` | `PUT` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/comments/{comment_id}` | `E:pull-request.comments.v1` | Update a comment on a pull request |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdTasksTaskId` | `PUT` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/tasks/{task_id}` | Unmatched | Update a task on a pull request |

</details>

<details>
<summary><strong>Refs</strong> (9)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugRefsBranchesName` | `DELETE` | `/repositories/{workspace}/{repo_slug}/refs/branches/{name}` | `E:branch.delete.v1` | Delete a branch |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugRefsTagsName` | `DELETE` | `/repositories/{workspace}/{repo_slug}/refs/tags/{name}` | `P:tag.create-delete.v1` | Delete a tag |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefs` | `GET` | `/repositories/{workspace}/{repo_slug}/refs` | `E:git.ref.read.v1` | List branches and tags |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsBranches` | `GET` | `/repositories/{workspace}/{repo_slug}/refs/branches` | `E:branch.list.v1` | List open branches |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsBranchesName` | `GET` | `/repositories/{workspace}/{repo_slug}/refs/branches/{name}` | `E:branch.get.v1` | Get a branch |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsTags` | `GET` | `/repositories/{workspace}/{repo_slug}/refs/tags` | `E:tag.list-get.v1` | List tags |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugRefsTagsName` | `GET` | `/repositories/{workspace}/{repo_slug}/refs/tags/{name}` | `E:tag.list-get.v1` | Get a tag |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugRefsBranches` | `POST` | `/repositories/{workspace}/{repo_slug}/refs/branches` | `P:branch.create.v1` | Create a branch |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugRefsTags` | `POST` | `/repositories/{workspace}/{repo_slug}/refs/tags` | `P:tag.create-delete.v1` | Create a tag |

</details>

<details>
<summary><strong>Repositories</strong> (30)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlug` | `DELETE` | `/repositories/{workspace}/{repo_slug}` | `E:repository.delete.v1` | Delete a repository |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugHooksUid` | `DELETE` | `/repositories/{workspace}/{repo_slug}/hooks/{uid}` | `P:webhook.crud.v1` | Delete a webhook for a repository |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPermissionsConfigGroupsGroupSlug` | `DELETE` | `/repositories/{workspace}/{repo_slug}/permissions-config/groups/{group_slug}` | Unmatched | Delete an explicit group permission for a repository |
| `BitbucketRestClient.deleteRepositoriesWorkspaceRepoSlugPermissionsConfigUsersSelectedUserId` | `DELETE` | `/repositories/{workspace}/{repo_slug}/permissions-config/users/{selected_user_id}` | Unmatched | Delete an explicit user permission for a repository |
| `BitbucketRestClient.getRepositories` | `GET` | `/repositories` | `E:repository.list.v1` | [Deprecated] List public repositories |
| `BitbucketRestClient.getRepositoriesWorkspace` | `GET` | `/repositories/{workspace}` | `E:repository.list.v1` | List repositories in a workspace |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlug` | `GET` | `/repositories/{workspace}/{repo_slug}` | `E:repository.get.v1` | Get a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugFilehistoryCommitPath` | `GET` | `/repositories/{workspace}/{repo_slug}/filehistory/{commit}/{path}` | Unmatched | List commits that modified a file |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugForks` | `GET` | `/repositories/{workspace}/{repo_slug}/forks` | `E:repository.fork.list.v1` | List repository forks |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugHooks` | `GET` | `/repositories/{workspace}/{repo_slug}/hooks` | `P:webhook.crud.v1` | List webhooks for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugHooksUid` | `GET` | `/repositories/{workspace}/{repo_slug}/hooks/{uid}` | `P:webhook.crud.v1` | Get a webhook for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugOverrideSettings` | `GET` | `/repositories/{workspace}/{repo_slug}/override-settings` | Unmatched | Retrieve the inheritance state for repository settings |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPermissionsConfigGroups` | `GET` | `/repositories/{workspace}/{repo_slug}/permissions-config/groups` | `P:collaborator.read.v1` | List explicit group permissions for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPermissionsConfigGroupsGroupSlug` | `GET` | `/repositories/{workspace}/{repo_slug}/permissions-config/groups/{group_slug}` | Unmatched | Get an explicit group permission for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPermissionsConfigUsers` | `GET` | `/repositories/{workspace}/{repo_slug}/permissions-config/users` | `P:collaborator.read.v1` | List explicit user permissions for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugPermissionsConfigUsersSelectedUserId` | `GET` | `/repositories/{workspace}/{repo_slug}/permissions-config/users/{selected_user_id}` | Unmatched | Get an explicit user permission for a repository |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugSrc` | `GET` | `/repositories/{workspace}/{repo_slug}/src` | `P:content.read.v1`<br>`P:git.tree.read.v1` | Get the root directory of the main branch |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugSrcCommitPath` | `GET` | `/repositories/{workspace}/{repo_slug}/src/{commit}/{path}` | `P:content.read.v1`<br>`P:git.tree.read.v1` | Get file or directory contents |
| `BitbucketRestClient.getRepositoriesWorkspaceRepoSlugWatchers` | `GET` | `/repositories/{workspace}/{repo_slug}/watchers` | Unmatched | List repositories watchers |
| `BitbucketRestClient.getUserPermissionsRepositories` | `GET` | `/user/permissions/repositories` | Unmatched | [Deprecated] List repository permissions for a user |
| `BitbucketRestClient.getUserWorkspacesWorkspacePermissionsRepositories` | `GET` | `/user/workspaces/{workspace}/permissions/repositories` | Unmatched | List repository permissions in a workspace for a user |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlug` | `POST` | `/repositories/{workspace}/{repo_slug}` | `P:repository.create.v1` | Create a repository |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugForks` | `POST` | `/repositories/{workspace}/{repo_slug}/forks` | `E:repository.fork.create.v1` | Fork a repository |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugHooks` | `POST` | `/repositories/{workspace}/{repo_slug}/hooks` | `P:webhook.crud.v1` | Create a webhook for a repository |
| `BitbucketRestClient.postRepositoriesWorkspaceRepoSlugSrc` | `POST` | `/repositories/{workspace}/{repo_slug}/src` | `P:content.write.v1` | Create a commit by uploading a file |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlug` | `PUT` | `/repositories/{workspace}/{repo_slug}` | `P:repository.create.v1`<br>`E:repository.update.v1` | Update a repository |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugHooksUid` | `PUT` | `/repositories/{workspace}/{repo_slug}/hooks/{uid}` | `P:webhook.crud.v1` | Update a webhook for a repository |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugOverrideSettings` | `PUT` | `/repositories/{workspace}/{repo_slug}/override-settings` | Unmatched | Set the inheritance state for repository settings |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPermissionsConfigGroupsGroupSlug` | `PUT` | `/repositories/{workspace}/{repo_slug}/permissions-config/groups/{group_slug}` | Unmatched | Update an explicit group permission for a repository |
| `BitbucketRestClient.putRepositoriesWorkspaceRepoSlugPermissionsConfigUsersSelectedUserId` | `PUT` | `/repositories/{workspace}/{repo_slug}/permissions-config/users/{selected_user_id}` | Unmatched | Update an explicit user permission for a repository |

</details>

<details>
<summary><strong>SSH</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteUsersSelectedUserSshKeysKeyId` | `DELETE` | `/users/{selected_user}/ssh-keys/{key_id}` | Unmatched | Delete a SSH key |
| `BitbucketRestClient.getUsersSelectedUserSshKeys` | `GET` | `/users/{selected_user}/ssh-keys` | Unmatched | List SSH keys |
| `BitbucketRestClient.getUsersSelectedUserSshKeysKeyId` | `GET` | `/users/{selected_user}/ssh-keys/{key_id}` | Unmatched | Get a SSH key |
| `BitbucketRestClient.postUsersSelectedUserSshKeys` | `POST` | `/users/{selected_user}/ssh-keys` | Unmatched | Add a new SSH key |
| `BitbucketRestClient.putUsersSelectedUserSshKeysKeyId` | `PUT` | `/users/{selected_user}/ssh-keys/{key_id}` | Unmatched | Update a SSH key |

</details>

<details>
<summary><strong>Search</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.searchAccount` | `GET` | `/users/{selected_user}/search/code` | `P:search.code.v1` | [Deprecated] Search for code in a user's repositories |
| `BitbucketRestClient.searchTeam` | `GET` | `/teams/{username}/search/code` | `P:search.code.v1` | [Deprecated] Search for code in a team's repositories |
| `BitbucketRestClient.searchWorkspace` | `GET` | `/workspaces/{workspace}/search/code` | `P:search.code.v1` | [Deprecated] Search for code in a workspace |

</details>

<details>
<summary><strong>Snippets</strong> (25)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteSnippetsWorkspaceEncodedId` | `DELETE` | `/snippets/{workspace}/{encoded_id}` | `P:snippet.crud.v1` | Delete a snippet |
| `BitbucketRestClient.deleteSnippetsWorkspaceEncodedIdCommentsCommentId` | `DELETE` | `/snippets/{workspace}/{encoded_id}/comments/{comment_id}` | Unmatched | Delete a comment on a snippet |
| `BitbucketRestClient.deleteSnippetsWorkspaceEncodedIdNodeId` | `DELETE` | `/snippets/{workspace}/{encoded_id}/{node_id}` | Unmatched | Delete a previous revision of a snippet |
| `BitbucketRestClient.deleteSnippetsWorkspaceEncodedIdWatch` | `DELETE` | `/snippets/{workspace}/{encoded_id}/watch` | Unmatched | Stop watching a snippet |
| `BitbucketRestClient.getSnippets` | `GET` | `/snippets` | Unmatched | [Deprecated] List snippets |
| `BitbucketRestClient.getSnippetsWorkspace` | `GET` | `/snippets/{workspace}` | `P:snippet.crud.v1` | List snippets in a workspace |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedId` | `GET` | `/snippets/{workspace}/{encoded_id}` | `P:snippet.crud.v1` | Get a snippet |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdComments` | `GET` | `/snippets/{workspace}/{encoded_id}/comments` | Unmatched | List comments on a snippet |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdCommentsCommentId` | `GET` | `/snippets/{workspace}/{encoded_id}/comments/{comment_id}` | Unmatched | Get a comment on a snippet |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdCommits` | `GET` | `/snippets/{workspace}/{encoded_id}/commits` | Unmatched | List snippet changes |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdCommitsRevision` | `GET` | `/snippets/{workspace}/{encoded_id}/commits/{revision}` | Unmatched | Get a previous snippet change |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdFilesPath` | `GET` | `/snippets/{workspace}/{encoded_id}/files/{path}` | Unmatched | Get a snippet's raw file at HEAD |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdNodeId` | `GET` | `/snippets/{workspace}/{encoded_id}/{node_id}` | Unmatched | Get a previous revision of a snippet |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdNodeIdFilesPath` | `GET` | `/snippets/{workspace}/{encoded_id}/{node_id}/files/{path}` | Unmatched | Get a snippet's raw file |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdRevisionDiff` | `GET` | `/snippets/{workspace}/{encoded_id}/{revision}/diff` | Unmatched | Get snippet changes between versions |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdRevisionPatch` | `GET` | `/snippets/{workspace}/{encoded_id}/{revision}/patch` | Unmatched | Get snippet patch between versions |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdWatch` | `GET` | `/snippets/{workspace}/{encoded_id}/watch` | Unmatched | Check if the current user is watching a snippet |
| `BitbucketRestClient.getSnippetsWorkspaceEncodedIdWatchers` | `GET` | `/snippets/{workspace}/{encoded_id}/watchers` | Unmatched | [Deprecated] List users watching a snippet |
| `BitbucketRestClient.postSnippets` | `POST` | `/snippets` | Unmatched | Create a snippet |
| `BitbucketRestClient.postSnippetsWorkspace` | `POST` | `/snippets/{workspace}` | `P:snippet.crud.v1` | Create a snippet for a workspace |
| `BitbucketRestClient.postSnippetsWorkspaceEncodedIdComments` | `POST` | `/snippets/{workspace}/{encoded_id}/comments` | Unmatched | Create a comment on a snippet |
| `BitbucketRestClient.putSnippetsWorkspaceEncodedId` | `PUT` | `/snippets/{workspace}/{encoded_id}` | `P:snippet.crud.v1` | Update a snippet |
| `BitbucketRestClient.putSnippetsWorkspaceEncodedIdCommentsCommentId` | `PUT` | `/snippets/{workspace}/{encoded_id}/comments/{comment_id}` | Unmatched | Update a comment on a snippet |
| `BitbucketRestClient.putSnippetsWorkspaceEncodedIdNodeId` | `PUT` | `/snippets/{workspace}/{encoded_id}/{node_id}` | Unmatched | Update a previous revision of a snippet |
| `BitbucketRestClient.putSnippetsWorkspaceEncodedIdWatch` | `PUT` | `/snippets/{workspace}/{encoded_id}/watch` | Unmatched | Watch a snippet |

</details>

<details>
<summary><strong>Users</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.getUser` | `GET` | `/user` | `E:user.current.read.v1` | Get current user |
| `BitbucketRestClient.getUserEmails` | `GET` | `/user/emails` | Unmatched | List email addresses for current user |
| `BitbucketRestClient.getUserEmailsEmail` | `GET` | `/user/emails/{email}` | Unmatched | Get an email address for current user |
| `BitbucketRestClient.getUsersSelectedUser` | `GET` | `/users/{selected_user}` | `E:user.named.read.v1` | Get a user |

</details>

<details>
<summary><strong>Webhooks</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteWorkspacesWorkspaceHooksUid` | `DELETE` | `/workspaces/{workspace}/hooks/{uid}` | Unmatched | Delete a webhook for a workspace |
| `BitbucketRestClient.getHookEvents` | `GET` | `/hook_events` | Unmatched | Get a webhook resource |
| `BitbucketRestClient.getHookEventsSubjectType` | `GET` | `/hook_events/{subject_type}` | Unmatched | List subscribable webhook types |
| `BitbucketRestClient.getWorkspacesWorkspaceHooks` | `GET` | `/workspaces/{workspace}/hooks` | Unmatched | List webhooks for a workspace |
| `BitbucketRestClient.getWorkspacesWorkspaceHooksUid` | `GET` | `/workspaces/{workspace}/hooks/{uid}` | Unmatched | Get a webhook for a workspace |
| `BitbucketRestClient.postWorkspacesWorkspaceHooks` | `POST` | `/workspaces/{workspace}/hooks` | Unmatched | Create a webhook for a workspace |
| `BitbucketRestClient.putWorkspacesWorkspaceHooksUid` | `PUT` | `/workspaces/{workspace}/hooks/{uid}` | Unmatched | Update a webhook for a workspace |

</details>

<details>
<summary><strong>Workspaces</strong> (11)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.getUserWorkspaces` | `GET` | `/user/workspaces` | `E:namespace.read.v1` | List workspaces for the current user |
| `BitbucketRestClient.getUserWorkspacesWorkspacePermission` | `GET` | `/user/workspaces/{workspace}/permission` | Unmatched | Get user permission on a workspace |
| `BitbucketRestClient.getWorkspaces` | `GET` | `/workspaces` | Unmatched | [Deprecated] List workspaces for user |
| `BitbucketRestClient.getWorkspacesWorkspace` | `GET` | `/workspaces/{workspace}` | `E:namespace.read.v1` | Get a workspace |
| `BitbucketRestClient.getWorkspacesWorkspaceMembers` | `GET` | `/workspaces/{workspace}/members` | `E:namespace.members.read.v1` | List users in a workspace |
| `BitbucketRestClient.getWorkspacesWorkspaceMembersMember` | `GET` | `/workspaces/{workspace}/members/{member}` | `E:namespace.members.read.v1` | Get user membership for a workspace |
| `BitbucketRestClient.getWorkspacesWorkspacePermissions` | `GET` | `/workspaces/{workspace}/permissions` | Unmatched | List user permissions in a workspace |
| `BitbucketRestClient.getWorkspacesWorkspacePermissionsRepositories` | `GET` | `/workspaces/{workspace}/permissions/repositories` | Unmatched | List all repository permissions for a workspace |
| `BitbucketRestClient.getWorkspacesWorkspacePermissionsRepositoriesRepoSlug` | `GET` | `/workspaces/{workspace}/permissions/repositories/{repo_slug}` | Unmatched | List a repository permissions for a workspace |
| `BitbucketRestClient.getWorkspacesWorkspaceProjects` | `GET` | `/workspaces/{workspace}/projects` | Unmatched | List projects in a workspace |
| `BitbucketRestClient.getWorkspacesWorkspaceSettingsGpgPublicKey` | `GET` | `/workspaces/{workspace}/settings/gpg/public-key` | Unmatched | Get the workspace system GPG public key(s) |

</details>

<details>
<summary><strong>properties</strong> (12)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `BitbucketRestClient.deleteCommitHostedPropertyValue` | `DELETE` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/properties/{app_key}/{property_name}` | Unmatched | Delete a commit application property |
| `BitbucketRestClient.deletePullRequestHostedPropertyValue` | `DELETE` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pullrequest_id}/properties/{app_key}/{property_name}` | Unmatched | Delete a pull request application property |
| `BitbucketRestClient.deleteRepositoryHostedPropertyValue` | `DELETE` | `/repositories/{workspace}/{repo_slug}/properties/{app_key}/{property_name}` | Unmatched | Delete a repository application property |
| `BitbucketRestClient.deleteUserHostedPropertyValue` | `DELETE` | `/users/{selected_user}/properties/{app_key}/{property_name}` | Unmatched | Delete a user application property |
| `BitbucketRestClient.getCommitHostedPropertyValue` | `GET` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/properties/{app_key}/{property_name}` | Unmatched | Get a commit application property |
| `BitbucketRestClient.getPullRequestHostedPropertyValue` | `GET` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pullrequest_id}/properties/{app_key}/{property_name}` | Unmatched | Get a pull request application property |
| `BitbucketRestClient.getRepositoryHostedPropertyValue` | `GET` | `/repositories/{workspace}/{repo_slug}/properties/{app_key}/{property_name}` | Unmatched | Get a repository application property |
| `BitbucketRestClient.retrieveUserHostedPropertyValue` | `GET` | `/users/{selected_user}/properties/{app_key}/{property_name}` | Unmatched | Get a user application property |
| `BitbucketRestClient.updateCommitHostedPropertyValue` | `PUT` | `/repositories/{workspace}/{repo_slug}/commit/{commit}/properties/{app_key}/{property_name}` | Unmatched | Update a commit application property |
| `BitbucketRestClient.updatePullRequestHostedPropertyValue` | `PUT` | `/repositories/{workspace}/{repo_slug}/pullrequests/{pullrequest_id}/properties/{app_key}/{property_name}` | Unmatched | Update a pull request application property |
| `BitbucketRestClient.updateRepositoryHostedPropertyValue` | `PUT` | `/repositories/{workspace}/{repo_slug}/properties/{app_key}/{property_name}` | Unmatched | Update a repository application property |
| `BitbucketRestClient.updateUserHostedPropertyValue` | `PUT` | `/users/{selected_user}/properties/{app_key}/{property_name}` | Unmatched | Update a user application property |

</details>

### Codeberg: 506 methods

<details>
<summary><strong>activitypub</strong> (11)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.activitypubInstanceActor` | `GET` | `/activitypub/actor` | `U:codeberg.activitypub` | Returns the instance's Actor |
| `CodebergRestClient.activitypubInstanceActorInbox` | `POST` | `/activitypub/actor/inbox` | Unmatched | Send to the inbox |
| `CodebergRestClient.activitypubInstanceActorOutbox` | `POST` | `/activitypub/actor/outbox` | Unmatched | Display the outbox (always empty) |
| `CodebergRestClient.activitypubPerson` | `GET` | `/activitypub/user-id/{user-id}` | `U:codeberg.activitypub` | Returns the Person actor for a user |
| `CodebergRestClient.activitypubPersonActivity` | `GET` | `/activitypub/user-id/{user-id}/activities/{activity-id}/activity` | Unmatched | Get a specific activity of the user |
| `CodebergRestClient.activitypubPersonActivityNote` | `GET` | `/activitypub/user-id/{user-id}/activities/{activity-id}` | Unmatched | Get a specific activity object of the user |
| `CodebergRestClient.activitypubPersonFeed` | `GET` | `/activitypub/user-id/{user-id}/outbox` | Unmatched | List the user's recorded activity |
| `CodebergRestClient.activitypubPersonInbox` | `POST` | `/activitypub/user-id/{user-id}/inbox` | `U:codeberg.activitypub` | Send to the inbox |
| `CodebergRestClient.activitypubRepository` | `GET` | `/activitypub/repository-id/{repository-id}` | `U:codeberg.activitypub` | Returns the Repository actor for a repo |
| `CodebergRestClient.activitypubRepositoryInbox` | `POST` | `/activitypub/repository-id/{repository-id}/inbox` | `U:codeberg.activitypub` | Send to the inbox |
| `CodebergRestClient.activitypubRepositoryOutbox` | `POST` | `/activitypub/repository-id/{repository-id}/outbox` | Unmatched | Display the outbox |

</details>

<details>
<summary><strong>admin</strong> (51)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.adminAddRuleToQuotaGroup` | `PUT` | `/admin/quota/groups/{quotagroup}/rules/{quotarule}` | `U:codeberg.quotas` | Adds a rule to a quota group |
| `CodebergRestClient.adminAddUserToQuotaGroup` | `PUT` | `/admin/quota/groups/{quotagroup}/users/{username}` | Unmatched | Add a user to a quota group |
| `CodebergRestClient.adminAdoptRepository` | `POST` | `/admin/unadopted/{owner}/{repo}` | Unmatched | Adopt unadopted files as a repository |
| `CodebergRestClient.adminCreateHook` | `POST` | `/admin/hooks` | Unmatched | Create a hook |
| `CodebergRestClient.adminCreateOrg` | `POST` | `/admin/users/{username}/orgs` | Unmatched | Create an organization |
| `CodebergRestClient.adminCreatePublicKey` | `POST` | `/admin/users/{username}/keys` | Unmatched | Add an SSH public key to user's account |
| `CodebergRestClient.adminCreateQuotaGroup` | `POST` | `/admin/quota/groups` | `U:codeberg.quotas` | Create a new quota group |
| `CodebergRestClient.adminCreateQuotaRule` | `POST` | `/admin/quota/rules` | `U:codeberg.quotas` | Create a new quota rule |
| `CodebergRestClient.adminCreateRepo` | `POST` | `/admin/users/{username}/repos` | Unmatched | Create a repository on behalf of a user |
| `CodebergRestClient.adminCreateUser` | `POST` | `/admin/users` | Unmatched | Create a user account |
| `CodebergRestClient.adminCreateUserAccessToken` | `POST` | `/admin/users/{username}/tokens` | Unmatched | Create an access token for the specified user |
| `CodebergRestClient.adminCronList` | `GET` | `/admin/cron` | Unmatched | List cron tasks |
| `CodebergRestClient.adminCronRun` | `POST` | `/admin/cron/{task}` | Unmatched | Run cron task |
| `CodebergRestClient.adminDeleteHook` | `DELETE` | `/admin/hooks/{id}` | Unmatched | Delete a hook |
| `CodebergRestClient.adminDeleteQuotaGroup` | `DELETE` | `/admin/quota/groups/{quotagroup}` | Unmatched | Delete a quota group |
| `CodebergRestClient.adminDeleteQuotaRule` | `DELETE` | `/admin/quota/rules/{quotarule}` | Unmatched | Deletes a quota rule |
| `CodebergRestClient.adminDeleteUnadoptedRepository` | `DELETE` | `/admin/unadopted/{owner}/{repo}` | Unmatched | Delete unadopted files |
| `CodebergRestClient.adminDeleteUser` | `DELETE` | `/admin/users/{username}` | Unmatched | Delete user account |
| `CodebergRestClient.adminDeleteUserAccessToken` | `DELETE` | `/admin/users/{username}/tokens/{token}` | Unmatched | Delete an access token for the specified user |
| `CodebergRestClient.adminDeleteUserEmails` | `DELETE` | `/admin/users/{username}/emails` | Unmatched | Delete email addresses from a user's account |
| `CodebergRestClient.adminDeleteUserPublicKey` | `DELETE` | `/admin/users/{username}/keys/{id}` | Unmatched | Remove a public key from user's account |
| `CodebergRestClient.adminEditHook` | `PATCH` | `/admin/hooks/{id}` | Unmatched | Update a hook |
| `CodebergRestClient.adminEditQuotaRule` | `PATCH` | `/admin/quota/rules/{quotarule}` | Unmatched | Change an existing quota rule |
| `CodebergRestClient.adminEditUser` | `PATCH` | `/admin/users/{username}` | Unmatched | Edit an existing user |
| `CodebergRestClient.adminGetActionRunJobs` | `GET` | `/admin/actions/runners/jobs` | Unmatched | Get action run jobs |
| `CodebergRestClient.adminGetAllEmails` | `GET` | `/admin/emails` | Unmatched | List all users' email addresses |
| `CodebergRestClient.adminGetAllOrgs` | `GET` | `/admin/orgs` | Unmatched | List all organizations |
| `CodebergRestClient.adminGetHook` | `GET` | `/admin/hooks/{id}` | Unmatched | Get a hook |
| `CodebergRestClient.adminGetQuotaGroup` | `GET` | `/admin/quota/groups/{quotagroup}` | Unmatched | Get information about the quota group |
| `CodebergRestClient.adminGetQuotaRule` | `GET` | `/admin/quota/rules/{quotarule}` | Unmatched | Get information about a quota rule |
| `CodebergRestClient.adminGetRegistrationToken` | `GET` | `/admin/runners/registration-token` | Unmatched | [Deprecated] Get a runner registration token for registering global runners |
| `CodebergRestClient.adminGetRunnerRegistrationToken` | `GET` | `/admin/actions/runners/registration-token` | Unmatched | [Deprecated] Get a runner registration token for registering global runners |
| `CodebergRestClient.adminGetUserQuota` | `GET` | `/admin/users/{username}/quota` | Unmatched | Get the user's quota info |
| `CodebergRestClient.adminListHooks` | `GET` | `/admin/hooks` | Unmatched | List global (system) webhooks |
| `CodebergRestClient.adminListQuotaGroups` | `GET` | `/admin/quota/groups` | Unmatched | List the available quota groups |
| `CodebergRestClient.adminListQuotaRules` | `GET` | `/admin/quota/rules` | Unmatched | List the available quota rules |
| `CodebergRestClient.adminListUserAccessTokens` | `GET` | `/admin/users/{username}/tokens` | Unmatched | List the specified user's access tokens |
| `CodebergRestClient.adminListUserEmails` | `GET` | `/admin/users/{username}/emails` | Unmatched | List all email addresses for a user |
| `CodebergRestClient.adminListUsersInQuotaGroup` | `GET` | `/admin/quota/groups/{quotagroup}/users` | Unmatched | List users in a quota group |
| `CodebergRestClient.adminRemoveRuleFromQuotaGroup` | `DELETE` | `/admin/quota/groups/{quotagroup}/rules/{quotarule}` | Unmatched | Removes a rule from a quota group |
| `CodebergRestClient.adminRemoveUserFromQuotaGroup` | `DELETE` | `/admin/quota/groups/{quotagroup}/users/{username}` | Unmatched | Remove a user from a quota group |
| `CodebergRestClient.adminRenameUser` | `POST` | `/admin/users/{username}/rename` | Unmatched | Rename a user |
| `CodebergRestClient.adminSearchEmails` | `GET` | `/admin/emails/search` | Unmatched | Search users' email addresses |
| `CodebergRestClient.adminSearchRunJobs` | `GET` | `/admin/runners/jobs` | `U:codeberg.action-token-context` | [Deprecated] Search action jobs according to filter conditions |
| `CodebergRestClient.adminSearchUsers` | `GET` | `/admin/users` | Unmatched | Search users according filter conditions |
| `CodebergRestClient.adminSetUserQuotaGroups` | `POST` | `/admin/users/{username}/quota/groups` | `U:codeberg.quotas` | Set the user's quota groups to a given list. |
| `CodebergRestClient.adminUnadoptedList` | `GET` | `/admin/unadopted` | Unmatched | List unadopted repositories |
| `CodebergRestClient.deleteAdminRunner` | `DELETE` | `/admin/actions/runners/{runner_id}` | Unmatched | Delete a particular runner, no matter whether it is a global runner or scoped to an organization, user, or repository |
| `CodebergRestClient.getAdminRunner` | `GET` | `/admin/actions/runners/{runner_id}` | Unmatched | Get a particular runner, no matter whether it is a global runner or scoped to an organization, user, or repository |
| `CodebergRestClient.getAdminRunners` | `GET` | `/admin/actions/runners` | Unmatched | Get all runners, no matter whether they are global runners or scoped to an organization, user, or repository |
| `CodebergRestClient.registerAdminRunner` | `POST` | `/admin/actions/runners` | `P:ci.runners.v1` | Register a new global runner |

</details>

<details>
<summary><strong>issue</strong> (67)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.issueAddLabel` | `POST` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Add a label to an issue |
| `CodebergRestClient.issueAddSubscription` | `PUT` | `/repos/{owner}/{repo}/issues/{index}/subscriptions/{user}` | Unmatched | Subscribe user to issue |
| `CodebergRestClient.issueAddTime` | `POST` | `/repos/{owner}/{repo}/issues/{index}/times` | Unmatched | Add tracked time to a issue |
| `CodebergRestClient.issueCheckSubscription` | `GET` | `/repos/{owner}/{repo}/issues/{index}/subscriptions/check` | Unmatched | Check if user is subscribed to an issue |
| `CodebergRestClient.issueClearLabels` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Remove all labels from an issue |
| `CodebergRestClient.issueCreateComment` | `POST` | `/repos/{owner}/{repo}/issues/{index}/comments` | `E:issue.comments.v1`<br>`P:pull-request.comments.v1` | Add a comment to an issue |
| `CodebergRestClient.issueCreateIssue` | `POST` | `/repos/{owner}/{repo}/issues` | `E:issue.write.v1` | Create an issue. If using deadline only the date will be taken into account, and time of day ignored. |
| `CodebergRestClient.issueCreateIssueAttachment` | `POST` | `/repos/{owner}/{repo}/issues/{index}/assets` | Unmatched | Create an issue attachment |
| `CodebergRestClient.issueCreateIssueBlocking` | `POST` | `/repos/{owner}/{repo}/issues/{index}/blocks` | Unmatched | Block the issue given in the body by the issue in path |
| `CodebergRestClient.issueCreateIssueCommentAttachment` | `POST` | `/repos/{owner}/{repo}/issues/comments/{id}/assets` | Unmatched | Create a comment attachment |
| `CodebergRestClient.issueCreateIssueDependencies` | `POST` | `/repos/{owner}/{repo}/issues/{index}/dependencies` | Unmatched | Make the issue in the url depend on the issue in the form. |
| `CodebergRestClient.issueCreateLabel` | `POST` | `/repos/{owner}/{repo}/labels` | `E:label.catalog.v1` | Create a label |
| `CodebergRestClient.issueCreateMilestone` | `POST` | `/repos/{owner}/{repo}/milestones` | `E:milestone.catalog.v1` | Create a milestone |
| `CodebergRestClient.issueDelete` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}` | `E:issue.write.v1` | Delete an issue |
| `CodebergRestClient.issueDeleteComment` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{id}` | `E:issue.comments.v1` | Delete a comment |
| `CodebergRestClient.issueDeleteCommentDeprecated` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/comments/{id}` | Unmatched | [Deprecated] Delete a comment |
| `CodebergRestClient.issueDeleteCommentReaction` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{id}/reactions` | Unmatched | Remove a reaction from a comment of an issue |
| `CodebergRestClient.issueDeleteIssueAttachment` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/assets/{attachment_id}` | Unmatched | Delete an issue attachment |
| `CodebergRestClient.issueDeleteIssueCommentAttachment` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{id}/assets/{attachment_id}` | Unmatched | Delete a comment attachment |
| `CodebergRestClient.issueDeleteIssueReaction` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/reactions` | Unmatched | Remove a reaction from an issue |
| `CodebergRestClient.issueDeleteLabel` | `DELETE` | `/repos/{owner}/{repo}/labels/{id}` | `E:label.catalog.v1` | Delete a label |
| `CodebergRestClient.issueDeleteMilestone` | `DELETE` | `/repos/{owner}/{repo}/milestones/{id}` | `E:milestone.catalog.v1` | Delete a milestone |
| `CodebergRestClient.issueDeleteStopWatch` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/stopwatch/delete` | Unmatched | Delete an issue's existing stopwatch. |
| `CodebergRestClient.issueDeleteSubscription` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/subscriptions/{user}` | Unmatched | Unsubscribe user from issue |
| `CodebergRestClient.issueDeleteTime` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/times/{id}` | Unmatched | Delete specific tracked time |
| `CodebergRestClient.issueEditComment` | `PATCH` | `/repos/{owner}/{repo}/issues/comments/{id}` | `E:issue.comments.v1` | Edit a comment |
| `CodebergRestClient.issueEditCommentDeprecated` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}/comments/{id}` | Unmatched | [Deprecated] Edit a comment |
| `CodebergRestClient.issueEditIssue` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}` | `E:issue.write.v1` | Edit an issue. If using deadline only the date will be taken into account, and time of day ignored. |
| `CodebergRestClient.issueEditIssueAttachment` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}/assets/{attachment_id}` | Unmatched | Edit an issue attachment |
| `CodebergRestClient.issueEditIssueCommentAttachment` | `PATCH` | `/repos/{owner}/{repo}/issues/comments/{id}/assets/{attachment_id}` | Unmatched | Edit a comment attachment |
| `CodebergRestClient.issueEditIssueDeadline` | `POST` | `/repos/{owner}/{repo}/issues/{index}/deadline` | Unmatched | Set an issue deadline. If set to null, the deadline is deleted. If using deadline only the date will be taken into account, and time of day ignored. |
| `CodebergRestClient.issueEditLabel` | `PATCH` | `/repos/{owner}/{repo}/labels/{id}` | `E:label.catalog.v1` | Update a label |
| `CodebergRestClient.issueEditMilestone` | `PATCH` | `/repos/{owner}/{repo}/milestones/{id}` | `E:milestone.catalog.v1` | Update a milestone |
| `CodebergRestClient.issueGetComment` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}` | `E:issue.comments.v1` | Get a comment |
| `CodebergRestClient.issueGetCommentReactions` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}/reactions` | Unmatched | Get a list of reactions from a comment of an issue |
| `CodebergRestClient.issueGetComments` | `GET` | `/repos/{owner}/{repo}/issues/{index}/comments` | `E:issue.comments.v1`<br>`P:pull-request.comments.v1` | List all comments on an issue |
| `CodebergRestClient.issueGetCommentsAndTimeline` | `GET` | `/repos/{owner}/{repo}/issues/{index}/timeline` | Unmatched | List all comments and events on an issue |
| `CodebergRestClient.issueGetIssue` | `GET` | `/repos/{owner}/{repo}/issues/{index}` | `E:issue.read.v1` | Get an issue |
| `CodebergRestClient.issueGetIssueAttachment` | `GET` | `/repos/{owner}/{repo}/issues/{index}/assets/{attachment_id}` | Unmatched | Get an issue attachment |
| `CodebergRestClient.issueGetIssueCommentAttachment` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}/assets/{attachment_id}` | Unmatched | Get a comment attachment |
| `CodebergRestClient.issueGetIssueReactions` | `GET` | `/repos/{owner}/{repo}/issues/{index}/reactions` | Unmatched | Get a list reactions of an issue |
| `CodebergRestClient.issueGetLabel` | `GET` | `/repos/{owner}/{repo}/labels/{id}` | `E:label.catalog.v1` | Get a single label |
| `CodebergRestClient.issueGetLabels` | `GET` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Get an issue's labels |
| `CodebergRestClient.issueGetMilestone` | `GET` | `/repos/{owner}/{repo}/milestones/{id}` | `E:milestone.catalog.v1` | Get a milestone |
| `CodebergRestClient.issueGetMilestonesList` | `GET` | `/repos/{owner}/{repo}/milestones` | `E:milestone.catalog.v1` | Get all of a repository's opened milestones |
| `CodebergRestClient.issueGetRepoComments` | `GET` | `/repos/{owner}/{repo}/issues/comments` | Unmatched | List all comments in a repository |
| `CodebergRestClient.issueListBlocks` | `GET` | `/repos/{owner}/{repo}/issues/{index}/blocks` | Unmatched | List issues that are blocked by this issue |
| `CodebergRestClient.issueListIssueAttachments` | `GET` | `/repos/{owner}/{repo}/issues/{index}/assets` | Unmatched | List issue's attachments |
| `CodebergRestClient.issueListIssueCommentAttachments` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}/assets` | Unmatched | List comment's attachments |
| `CodebergRestClient.issueListIssueDependencies` | `GET` | `/repos/{owner}/{repo}/issues/{index}/dependencies` | Unmatched | List an issue's dependencies, i.e all issues that block this issue. |
| `CodebergRestClient.issueListIssues` | `GET` | `/repos/{owner}/{repo}/issues` | `E:issue.read.v1` | List a repository's issues |
| `CodebergRestClient.issueListLabels` | `GET` | `/repos/{owner}/{repo}/labels` | `E:label.catalog.v1` | Get all of a repository's labels |
| `CodebergRestClient.issuePostCommentReaction` | `POST` | `/repos/{owner}/{repo}/issues/comments/{id}/reactions` | Unmatched | Add a reaction to a comment of an issue |
| `CodebergRestClient.issuePostIssueReaction` | `POST` | `/repos/{owner}/{repo}/issues/{index}/reactions` | Unmatched | Add a reaction to an issue |
| `CodebergRestClient.issueRemoveIssueBlocking` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/blocks` | Unmatched | Unblock the issue given in the body by the issue in path |
| `CodebergRestClient.issueRemoveIssueDependencies` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/dependencies` | Unmatched | Remove an issue dependency |
| `CodebergRestClient.issueRemoveLabel` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/labels/{identifier}` | Unmatched | Remove a label from an issue |
| `CodebergRestClient.issueReplaceLabels` | `PUT` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Replace an issue's labels |
| `CodebergRestClient.issueResetTime` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/times` | Unmatched | Reset a tracked time of an issue |
| `CodebergRestClient.issueSearchIssues` | `GET` | `/repos/issues/search` | Unmatched | Search for issues across the repositories that the user has access to |
| `CodebergRestClient.issueStartStopWatch` | `POST` | `/repos/{owner}/{repo}/issues/{index}/stopwatch/start` | Unmatched | Start stopwatch on an issue. |
| `CodebergRestClient.issueStopStopWatch` | `POST` | `/repos/{owner}/{repo}/issues/{index}/stopwatch/stop` | Unmatched | Stop an issue's existing stopwatch. |
| `CodebergRestClient.issueSubscriptions` | `GET` | `/repos/{owner}/{repo}/issues/{index}/subscriptions` | Unmatched | Get users who subscribed on an issue. |
| `CodebergRestClient.issueTrackedTimes` | `GET` | `/repos/{owner}/{repo}/issues/{index}/times` | Unmatched | List an issue's tracked times |
| `CodebergRestClient.moveIssuePin` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}/pin/{position}` | Unmatched | Moves the Pin to the given Position |
| `CodebergRestClient.pinIssue` | `POST` | `/repos/{owner}/{repo}/issues/{index}/pin` | Unmatched | Pin an Issue |
| `CodebergRestClient.unpinIssue` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/pin` | Unmatched | Unpin an Issue |

</details>

<details>
<summary><strong>miscellaneous</strong> (14)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.getActionsRun` | `GET` | `/actions/run` | `P:ci.run.v1`<br>`U:codeberg.action-token-context` | Get a workflow run associated with a token |
| `CodebergRestClient.getGitignoreTemplateInfo` | `GET` | `/gitignore/templates/{name}` | Unmatched | Returns information about a gitignore template |
| `CodebergRestClient.getLabelTemplateInfo` | `GET` | `/label/templates/{name}` | Unmatched | Returns all labels in a template |
| `CodebergRestClient.getLicenseTemplateInfo` | `GET` | `/licenses/{name}` | Unmatched | Returns information about a license template |
| `CodebergRestClient.getNodeInfo` | `GET` | `/nodeinfo` | Unmatched | Returns the nodeinfo of the Forgejo application |
| `CodebergRestClient.getSigningKey` | `GET` | `/signing-key.gpg` | Unmatched | Get default signing-key.gpg |
| `CodebergRestClient.getSshSigningKey` | `GET` | `/signing-key.ssh` | Unmatched | Get default signing-key.ssh |
| `CodebergRestClient.getVersion` | `GET` | `/version` | Unmatched | Returns the version of the running application |
| `CodebergRestClient.listGitignoresTemplates` | `GET` | `/gitignore/templates` | Unmatched | Returns a list of all gitignore templates |
| `CodebergRestClient.listLabelTemplates` | `GET` | `/label/templates` | Unmatched | Returns a list of all label templates |
| `CodebergRestClient.listLicenseTemplates` | `GET` | `/licenses` | Unmatched | Returns a list of all license templates |
| `CodebergRestClient.renderMarkdown` | `POST` | `/markdown` | Unmatched | Render a markdown document as HTML |
| `CodebergRestClient.renderMarkdownRaw` | `POST` | `/markdown/raw` | Unmatched | Render raw markdown as HTML |
| `CodebergRestClient.renderMarkup` | `POST` | `/markup` | Unmatched | Render a markup document as HTML |

</details>

<details>
<summary><strong>notification</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.notifyGetList` | `GET` | `/notifications` | `E:notification.read-state.v1` | List users's notification threads |
| `CodebergRestClient.notifyGetRepoList` | `GET` | `/repos/{owner}/{repo}/notifications` | `E:notification.read-state.v1` | List users's notification threads on a specific repo |
| `CodebergRestClient.notifyGetThread` | `GET` | `/notifications/threads/{id}` | Unmatched | Get notification thread by ID |
| `CodebergRestClient.notifyNewAvailable` | `GET` | `/notifications/new` | Unmatched | Check if unread notifications exist |
| `CodebergRestClient.notifyReadList` | `PUT` | `/notifications` | `E:notification.read-state.v1` | Mark notification threads as read, pinned or unread |
| `CodebergRestClient.notifyReadRepoList` | `PUT` | `/repos/{owner}/{repo}/notifications` | Unmatched | Mark notification threads as read, pinned or unread on a specific repo |
| `CodebergRestClient.notifyReadThread` | `PATCH` | `/notifications/threads/{id}` | `E:notification.read-state.v1` | Mark notification thread as read by ID |

</details>

<details>
<summary><strong>organization</strong> (69)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.createOrgRepo` | `POST` | `/orgs/{org}/repos` | `E:repository.create.v1` | Create a repository in an organization |
| `CodebergRestClient.createOrgRepoDeprecated` | `POST` | `/org/{org}/repos` | Unmatched | [Deprecated] Create a repository in an organization |
| `CodebergRestClient.createOrgVariable` | `POST` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Create a new variable in organization |
| `CodebergRestClient.deleteOrgRunner` | `DELETE` | `/orgs/{org}/actions/runners/{runner_id}` | Unmatched | Delete a particular runner that belongs to the organization |
| `CodebergRestClient.deleteOrgSecret` | `DELETE` | `/orgs/{org}/actions/secrets/{secretname}` | Unmatched | Delete a secret in an organization |
| `CodebergRestClient.deleteOrgVariable` | `DELETE` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Delete organization's variable by name |
| `CodebergRestClient.getOrgRunner` | `GET` | `/orgs/{org}/actions/runners/{runner_id}` | Unmatched | Get a particular runner that belongs to the organization |
| `CodebergRestClient.getOrgRunners` | `GET` | `/orgs/{org}/actions/runners` | Unmatched | Get the organization's runners |
| `CodebergRestClient.getOrgVariable` | `GET` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Get organization's variable by name |
| `CodebergRestClient.getOrgVariablesList` | `GET` | `/orgs/{org}/actions/variables` | Unmatched | List variables of an organization |
| `CodebergRestClient.orgAddTeamMember` | `PUT` | `/teams/{id}/members/{username}` | `E:team.crud.v1` | Add a team member |
| `CodebergRestClient.orgAddTeamRepository` | `PUT` | `/teams/{id}/repos/{org}/{repo}` | Unmatched | Add a repository to a team |
| `CodebergRestClient.orgBlockUser` | `PUT` | `/orgs/{org}/block/{username}` | Unmatched | Blocks a user from the organization |
| `CodebergRestClient.orgCheckQuota` | `GET` | `/orgs/{org}/quota/check` | Unmatched | Check if the organization is over quota for a given subject |
| `CodebergRestClient.orgConcealMember` | `DELETE` | `/orgs/{org}/public_members/{username}` | Unmatched | Conceal a user's membership |
| `CodebergRestClient.orgCreate` | `POST` | `/orgs` | Unmatched | Create an organization |
| `CodebergRestClient.orgCreateHook` | `POST` | `/orgs/{org}/hooks` | Unmatched | Create a hook |
| `CodebergRestClient.orgCreateLabel` | `POST` | `/orgs/{org}/labels` | Unmatched | Create a label for an organization |
| `CodebergRestClient.orgCreateTeam` | `POST` | `/orgs/{org}/teams` | `E:team.crud.v1` | Create a team |
| `CodebergRestClient.orgDelete` | `DELETE` | `/orgs/{org}` | Unmatched | Delete an organization |
| `CodebergRestClient.orgDeleteAvatar` | `DELETE` | `/orgs/{org}/avatar` | Unmatched | Delete an organization's avatar. It will be replaced by a default one |
| `CodebergRestClient.orgDeleteHook` | `DELETE` | `/orgs/{org}/hooks/{id}` | Unmatched | Delete a hook |
| `CodebergRestClient.orgDeleteLabel` | `DELETE` | `/orgs/{org}/labels/{id}` | Unmatched | Delete a label |
| `CodebergRestClient.orgDeleteMember` | `DELETE` | `/orgs/{org}/members/{username}` | Unmatched | Remove a member from an organization |
| `CodebergRestClient.orgDeleteTeam` | `DELETE` | `/teams/{id}` | `E:team.crud.v1` | Delete a team |
| `CodebergRestClient.orgEdit` | `PATCH` | `/orgs/{org}` | Unmatched | Edit an organization |
| `CodebergRestClient.orgEditHook` | `PATCH` | `/orgs/{org}/hooks/{id}` | Unmatched | Update a hook |
| `CodebergRestClient.orgEditLabel` | `PATCH` | `/orgs/{org}/labels/{id}` | Unmatched | Update a label |
| `CodebergRestClient.orgEditTeam` | `PATCH` | `/teams/{id}` | `E:team.crud.v1` | Edit a team |
| `CodebergRestClient.orgGet` | `GET` | `/orgs/{org}` | `E:namespace.read.v1` | Get an organization |
| `CodebergRestClient.orgGetAll` | `GET` | `/orgs` | `E:namespace.read.v1` | List all organizations |
| `CodebergRestClient.orgGetHook` | `GET` | `/orgs/{org}/hooks/{id}` | Unmatched | Get a hook |
| `CodebergRestClient.orgGetLabel` | `GET` | `/orgs/{org}/labels/{id}` | Unmatched | Get a single label |
| `CodebergRestClient.orgGetQuota` | `GET` | `/orgs/{org}/quota` | `U:codeberg.quotas` | Get quota information for an organization |
| `CodebergRestClient.orgGetRunnerRegistrationToken` | `GET` | `/orgs/{org}/actions/runners/registration-token` | Unmatched | [Deprecated] Get the organization's runner registration token |
| `CodebergRestClient.orgGetTeam` | `GET` | `/teams/{id}` | `E:team.crud.v1` | Get a team |
| `CodebergRestClient.orgGetUserPermissions` | `GET` | `/users/{username}/orgs/{org}/permissions` | Unmatched | Get user permissions in organization |
| `CodebergRestClient.orgIsMember` | `GET` | `/orgs/{org}/members/{username}` | Unmatched | Check if a user is a member of an organization |
| `CodebergRestClient.orgIsPublicMember` | `GET` | `/orgs/{org}/public_members/{username}` | Unmatched | Check if a user is a public member of an organization |
| `CodebergRestClient.orgListActionsSecrets` | `GET` | `/orgs/{org}/actions/secrets` | Unmatched | List actions secrets of an organization |
| `CodebergRestClient.orgListActivityFeeds` | `GET` | `/orgs/{org}/activities/feeds` | Unmatched | List an organization's activity feeds |
| `CodebergRestClient.orgListBlockedUsers` | `GET` | `/orgs/{org}/list_blocked` | Unmatched | List the organization's blocked users |
| `CodebergRestClient.orgListCurrentUserOrgs` | `GET` | `/user/orgs` | Unmatched | List the current user's organizations |
| `CodebergRestClient.orgListHooks` | `GET` | `/orgs/{org}/hooks` | Unmatched | List an organization's webhooks |
| `CodebergRestClient.orgListLabels` | `GET` | `/orgs/{org}/labels` | Unmatched | List an organization's labels |
| `CodebergRestClient.orgListMembers` | `GET` | `/orgs/{org}/members` | `E:namespace.members.read.v1` | List an organization's members |
| `CodebergRestClient.orgListPublicMembers` | `GET` | `/orgs/{org}/public_members` | `E:namespace.members.read.v1` | List an organization's public members |
| `CodebergRestClient.orgListQuotaArtifacts` | `GET` | `/orgs/{org}/quota/artifacts` | Unmatched | List the artifacts affecting the organization's quota |
| `CodebergRestClient.orgListQuotaAttachments` | `GET` | `/orgs/{org}/quota/attachments` | Unmatched | List the attachments affecting the organization's quota |
| `CodebergRestClient.orgListQuotaPackages` | `GET` | `/orgs/{org}/quota/packages` | Unmatched | List the packages affecting the organization's quota |
| `CodebergRestClient.orgListRepos` | `GET` | `/orgs/{org}/repos` | `E:repository.list.v1` | List an organization's repos |
| `CodebergRestClient.orgListTeamActivityFeeds` | `GET` | `/teams/{id}/activities/feeds` | Unmatched | List a team's activity feeds |
| `CodebergRestClient.orgListTeamMember` | `GET` | `/teams/{id}/members/{username}` | Unmatched | List a particular member of team |
| `CodebergRestClient.orgListTeamMembers` | `GET` | `/teams/{id}/members` | `E:team.crud.v1` | List a team's members |
| `CodebergRestClient.orgListTeamRepo` | `GET` | `/teams/{id}/repos/{org}/{repo}` | Unmatched | List a particular repo of team |
| `CodebergRestClient.orgListTeamRepos` | `GET` | `/teams/{id}/repos` | Unmatched | List a team's repos |
| `CodebergRestClient.orgListTeams` | `GET` | `/orgs/{org}/teams` | `E:team.crud.v1` | List an organization's teams |
| `CodebergRestClient.orgListUserOrgs` | `GET` | `/users/{username}/orgs` | Unmatched | List a user's organizations |
| `CodebergRestClient.orgPublicizeMember` | `PUT` | `/orgs/{org}/public_members/{username}` | Unmatched | Publicize a user's membership |
| `CodebergRestClient.orgRemoveTeamMember` | `DELETE` | `/teams/{id}/members/{username}` | `E:team.crud.v1` | Remove a team member |
| `CodebergRestClient.orgRemoveTeamRepository` | `DELETE` | `/teams/{id}/repos/{org}/{repo}` | Unmatched | Remove a repository from a team |
| `CodebergRestClient.orgSearchRunJobs` | `GET` | `/orgs/{org}/actions/runners/jobs` | Unmatched | Search for organization's action jobs according filter conditions |
| `CodebergRestClient.orgUnblockUser` | `PUT` | `/orgs/{org}/unblock/{username}` | Unmatched | Unblock a user from the organization |
| `CodebergRestClient.orgUpdateAvatar` | `POST` | `/orgs/{org}/avatar` | Unmatched | Update an organization's avatar |
| `CodebergRestClient.registerOrgRunner` | `POST` | `/orgs/{org}/actions/runners` | `P:ci.runners.v1` | Register a new organization-level runner |
| `CodebergRestClient.renameOrg` | `POST` | `/orgs/{org}/rename` | Unmatched | Rename an organization |
| `CodebergRestClient.teamSearch` | `GET` | `/orgs/{org}/teams/search` | Unmatched | Search for teams within an organization |
| `CodebergRestClient.updateOrgSecret` | `PUT` | `/orgs/{org}/actions/secrets/{secretname}` | Unmatched | Create or Update a secret value in an organization |
| `CodebergRestClient.updateOrgVariable` | `PUT` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Update variable in organization |

</details>

<details>
<summary><strong>package</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.deletePackage` | `DELETE` | `/packages/{owner}/{type}/{name}/{version}` | `P:packages.metadata.v1` | Delete a package |
| `CodebergRestClient.getPackage` | `GET` | `/packages/{owner}/{type}/{name}/{version}` | `P:packages.metadata.v1` | Gets a package |
| `CodebergRestClient.linkPackage` | `POST` | `/packages/{owner}/{type}/{name}/-/link/{repo_name}` | Unmatched | Link a package to a repository |
| `CodebergRestClient.listPackageFiles` | `GET` | `/packages/{owner}/{type}/{name}/{version}/files` | `P:packages.metadata.v1` | Gets all files of a package |
| `CodebergRestClient.listPackages` | `GET` | `/packages/{owner}` | `P:packages.metadata.v1` | Gets all packages of an owner |
| `CodebergRestClient.unlinkPackage` | `POST` | `/packages/{owner}/{type}/{name}/-/unlink` | Unmatched | Unlink a package from a repository |

</details>

<details>
<summary><strong>repository</strong> (198)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.acceptRepoTransfer` | `POST` | `/repos/{owner}/{repo}/transfer/accept` | Unmatched | Accept a repo transfer |
| `CodebergRestClient.actionRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}` | Unmatched | Get an action run |
| `CodebergRestClient.cancelActionRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/cancel` | `P:ci.run.v1` | Cancel a pending or running workflow run. |
| `CodebergRestClient.createCurrentUserRepo` | `POST` | `/user/repos` | `E:repository.create.v1` | Create a repository |
| `CodebergRestClient.createFork` | `POST` | `/repos/{owner}/{repo}/forks` | `E:repository.fork.create.v1` | Fork a repository |
| `CodebergRestClient.createRepoVariable` | `POST` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Create a repo-level variable |
| `CodebergRestClient.deleteActionArtifact` | `DELETE` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | `P:ci.artifacts.v1` | Mark an artifact for deletion |
| `CodebergRestClient.deleteActionRun` | `DELETE` | `/repos/{owner}/{repo}/actions/runs/{run_id}` | Unmatched | Delete a completed workflow run. |
| `CodebergRestClient.deleteRepoRunner` | `DELETE` | `/repos/{owner}/{repo}/actions/runners/{runner_id}` | Unmatched | Delete a particular runner that belongs to a repository |
| `CodebergRestClient.deleteRepoSecret` | `DELETE` | `/repos/{owner}/{repo}/actions/secrets/{secretname}` | Unmatched | Delete a secret in a repository |
| `CodebergRestClient.deleteRepoVariable` | `DELETE` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Delete a repo-level variable |
| `CodebergRestClient.dispatchWorkflow` | `POST` | `/repos/{owner}/{repo}/actions/workflows/{workflowfilename}/dispatches` | `P:ci.run.v1` | Dispatches a workflow |
| `CodebergRestClient.downloadActionArtifact` | `GET` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip` | `P:ci.artifacts.v1` | Download an artifact |
| `CodebergRestClient.generateRepo` | `POST` | `/repos/{template_owner}/{template_repo}/generate` | Unmatched | Create a repository using a template |
| `CodebergRestClient.getActionArtifact` | `GET` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | `P:ci.artifacts.v1` | Get an artifact by ID |
| `CodebergRestClient.getAnnotatedTag` | `GET` | `/repos/{owner}/{repo}/git/tags/{sha}` | Unmatched | Gets the tag object of an annotated tag (not lightweight tags) |
| `CodebergRestClient.getBlob` | `GET` | `/repos/{owner}/{repo}/git/blobs/{sha}` | `E:git.blob.read.v1` | Gets the blob of a repository. |
| `CodebergRestClient.getBlobs` | `GET` | `/repos/{owner}/{repo}/git/blobs` | Unmatched | Gets multiple blobs of a repository. |
| `CodebergRestClient.getRepoRunner` | `GET` | `/repos/{owner}/{repo}/actions/runners/{runner_id}` | Unmatched | Get a particular runner that belongs to the repository |
| `CodebergRestClient.getRepoRunners` | `GET` | `/repos/{owner}/{repo}/actions/runners` | Unmatched | Get runners belonging to the repository |
| `CodebergRestClient.getRepoVariable` | `GET` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Get a repo-level variable |
| `CodebergRestClient.getRepoVariablesList` | `GET` | `/repos/{owner}/{repo}/actions/variables` | Unmatched | Get repo-level variables list |
| `CodebergRestClient.getTree` | `GET` | `/repos/{owner}/{repo}/git/trees/{sha}` | `E:git.tree.read.v1` | Gets the tree of a repository. |
| `CodebergRestClient.listActionArtifacts` | `GET` | `/repos/{owner}/{repo}/actions/artifacts` | `P:ci.artifacts.v1` | List a repository's artifacts |
| `CodebergRestClient.listActionRunArtifacts` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts` | `P:ci.artifacts.v1` | List artifacts of a workflow run |
| `CodebergRestClient.listActionRunJobs` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/jobs` | `P:ci.jobs-logs.v1` | List jobs of a workflow run |
| `CodebergRestClient.listActionRuns` | `GET` | `/repos/{owner}/{repo}/actions/runs` | `P:ci.run.v1` | List a repository's action runs |
| `CodebergRestClient.listActionTasks` | `GET` | `/repos/{owner}/{repo}/actions/tasks` | `P:ci.jobs-logs.v1` | List a repository's action tasks |
| `CodebergRestClient.listForks` | `GET` | `/repos/{owner}/{repo}/forks` | `E:repository.fork.list.v1` | List a repository's forks |
| `CodebergRestClient.registerRepoRunner` | `POST` | `/repos/{owner}/{repo}/actions/runners` | `P:ci.runners.v1` | Register a new repository-level runner |
| `CodebergRestClient.rejectRepoTransfer` | `POST` | `/repos/{owner}/{repo}/transfer/reject` | Unmatched | Reject a repo transfer |
| `CodebergRestClient.repoAddCollaborator` | `PUT` | `/repos/{owner}/{repo}/collaborators/{collaborator}` | Unmatched | Add a collaborator to a repository |
| `CodebergRestClient.repoAddFlag` | `PUT` | `/repos/{owner}/{repo}/flags/{flag}` | Unmatched | Add a flag to a repository |
| `CodebergRestClient.repoAddPushMirror` | `POST` | `/repos/{owner}/{repo}/push_mirrors` | Unmatched | Set up a new push mirror in a repository |
| `CodebergRestClient.repoAddTeam` | `PUT` | `/repos/{owner}/{repo}/teams/{team}` | Unmatched | Add a team to a repository |
| `CodebergRestClient.repoAddTopic` | `PUT` | `/repos/{owner}/{repo}/topics/{topic}` | Unmatched | Add a topic to a repository |
| `CodebergRestClient.repoApplyDiffPatch` | `POST` | `/repos/{owner}/{repo}/diffpatch` | Unmatched | Apply diff patch to repository |
| `CodebergRestClient.repoCancelScheduledAutoMerge` | `DELETE` | `/repos/{owner}/{repo}/pulls/{index}/merge` | Unmatched | Cancel the scheduled auto merge for the given pull request |
| `CodebergRestClient.repoChangeFiles` | `POST` | `/repos/{owner}/{repo}/contents` | `E:content.write.v1` | Modify multiple files in a repository |
| `CodebergRestClient.repoCheckCollaborator` | `GET` | `/repos/{owner}/{repo}/collaborators/{collaborator}` | `E:collaborator.read.v1` | Check if a user is a collaborator of a repository |
| `CodebergRestClient.repoCheckFlag` | `GET` | `/repos/{owner}/{repo}/flags/{flag}` | Unmatched | Check if a repository has a given flag |
| `CodebergRestClient.repoCheckTeam` | `GET` | `/repos/{owner}/{repo}/teams/{team}` | Unmatched | Check if a team is assigned to a repository |
| `CodebergRestClient.repoCompareDiff` | `GET` | `/repos/{owner}/{repo}/compare/{basehead}` | `E:commit.compare.v1` | Get commit comparison information |
| `CodebergRestClient.repoConvert` | `POST` | `/repos/{owner}/{repo}/convert` | Unmatched | Convert a mirror repo to a normal repo. |
| `CodebergRestClient.repoCreateBranch` | `POST` | `/repos/{owner}/{repo}/branches` | `E:branch.create.v1` | Create a branch |
| `CodebergRestClient.repoCreateBranchProtection` | `POST` | `/repos/{owner}/{repo}/branch_protections` | `E:branch.protection.write.v1` | Create a branch protections for a repository |
| `CodebergRestClient.repoCreateFile` | `POST` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.write.v1` | Create a file in a repository |
| `CodebergRestClient.repoCreateHook` | `POST` | `/repos/{owner}/{repo}/hooks` | `E:webhook.crud.v1` | Create a hook |
| `CodebergRestClient.repoCreateKey` | `POST` | `/repos/{owner}/{repo}/keys` | `E:deploy-key.crud.v1` | Add a key to a repository |
| `CodebergRestClient.repoCreatePullRequest` | `POST` | `/repos/{owner}/{repo}/pulls` | `E:pull-request.core.v1` | Create a pull request |
| `CodebergRestClient.repoCreatePullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews` | `E:pull-request.review.v1` | Create a review to an pull request |
| `CodebergRestClient.repoCreatePullReviewComment` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/comments` | Unmatched | Add a new comment to a pull request review |
| `CodebergRestClient.repoCreatePullReviewRequests` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/requested_reviewers` | `E:pull-request.reviewers.v1` | Create review requests for a pull request |
| `CodebergRestClient.repoCreateRelease` | `POST` | `/repos/{owner}/{repo}/releases` | `E:release.crud.v1` | Create a release |
| `CodebergRestClient.repoCreateReleaseAttachment` | `POST` | `/repos/{owner}/{repo}/releases/{id}/assets` | Unmatched | Create a release attachment |
| `CodebergRestClient.repoCreateStatus` | `POST` | `/repos/{owner}/{repo}/statuses/{sha}` | `E:commit-status.v1` | Create a commit status |
| `CodebergRestClient.repoCreateTag` | `POST` | `/repos/{owner}/{repo}/tags` | `E:tag.create-delete.v1` | Create a new git tag in a repository |
| `CodebergRestClient.repoCreateTagProtection` | `POST` | `/repos/{owner}/{repo}/tag_protections` | Unmatched | Create a tag protections for a repository |
| `CodebergRestClient.repoCreateWikiPage` | `POST` | `/repos/{owner}/{repo}/wiki/new` | `E:wiki.crud.v1` | Create a wiki page |
| `CodebergRestClient.repoDelete` | `DELETE` | `/repos/{owner}/{repo}` | `E:repository.delete.v1` | Delete a repository |
| `CodebergRestClient.repoDeleteAllFlags` | `DELETE` | `/repos/{owner}/{repo}/flags` | Unmatched | Remove all flags from a repository |
| `CodebergRestClient.repoDeleteAvatar` | `DELETE` | `/repos/{owner}/{repo}/avatar` | Unmatched | Delete a repository's avatar |
| `CodebergRestClient.repoDeleteBranch` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}` | `E:branch.delete.v1` | Delete a specific branch from a repository |
| `CodebergRestClient.repoDeleteBranchProtection` | `DELETE` | `/repos/{owner}/{repo}/branch_protections/{name}` | `E:branch.protection.write.v1` | Delete a specific branch protection for the repository |
| `CodebergRestClient.repoDeleteCollaborator` | `DELETE` | `/repos/{owner}/{repo}/collaborators/{collaborator}` | Unmatched | Delete a collaborator from a repository |
| `CodebergRestClient.repoDeleteFile` | `DELETE` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.write.v1` | Delete a file in a repository |
| `CodebergRestClient.repoDeleteFlag` | `DELETE` | `/repos/{owner}/{repo}/flags/{flag}` | Unmatched | Remove a flag from a repository |
| `CodebergRestClient.repoDeleteGitHook` | `DELETE` | `/repos/{owner}/{repo}/hooks/git/{id}` | Unmatched | Delete a Git hook in a repository |
| `CodebergRestClient.repoDeleteHook` | `DELETE` | `/repos/{owner}/{repo}/hooks/{id}` | `E:webhook.crud.v1` | Delete a hook in a repository |
| `CodebergRestClient.repoDeleteKey` | `DELETE` | `/repos/{owner}/{repo}/keys/{id}` | `E:deploy-key.crud.v1` | Delete a key from a repository |
| `CodebergRestClient.repoDeletePullReview` | `DELETE` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}` | Unmatched | Delete a specific review from a pull request |
| `CodebergRestClient.repoDeletePullReviewComment` | `DELETE` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/comments/{comment}` | Unmatched | Delete a pull review comment |
| `CodebergRestClient.repoDeletePullReviewRequests` | `DELETE` | `/repos/{owner}/{repo}/pulls/{index}/requested_reviewers` | `E:pull-request.reviewers.v1` | Cancel review requests for a pull request |
| `CodebergRestClient.repoDeletePushMirror` | `DELETE` | `/repos/{owner}/{repo}/push_mirrors/{name}` | Unmatched | Remove a push mirror from a repository by remoteName |
| `CodebergRestClient.repoDeleteRelease` | `DELETE` | `/repos/{owner}/{repo}/releases/{id}` | `E:release.crud.v1` | Delete a release |
| `CodebergRestClient.repoDeleteReleaseAttachment` | `DELETE` | `/repos/{owner}/{repo}/releases/{id}/assets/{attachment_id}` | Unmatched | Delete a release attachment |
| `CodebergRestClient.repoDeleteReleaseByTag` | `DELETE` | `/repos/{owner}/{repo}/releases/tags/{tag}` | Unmatched | Delete a release by tag name |
| `CodebergRestClient.repoDeleteTag` | `DELETE` | `/repos/{owner}/{repo}/tags/{tag}` | `E:tag.create-delete.v1` | Delete a repository's tag by name |
| `CodebergRestClient.repoDeleteTagProtection` | `DELETE` | `/repos/{owner}/{repo}/tag_protections/{id}` | Unmatched | Delete a specific tag protection for the repository |
| `CodebergRestClient.repoDeleteTeam` | `DELETE` | `/repos/{owner}/{repo}/teams/{team}` | Unmatched | Delete a team from a repository |
| `CodebergRestClient.repoDeleteTopic` | `DELETE` | `/repos/{owner}/{repo}/topics/{topic}` | Unmatched | Delete a topic from a repository |
| `CodebergRestClient.repoDeleteWikiPage` | `DELETE` | `/repos/{owner}/{repo}/wiki/page/{pageName}` | `E:wiki.crud.v1` | Delete a wiki page |
| `CodebergRestClient.repoDismissPullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/dismissals` | `E:pull-request.review.v1` | Dismiss a review for a pull request |
| `CodebergRestClient.repoDownloadCommitDiffOrPatch` | `GET` | `/repos/{owner}/{repo}/git/commits/{sha}.{diffType}` | Unmatched | Get a commit's diff or patch |
| `CodebergRestClient.repoDownloadPullDiffOrPatch` | `GET` | `/repos/{owner}/{repo}/pulls/{index}.{diffType}` | `E:pull-request.changes.v1` | Get a pull request diff or patch |
| `CodebergRestClient.repoEdit` | `PATCH` | `/repos/{owner}/{repo}` | `P:repository.archive.v1`<br>`E:repository.update.v1` | Edit a repository's properties. Only fields that are set will be changed. |
| `CodebergRestClient.repoEditBranchProtection` | `PATCH` | `/repos/{owner}/{repo}/branch_protections/{name}` | `E:branch.protection.write.v1` | Edit a branch protections for a repository. Only fields that are set will be changed |
| `CodebergRestClient.repoEditGitHook` | `PATCH` | `/repos/{owner}/{repo}/hooks/git/{id}` | Unmatched | Edit a Git hook in a repository |
| `CodebergRestClient.repoEditHook` | `PATCH` | `/repos/{owner}/{repo}/hooks/{id}` | `E:webhook.crud.v1` | Edit a hook in a repository |
| `CodebergRestClient.repoEditPullRequest` | `PATCH` | `/repos/{owner}/{repo}/pulls/{index}` | `E:pull-request.core.v1` | Update a pull request. If using deadline only the date will be taken into account, and time of day ignored. |
| `CodebergRestClient.repoEditRelease` | `PATCH` | `/repos/{owner}/{repo}/releases/{id}` | `E:release.crud.v1` | Update a release |
| `CodebergRestClient.repoEditReleaseAttachment` | `PATCH` | `/repos/{owner}/{repo}/releases/{id}/assets/{attachment_id}` | Unmatched | Edit a release attachment |
| `CodebergRestClient.repoEditTagProtection` | `PATCH` | `/repos/{owner}/{repo}/tag_protections/{id}` | Unmatched | Edit a tag protections for a repository. Only fields that are set will be changed |
| `CodebergRestClient.repoEditWikiPage` | `PATCH` | `/repos/{owner}/{repo}/wiki/page/{pageName}` | `E:wiki.crud.v1` | Edit a wiki page |
| `CodebergRestClient.repoGet` | `GET` | `/repos/{owner}/{repo}` | `E:repository.get.v1` | Get a repository |
| `CodebergRestClient.repoGetActionJobLogs` | `GET` | `/repos/{owner}/{repo}/actions/jobs/{job_id}/logs` | `P:ci.jobs-logs.v1` | Download the plaintext logs of an action job |
| `CodebergRestClient.repoGetActionRunLogs` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/logs` | `P:ci.jobs-logs.v1` | Download a ZIP of plaintext logs for every job in an action run |
| `CodebergRestClient.repoGetAllCommits` | `GET` | `/repos/{owner}/{repo}/commits` | `E:commit.list.v1` | Get a list of all commits from a repository |
| `CodebergRestClient.repoGetArchive` | `GET` | `/repos/{owner}/{repo}/archive/{archive}` | Unmatched | Get an archive of a repository |
| `CodebergRestClient.repoGetAssignees` | `GET` | `/repos/{owner}/{repo}/assignees` | Unmatched | Return all users that have write access and can be assigned to issues |
| `CodebergRestClient.repoGetBranch` | `GET` | `/repos/{owner}/{repo}/branches/{branch}` | `E:branch.get.v1` | Retrieve a specific branch from a repository, including its effective branch protection |
| `CodebergRestClient.repoGetBranchProtection` | `GET` | `/repos/{owner}/{repo}/branch_protections/{name}` | `E:branch.protection.read.v1` | Get a specific branch protection for the repository |
| `CodebergRestClient.repoGetById` | `GET` | `/repositories/{id}` | `E:repository.get.v1` | Get a repository by id |
| `CodebergRestClient.repoGetCombinedStatusByRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/status` | Unmatched | Get a commit's combined status, by branch/tag/commit reference |
| `CodebergRestClient.repoGetCommitPullRequest` | `GET` | `/repos/{owner}/{repo}/commits/{sha}/pull` | Unmatched | Get the pull request of the commit |
| `CodebergRestClient.repoGetContents` | `GET` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.read.v1` | Gets the metadata and contents (if a file) of an entry in a repository, or a list of entries if a dir |
| `CodebergRestClient.repoGetContentsList` | `GET` | `/repos/{owner}/{repo}/contents` | `E:content.read.v1` | Gets the metadata of all the entries of the root dir |
| `CodebergRestClient.repoGetEditorConfig` | `GET` | `/repos/{owner}/{repo}/editorconfig/{filepath}` | Unmatched | Get the EditorConfig definitions of a file in a repository |
| `CodebergRestClient.repoGetGitHook` | `GET` | `/repos/{owner}/{repo}/hooks/git/{id}` | Unmatched | Get a Git hook |
| `CodebergRestClient.repoGetHook` | `GET` | `/repos/{owner}/{repo}/hooks/{id}` | `E:webhook.crud.v1` | Get a hook |
| `CodebergRestClient.repoGetIssueConfig` | `GET` | `/repos/{owner}/{repo}/issue_config` | Unmatched | Returns the issue config for a repo |
| `CodebergRestClient.repoGetIssueTemplates` | `GET` | `/repos/{owner}/{repo}/issue_templates` | Unmatched | Get available issue templates for a repository |
| `CodebergRestClient.repoGetKey` | `GET` | `/repos/{owner}/{repo}/keys/{id}` | `E:deploy-key.crud.v1` | Get a repository's key by id |
| `CodebergRestClient.repoGetLanguages` | `GET` | `/repos/{owner}/{repo}/languages` | Unmatched | Get languages and number of bytes of code written |
| `CodebergRestClient.repoGetLatestRelease` | `GET` | `/repos/{owner}/{repo}/releases/latest` | Unmatched | Gets the most recent non-prerelease, non-draft release of a repository, sorted by created_at |
| `CodebergRestClient.repoGetNote` | `GET` | `/repos/{owner}/{repo}/git/notes/{sha}` | Unmatched | Get a note corresponding to a single commit from a repository |
| `CodebergRestClient.repoGetPullRequest` | `GET` | `/repos/{owner}/{repo}/pulls/{index}` | `E:pull-request.core.v1` | Get a pull request |
| `CodebergRestClient.repoGetPullRequestByBaseHead` | `GET` | `/repos/{owner}/{repo}/pulls/{base}/{head}` | Unmatched | Get a pull request by base and head |
| `CodebergRestClient.repoGetPullRequestCommits` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/commits` | `E:pull-request.changes.v1` | Get commits for a pull request |
| `CodebergRestClient.repoGetPullRequestFiles` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/files` | `E:pull-request.changes.v1` | Get changed files for a pull request |
| `CodebergRestClient.repoGetPullReview` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}` | `E:pull-request.review.v1` | Get a specific review for a pull request |
| `CodebergRestClient.repoGetPullReviewComment` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/comments/{comment}` | Unmatched | Get a pull review comment |
| `CodebergRestClient.repoGetPullReviewComments` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/comments` | `P:pull-request.comments.v1` | Get a specific review for a pull request |
| `CodebergRestClient.repoGetPushMirrorByRemoteName` | `GET` | `/repos/{owner}/{repo}/push_mirrors/{name}` | Unmatched | Get push mirror of the repository by remoteName |
| `CodebergRestClient.repoGetRawFile` | `GET` | `/repos/{owner}/{repo}/raw/{filepath}` | `E:content.read.v1` | Get a file from a repository |
| `CodebergRestClient.repoGetRawFileOrLfs` | `GET` | `/repos/{owner}/{repo}/media/{filepath}` | Unmatched | Get a file or it's LFS object from a repository |
| `CodebergRestClient.repoGetRelease` | `GET` | `/repos/{owner}/{repo}/releases/{id}` | `E:release.crud.v1` | Get a release |
| `CodebergRestClient.repoGetReleaseAttachment` | `GET` | `/repos/{owner}/{repo}/releases/{id}/assets/{attachment_id}` | Unmatched | Get a release attachment |
| `CodebergRestClient.repoGetReleaseByTag` | `GET` | `/repos/{owner}/{repo}/releases/tags/{tag}` | `E:release.crud.v1` | Get a release by tag name |
| `CodebergRestClient.repoGetRepoPermissions` | `GET` | `/repos/{owner}/{repo}/collaborators/{collaborator}/permission` | Unmatched | Get repository permissions for a user |
| `CodebergRestClient.repoGetReviewers` | `GET` | `/repos/{owner}/{repo}/reviewers` | `E:pull-request.reviewers.v1` | Return all users that can be requested to review in this repo |
| `CodebergRestClient.repoGetRunnerRegistrationToken` | `GET` | `/repos/{owner}/{repo}/actions/runners/registration-token` | Unmatched | [Deprecated] Get a repository's runner registration token |
| `CodebergRestClient.repoGetSingleCommit` | `GET` | `/repos/{owner}/{repo}/git/commits/{sha}` | `E:commit.get.v1` | Get a single commit from a repository |
| `CodebergRestClient.repoGetTag` | `GET` | `/repos/{owner}/{repo}/tags/{tag}` | `E:tag.list-get.v1` | Get the tag of a repository by tag name |
| `CodebergRestClient.repoGetTagProtection` | `GET` | `/repos/{owner}/{repo}/tag_protections/{id}` | Unmatched | Get a specific tag protection for the repository |
| `CodebergRestClient.repoGetWikiPage` | `GET` | `/repos/{owner}/{repo}/wiki/page/{pageName}` | `E:wiki.crud.v1` | Get a wiki page |
| `CodebergRestClient.repoGetWikiPageRevisions` | `GET` | `/repos/{owner}/{repo}/wiki/revisions/{pageName}` | Unmatched | Get revisions of a wiki page |
| `CodebergRestClient.repoGetWikiPages` | `GET` | `/repos/{owner}/{repo}/wiki/pages` | `E:wiki.crud.v1` | Get all wiki pages |
| `CodebergRestClient.repoListActionsSecrets` | `GET` | `/repos/{owner}/{repo}/actions/secrets` | Unmatched | List an repo's actions secrets |
| `CodebergRestClient.repoListActivityFeeds` | `GET` | `/repos/{owner}/{repo}/activities/feeds` | Unmatched | List a repository's activity feeds |
| `CodebergRestClient.repoListAllGitRefs` | `GET` | `/repos/{owner}/{repo}/git/refs` | `E:git.ref.read.v1` | Get specified ref or filtered repository's refs |
| `CodebergRestClient.repoListBranchProtection` | `GET` | `/repos/{owner}/{repo}/branch_protections` | `E:branch.protection.read.v1` | List branch protections for a repository |
| `CodebergRestClient.repoListBranches` | `GET` | `/repos/{owner}/{repo}/branches` | `E:branch.list.v1` | List a repository's branches |
| `CodebergRestClient.repoListCollaborators` | `GET` | `/repos/{owner}/{repo}/collaborators` | `E:collaborator.read.v1` | List a repository's collaborators |
| `CodebergRestClient.repoListFlags` | `GET` | `/repos/{owner}/{repo}/flags` | Unmatched | List a repository's flags |
| `CodebergRestClient.repoListGitHooks` | `GET` | `/repos/{owner}/{repo}/hooks/git` | Unmatched | List the Git hooks in a repository |
| `CodebergRestClient.repoListGitRefs` | `GET` | `/repos/{owner}/{repo}/git/refs/{ref}` | `E:git.ref.read.v1` | Get specified ref or filtered repository's refs |
| `CodebergRestClient.repoListHooks` | `GET` | `/repos/{owner}/{repo}/hooks` | `E:webhook.crud.v1` | List the hooks in a repository |
| `CodebergRestClient.repoListKeys` | `GET` | `/repos/{owner}/{repo}/keys` | `E:deploy-key.crud.v1` | List a repository's keys |
| `CodebergRestClient.repoListPinnedIssues` | `GET` | `/repos/{owner}/{repo}/issues/pinned` | Unmatched | List a repo's pinned issues |
| `CodebergRestClient.repoListPinnedPullRequests` | `GET` | `/repos/{owner}/{repo}/pulls/pinned` | Unmatched | List a repo's pinned pull requests |
| `CodebergRestClient.repoListPullRequests` | `GET` | `/repos/{owner}/{repo}/pulls` | `E:pull-request.core.v1` | List a repo's pull requests. If a pull request is selected but fails to be retrieved for any reason, it will be a null value in the list of results. |
| `CodebergRestClient.repoListPullReviews` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/reviews` | `E:pull-request.review.v1` | List all reviews for a pull request |
| `CodebergRestClient.repoListPushMirrors` | `GET` | `/repos/{owner}/{repo}/push_mirrors` | Unmatched | Get all push mirrors of the repository |
| `CodebergRestClient.repoListReleaseAttachments` | `GET` | `/repos/{owner}/{repo}/releases/{id}/assets` | Unmatched | List release's attachments |
| `CodebergRestClient.repoListReleases` | `GET` | `/repos/{owner}/{repo}/releases` | `E:release.crud.v1` | List a repo's releases |
| `CodebergRestClient.repoListStargazers` | `GET` | `/repos/{owner}/{repo}/stargazers` | Unmatched | List a repo's stargazers |
| `CodebergRestClient.repoListStatuses` | `GET` | `/repos/{owner}/{repo}/statuses/{sha}` | `E:commit-status.v1` | Get a commit's statuses |
| `CodebergRestClient.repoListStatusesByRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/statuses` | `E:commit-status.v1` | Get a commit's statuses, by branch/tag/commit reference |
| `CodebergRestClient.repoListSubscribers` | `GET` | `/repos/{owner}/{repo}/subscribers` | Unmatched | List a repo's watchers |
| `CodebergRestClient.repoListTagProtection` | `GET` | `/repos/{owner}/{repo}/tag_protections` | Unmatched | List tag protections for a repository |
| `CodebergRestClient.repoListTags` | `GET` | `/repos/{owner}/{repo}/tags` | `E:tag.list-get.v1` | List a repository's tags |
| `CodebergRestClient.repoListTeams` | `GET` | `/repos/{owner}/{repo}/teams` | Unmatched | List a repository's teams |
| `CodebergRestClient.repoListTopics` | `GET` | `/repos/{owner}/{repo}/topics` | Unmatched | Get list of topics that a repository has |
| `CodebergRestClient.repoMergePullRequest` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/merge` | `E:pull-request.merge.v1` | Merge a pull request |
| `CodebergRestClient.repoMigrate` | `POST` | `/repos/migrate` | Unmatched | Migrate a remote git repository |
| `CodebergRestClient.repoMirrorSync` | `POST` | `/repos/{owner}/{repo}/mirror-sync` | Unmatched | Sync a mirrored repository |
| `CodebergRestClient.repoNewPinAllowed` | `GET` | `/repos/{owner}/{repo}/new_pin_allowed` | Unmatched | Returns if new Issue Pins are allowed |
| `CodebergRestClient.repoPullRequestIsMerged` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/merge` | Unmatched | Check if a pull request has been merged |
| `CodebergRestClient.repoPushMirrorSync` | `POST` | `/repos/{owner}/{repo}/push_mirrors-sync` | Unmatched | Sync all push mirrored repository |
| `CodebergRestClient.repoRemoveNote` | `DELETE` | `/repos/{owner}/{repo}/git/notes/{sha}` | Unmatched | Removes a note corresponding to a single commit from a repository |
| `CodebergRestClient.repoReplaceAllFlags` | `PUT` | `/repos/{owner}/{repo}/flags` | Unmatched | Replace all flags of a repository |
| `CodebergRestClient.repoSearch` | `GET` | `/repos/search` | Unmatched | Search for repositories |
| `CodebergRestClient.repoSearchRunJobs` | `GET` | `/repos/{owner}/{repo}/actions/runners/jobs` | Unmatched | Search for repository's action jobs according filter conditions |
| `CodebergRestClient.repoSetNote` | `POST` | `/repos/{owner}/{repo}/git/notes/{sha}` | Unmatched | Set a note corresponding to a single commit from a repository |
| `CodebergRestClient.repoSigningKey` | `GET` | `/repos/{owner}/{repo}/signing-key.gpg` | Unmatched | Get signing-key.gpg for given repository |
| `CodebergRestClient.repoSubmitPullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}` | `E:pull-request.review.v1` | Submit a pending review to an pull request |
| `CodebergRestClient.repoSyncForkBranch` | `POST` | `/repos/{owner}/{repo}/sync_fork/{branch}` | Unmatched | Syncs a fork branch with the base branch |
| `CodebergRestClient.repoSyncForkBranchInfo` | `GET` | `/repos/{owner}/{repo}/sync_fork/{branch}` | Unmatched | Gets information about syncing a fork branch with the base branch |
| `CodebergRestClient.repoSyncForkDefault` | `POST` | `/repos/{owner}/{repo}/sync_fork` | Unmatched | Syncs the default branch of a fork with the base branch |
| `CodebergRestClient.repoSyncForkDefaultInfo` | `GET` | `/repos/{owner}/{repo}/sync_fork` | Unmatched | Gets information about syncing the fork default branch with the base branch |
| `CodebergRestClient.repoTestHook` | `POST` | `/repos/{owner}/{repo}/hooks/{id}/tests` | `E:webhook.crud.v1` | Test a push webhook |
| `CodebergRestClient.repoTrackedTimes` | `GET` | `/repos/{owner}/{repo}/times` | Unmatched | List a repo's tracked times |
| `CodebergRestClient.repoTransfer` | `POST` | `/repos/{owner}/{repo}/transfer` | Unmatched | Transfer a repo ownership |
| `CodebergRestClient.repoUnDismissPullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/undismissals` | Unmatched | Cancel to dismiss a review for a pull request |
| `CodebergRestClient.repoUpdateAvatar` | `POST` | `/repos/{owner}/{repo}/avatar` | Unmatched | Update a repository's avatar |
| `CodebergRestClient.repoUpdateBranch` | `PATCH` | `/repos/{owner}/{repo}/branches/{branch}` | Unmatched | Update a branch |
| `CodebergRestClient.repoUpdateFile` | `PUT` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.write.v1` | Update a file in a repository |
| `CodebergRestClient.repoUpdatePullRequest` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/update` | Unmatched | Merge PR's baseBranch into headBranch |
| `CodebergRestClient.repoUpdateTopics` | `PUT` | `/repos/{owner}/{repo}/topics` | Unmatched | Replace list of topics for a repository |
| `CodebergRestClient.repoValidateIssueConfig` | `GET` | `/repos/{owner}/{repo}/issue_config/validate` | Unmatched | Returns the validation information for a issue config |
| `CodebergRestClient.topicSearch` | `GET` | `/topics/search` | Unmatched | Search for topics by keyword |
| `CodebergRestClient.updateRepoSecret` | `PUT` | `/repos/{owner}/{repo}/actions/secrets/{secretname}` | Unmatched | Create or Update a secret value in a repository |
| `CodebergRestClient.updateRepoVariable` | `PUT` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Update a repo-level variable |
| `CodebergRestClient.userCurrentCheckSubscription` | `GET` | `/repos/{owner}/{repo}/subscription` | Unmatched | Check if the current user is watching a repo |
| `CodebergRestClient.userCurrentDeleteSubscription` | `DELETE` | `/repos/{owner}/{repo}/subscription` | Unmatched | Unwatch a repo |
| `CodebergRestClient.userCurrentPutSubscription` | `PUT` | `/repos/{owner}/{repo}/subscription` | Unmatched | Watch a repo |
| `CodebergRestClient.userTrackedTimes` | `GET` | `/repos/{owner}/{repo}/times/{user}` | Unmatched | [Deprecated] List a user's tracked times in a repo |

</details>

<details>
<summary><strong>settings</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.getGeneralApiSettings` | `GET` | `/settings/api` | Unmatched | Get instance's global settings for api |
| `CodebergRestClient.getGeneralAttachmentSettings` | `GET` | `/settings/attachment` | Unmatched | Get instance's global settings for Attachment |
| `CodebergRestClient.getGeneralRepositorySettings` | `GET` | `/settings/repository` | Unmatched | Get instance's global settings for repositories |
| `CodebergRestClient.getGeneralUiSettings` | `GET` | `/settings/ui` | Unmatched | Get instance's global settings for ui |

</details>

<details>
<summary><strong>user</strong> (79)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `CodebergRestClient.createUserVariable` | `POST` | `/user/actions/variables/{variablename}` | Unmatched | Create a user-level variable |
| `CodebergRestClient.deleteUserRunner` | `DELETE` | `/user/actions/runners/{runner_id}` | Unmatched | Delete a particular user-level runner |
| `CodebergRestClient.deleteUserSecret` | `DELETE` | `/user/actions/secrets/{secretname}` | Unmatched | Delete a secret in a user scope |
| `CodebergRestClient.deleteUserVariable` | `DELETE` | `/user/actions/variables/{variablename}` | Unmatched | Delete a user-level variable which is created by current doer |
| `CodebergRestClient.getUserRunner` | `GET` | `/user/actions/runners/{runner_id}` | Unmatched | Get a particular runner that belongs to the user |
| `CodebergRestClient.getUserRunners` | `GET` | `/user/actions/runners` | Unmatched | Get the user's runners |
| `CodebergRestClient.getUserSettings` | `GET` | `/user/settings` | Unmatched | Get current user's account settings |
| `CodebergRestClient.getUserVariable` | `GET` | `/user/actions/variables/{variablename}` | Unmatched | Get a user-level variable which is created by current doer |
| `CodebergRestClient.getUserVariablesList` | `GET` | `/user/actions/variables` | Unmatched | Get the user-level list of variables which is created by current doer |
| `CodebergRestClient.getVerificationToken` | `GET` | `/user/gpg_key_token` | Unmatched | Get a Token to verify |
| `CodebergRestClient.registerUserRunner` | `POST` | `/user/actions/runners` | `P:ci.runners.v1` | Register a new user-level runner |
| `CodebergRestClient.updateUserSecret` | `PUT` | `/user/actions/secrets/{secretname}` | Unmatched | Create or Update a secret value in a user scope |
| `CodebergRestClient.updateUserSettings` | `PATCH` | `/user/settings` | Unmatched | Update settings in current user's account |
| `CodebergRestClient.updateUserVariable` | `PUT` | `/user/actions/variables/{variablename}` | Unmatched | Update a user-level variable which is created by current doer |
| `CodebergRestClient.userAddEmail` | `POST` | `/user/emails` | Unmatched | Add an email addresses to the current user's account |
| `CodebergRestClient.userBlockUser` | `PUT` | `/user/block/{username}` | Unmatched | Blocks a user from the doer |
| `CodebergRestClient.userCheckFollowing` | `GET` | `/users/{username}/following/{target}` | Unmatched | Check if one user is following another user |
| `CodebergRestClient.userCheckQuota` | `GET` | `/user/quota/check` | `U:codeberg.quotas` | Check if the authenticated user is over quota for a given subject |
| `CodebergRestClient.userCreateHook` | `POST` | `/user/hooks` | Unmatched | Create a hook |
| `CodebergRestClient.userCreateOAuth2Application` | `POST` | `/user/applications/oauth2` | Unmatched | Creates a new OAuth2 application |
| `CodebergRestClient.userCreateToken` | `POST` | `/users/{username}/tokens` | Unmatched | Generate an access token for the specified user |
| `CodebergRestClient.userCurrentActivityPubFollow` | `POST` | `/user/activitypub/follow` | `U:codeberg.activitypub` | Follow a remote activitypub account |
| `CodebergRestClient.userCurrentCheckFollowing` | `GET` | `/user/following/{username}` | Unmatched | Check whether a user is followed by the authenticated user |
| `CodebergRestClient.userCurrentCheckStarring` | `GET` | `/user/starred/{owner}/{repo}` | Unmatched | Whether the authenticated is starring the repo |
| `CodebergRestClient.userCurrentDeleteFollow` | `DELETE` | `/user/following/{username}` | Unmatched | Unfollow a user |
| `CodebergRestClient.userCurrentDeleteGpgKey` | `DELETE` | `/user/gpg_keys/{id}` | Unmatched | Remove a GPG public key from current user's account |
| `CodebergRestClient.userCurrentDeleteKey` | `DELETE` | `/user/keys/{id}` | Unmatched | Delete a public key |
| `CodebergRestClient.userCurrentDeleteStar` | `DELETE` | `/user/starred/{owner}/{repo}` | Unmatched | Unstar the given repo |
| `CodebergRestClient.userCurrentGetGpgKey` | `GET` | `/user/gpg_keys/{id}` | Unmatched | Get a GPG key |
| `CodebergRestClient.userCurrentGetKey` | `GET` | `/user/keys/{id}` | Unmatched | Get a public key |
| `CodebergRestClient.userCurrentListFollowers` | `GET` | `/user/followers` | Unmatched | List the authenticated user's followers |
| `CodebergRestClient.userCurrentListFollowing` | `GET` | `/user/following` | Unmatched | List the users that the authenticated user is following |
| `CodebergRestClient.userCurrentListGpgKeys` | `GET` | `/user/gpg_keys` | Unmatched | List the authenticated user's GPG keys |
| `CodebergRestClient.userCurrentListKeys` | `GET` | `/user/keys` | Unmatched | List the authenticated user's public keys |
| `CodebergRestClient.userCurrentListRepos` | `GET` | `/user/repos` | `E:repository.list.v1` | List the repos that the authenticated user owns |
| `CodebergRestClient.userCurrentListStarred` | `GET` | `/user/starred` | Unmatched | The repos that the authenticated user has starred |
| `CodebergRestClient.userCurrentListSubscriptions` | `GET` | `/user/subscriptions` | Unmatched | List repositories watched by the authenticated user |
| `CodebergRestClient.userCurrentPostGpgKey` | `POST` | `/user/gpg_keys` | Unmatched | Add a GPG public key to current user's account |
| `CodebergRestClient.userCurrentPostKey` | `POST` | `/user/keys` | Unmatched | Create a public key |
| `CodebergRestClient.userCurrentPutFollow` | `PUT` | `/user/following/{username}` | Unmatched | Follow a user |
| `CodebergRestClient.userCurrentPutStar` | `PUT` | `/user/starred/{owner}/{repo}` | Unmatched | Star the given repo |
| `CodebergRestClient.userCurrentTrackedTimes` | `GET` | `/user/times` | Unmatched | List the current user's tracked times |
| `CodebergRestClient.userDeleteAccessToken` | `DELETE` | `/users/{username}/tokens/{token}` | Unmatched | Delete an access token from the specified user's account |
| `CodebergRestClient.userDeleteAvatar` | `DELETE` | `/user/avatar` | Unmatched | Delete avatar of the current user. It will be replaced by a default one |
| `CodebergRestClient.userDeleteEmail` | `DELETE` | `/user/emails` | Unmatched | Delete email addresses from the current user's account |
| `CodebergRestClient.userDeleteHook` | `DELETE` | `/user/hooks/{id}` | Unmatched | Delete a hook |
| `CodebergRestClient.userDeleteOAuth2Application` | `DELETE` | `/user/applications/oauth2/{id}` | Unmatched | Delete an OAuth2 application |
| `CodebergRestClient.userEditHook` | `PATCH` | `/user/hooks/{id}` | Unmatched | Update a hook |
| `CodebergRestClient.userGet` | `GET` | `/users/{username}` | `E:user.named.read.v1` | Get a user |
| `CodebergRestClient.userGetCurrent` | `GET` | `/user` | `E:user.current.read.v1` | Get the authenticated user |
| `CodebergRestClient.userGetHeatmapData` | `GET` | `/users/{username}/heatmap` | Unmatched | Get a user's heatmap |
| `CodebergRestClient.userGetHook` | `GET` | `/user/hooks/{id}` | Unmatched | Get a hook |
| `CodebergRestClient.userGetOAuth2Application` | `GET` | `/user/applications/oauth2/{id}` | Unmatched | Get an OAuth2 application |
| `CodebergRestClient.userGetOAuth2Applications` | `GET` | `/user/applications/oauth2` | Unmatched | List the authenticated user's oauth2 applications |
| `CodebergRestClient.userGetQuota` | `GET` | `/user/quota` | `U:codeberg.quotas` | Get quota information for the authenticated user |
| `CodebergRestClient.userGetRunnerRegistrationToken` | `GET` | `/user/actions/runners/registration-token` | Unmatched | [Deprecated] Get the user's runner registration token |
| `CodebergRestClient.userGetStopWatches` | `GET` | `/user/stopwatches` | Unmatched | Get list of all existing stopwatches |
| `CodebergRestClient.userGetTokens` | `GET` | `/users/{username}/tokens` | Unmatched | List the specified user's access tokens |
| `CodebergRestClient.userListActivityFeeds` | `GET` | `/users/{username}/activities/feeds` | Unmatched | List a user's activity feeds |
| `CodebergRestClient.userListBlockedUsers` | `GET` | `/user/list_blocked` | Unmatched | List the authenticated user's blocked users |
| `CodebergRestClient.userListEmails` | `GET` | `/user/emails` | Unmatched | List all email addresses of the current user |
| `CodebergRestClient.userListFollowers` | `GET` | `/users/{username}/followers` | Unmatched | List the given user's followers |
| `CodebergRestClient.userListFollowing` | `GET` | `/users/{username}/following` | Unmatched | List the users that the given user is following |
| `CodebergRestClient.userListGpgKeys` | `GET` | `/users/{username}/gpg_keys` | Unmatched | List the given user's GPG keys |
| `CodebergRestClient.userListHooks` | `GET` | `/user/hooks` | Unmatched | List the authenticated user's webhooks |
| `CodebergRestClient.userListKeys` | `GET` | `/users/{username}/keys` | Unmatched | List the given user's public keys |
| `CodebergRestClient.userListQuotaArtifacts` | `GET` | `/user/quota/artifacts` | Unmatched | List the artifacts affecting the authenticated user's quota |
| `CodebergRestClient.userListQuotaAttachments` | `GET` | `/user/quota/attachments` | Unmatched | List the attachments affecting the authenticated user's quota |
| `CodebergRestClient.userListQuotaPackages` | `GET` | `/user/quota/packages` | Unmatched | List the packages affecting the authenticated user's quota |
| `CodebergRestClient.userListRepos` | `GET` | `/users/{username}/repos` | `E:repository.list.v1` | List the repos owned by the given user |
| `CodebergRestClient.userListStarred` | `GET` | `/users/{username}/starred` | Unmatched | The repos that the given user has starred |
| `CodebergRestClient.userListSubscriptions` | `GET` | `/users/{username}/subscriptions` | Unmatched | List the repositories watched by a user |
| `CodebergRestClient.userListTeams` | `GET` | `/user/teams` | Unmatched | List all the teams a user belongs to |
| `CodebergRestClient.userSearch` | `GET` | `/users/search` | `E:user.search.v1` | Search for users |
| `CodebergRestClient.userSearchRunJobs` | `GET` | `/user/actions/runners/jobs` | Unmatched | Search for user's action jobs according filter conditions |
| `CodebergRestClient.userUnblockUser` | `PUT` | `/user/unblock/{username}` | Unmatched | Unblocks a user from the doer |
| `CodebergRestClient.userUpdateAvatar` | `POST` | `/user/avatar` | Unmatched | Update avatar of the current user |
| `CodebergRestClient.userUpdateOAuth2Application` | `PATCH` | `/user/applications/oauth2/{id}` | Unmatched | Update an OAuth2 application, this includes regenerating the client secret |
| `CodebergRestClient.userVerifyGpgKey` | `POST` | `/user/gpg_key_verify` | Unmatched | Verify a GPG key |

</details>

### Gitea: 536 methods

<details>
<summary><strong>admin</strong> (33)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.adminAddUserBadges` | `POST` | `/admin/users/{username}/badges` | Unmatched | Add a badge to a user |
| `GiteaRestClient.adminAdoptRepository` | `POST` | `/admin/unadopted/{owner}/{repo}` | `U:gitea.instance-maintenance` | Adopt unadopted files as a repository |
| `GiteaRestClient.adminCreateHook` | `POST` | `/admin/hooks` | Unmatched | Create a hook |
| `GiteaRestClient.adminCreateOrg` | `POST` | `/admin/users/{username}/orgs` | Unmatched | Create an organization |
| `GiteaRestClient.adminCreatePublicKey` | `POST` | `/admin/users/{username}/keys` | Unmatched | Add a public key on behalf of a user |
| `GiteaRestClient.adminCreateRepo` | `POST` | `/admin/users/{username}/repos` | Unmatched | Create a repository on behalf of a user |
| `GiteaRestClient.adminCreateRunnerRegistrationToken` | `POST` | `/admin/actions/runners/registration-token` | Unmatched | Get a global actions runner registration token |
| `GiteaRestClient.adminCreateUser` | `POST` | `/admin/users` | Unmatched | Create a user |
| `GiteaRestClient.adminCronList` | `GET` | `/admin/cron` | `U:gitea.instance-maintenance` | List cron tasks |
| `GiteaRestClient.adminCronRun` | `POST` | `/admin/cron/{task}` | `U:gitea.instance-maintenance` | Run cron task |
| `GiteaRestClient.adminDeleteHook` | `DELETE` | `/admin/hooks/{id}` | Unmatched | Delete a hook |
| `GiteaRestClient.adminDeleteUnadoptedRepository` | `DELETE` | `/admin/unadopted/{owner}/{repo}` | Unmatched | Delete unadopted files |
| `GiteaRestClient.adminDeleteUser` | `DELETE` | `/admin/users/{username}` | Unmatched | Delete a user |
| `GiteaRestClient.adminDeleteUserBadges` | `DELETE` | `/admin/users/{username}/badges` | Unmatched | Remove a badge from a user |
| `GiteaRestClient.adminDeleteUserPublicKey` | `DELETE` | `/admin/users/{username}/keys/{id}` | Unmatched | Delete a user's public key |
| `GiteaRestClient.adminEditHook` | `PATCH` | `/admin/hooks/{id}` | Unmatched | Update a hook |
| `GiteaRestClient.adminEditUser` | `PATCH` | `/admin/users/{username}` | Unmatched | Edit an existing user |
| `GiteaRestClient.adminGetAllEmails` | `GET` | `/admin/emails` | Unmatched | List all emails |
| `GiteaRestClient.adminGetAllOrgs` | `GET` | `/admin/orgs` | Unmatched | List all organizations |
| `GiteaRestClient.adminGetHook` | `GET` | `/admin/hooks/{id}` | Unmatched | Get a hook |
| `GiteaRestClient.adminListHooks` | `GET` | `/admin/hooks` | Unmatched | List system's webhooks |
| `GiteaRestClient.adminListPackages` | `GET` | `/admin/packages` | Unmatched | List all packages |
| `GiteaRestClient.adminListUserBadges` | `GET` | `/admin/users/{username}/badges` | Unmatched | List a user's badges |
| `GiteaRestClient.adminRenameUser` | `POST` | `/admin/users/{username}/rename` | Unmatched | Rename a user |
| `GiteaRestClient.adminSearchEmails` | `GET` | `/admin/emails/search` | Unmatched | Search all emails |
| `GiteaRestClient.adminSearchUsers` | `GET` | `/admin/users` | Unmatched | Search users according filter conditions |
| `GiteaRestClient.adminUnadoptedList` | `GET` | `/admin/unadopted` | `U:gitea.instance-maintenance` | List unadopted repositories |
| `GiteaRestClient.deleteAdminRunner` | `DELETE` | `/admin/actions/runners/{runner_id}` | Unmatched | Delete a global runner |
| `GiteaRestClient.getAdminRunner` | `GET` | `/admin/actions/runners/{runner_id}` | Unmatched | Get a global runner |
| `GiteaRestClient.getAdminRunners` | `GET` | `/admin/actions/runners` | `P:ci.runners.v1` | Get all runners |
| `GiteaRestClient.listAdminWorkflowJobs` | `GET` | `/admin/actions/jobs` | Unmatched | Lists all jobs |
| `GiteaRestClient.listAdminWorkflowRuns` | `GET` | `/admin/actions/runs` | Unmatched | Lists all runs |
| `GiteaRestClient.updateAdminRunner` | `PATCH` | `/admin/actions/runners/{runner_id}` | Unmatched | Update a global runner |

</details>

<details>
<summary><strong>issue</strong> (72)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.issueAddAssignees` | `POST` | `/repos/{owner}/{repo}/issues/{index}/assignees` | Unmatched | Add assignees to an issue |
| `GiteaRestClient.issueAddLabel` | `POST` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Add a label to an issue |
| `GiteaRestClient.issueAddSubscription` | `PUT` | `/repos/{owner}/{repo}/issues/{index}/subscriptions/{user}` | Unmatched | Subscribe user to issue |
| `GiteaRestClient.issueAddTime` | `POST` | `/repos/{owner}/{repo}/issues/{index}/times` | Unmatched | Add tracked time to a issue |
| `GiteaRestClient.issueCheckAssignee` | `GET` | `/repos/{owner}/{repo}/issues/{index}/assignees/{assignee}` | Unmatched | Check if a user can be assigned to an issue |
| `GiteaRestClient.issueCheckSubscription` | `GET` | `/repos/{owner}/{repo}/issues/{index}/subscriptions/check` | Unmatched | Check if user is subscribed to an issue |
| `GiteaRestClient.issueClearLabels` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Remove all labels from an issue |
| `GiteaRestClient.issueCreateComment` | `POST` | `/repos/{owner}/{repo}/issues/{index}/comments` | `E:issue.comments.v1`<br>`P:pull-request.comments.v1` | Add a comment to an issue |
| `GiteaRestClient.issueCreateIssue` | `POST` | `/repos/{owner}/{repo}/issues` | `E:issue.write.v1` | Create an issue. If using deadline only the date will be taken into account, and time of day ignored. |
| `GiteaRestClient.issueCreateIssueAttachment` | `POST` | `/repos/{owner}/{repo}/issues/{index}/assets` | Unmatched | Create an issue attachment |
| `GiteaRestClient.issueCreateIssueBlocking` | `POST` | `/repos/{owner}/{repo}/issues/{index}/blocks` | Unmatched | Block the issue given in the body by the issue in path |
| `GiteaRestClient.issueCreateIssueCommentAttachment` | `POST` | `/repos/{owner}/{repo}/issues/comments/{id}/assets` | Unmatched | Create a comment attachment |
| `GiteaRestClient.issueCreateIssueDependencies` | `POST` | `/repos/{owner}/{repo}/issues/{index}/dependencies` | Unmatched | Make the issue in the url depend on the issue in the form. |
| `GiteaRestClient.issueCreateLabel` | `POST` | `/repos/{owner}/{repo}/labels` | `E:label.catalog.v1` | Create a label |
| `GiteaRestClient.issueCreateMilestone` | `POST` | `/repos/{owner}/{repo}/milestones` | `E:milestone.catalog.v1` | Create a milestone |
| `GiteaRestClient.issueDelete` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}` | `E:issue.write.v1` | Delete an issue |
| `GiteaRestClient.issueDeleteComment` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{id}` | `E:issue.comments.v1` | Delete a comment |
| `GiteaRestClient.issueDeleteCommentDeprecated` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/comments/{id}` | Unmatched | [Deprecated] Delete a comment |
| `GiteaRestClient.issueDeleteCommentReaction` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{id}/reactions` | Unmatched | Remove a reaction from a comment of an issue |
| `GiteaRestClient.issueDeleteIssueAttachment` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/assets/{attachment_id}` | Unmatched | Delete an issue attachment |
| `GiteaRestClient.issueDeleteIssueCommentAttachment` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{id}/assets/{attachment_id}` | Unmatched | Delete a comment attachment |
| `GiteaRestClient.issueDeleteIssueReaction` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/reactions` | Unmatched | Remove a reaction from an issue |
| `GiteaRestClient.issueDeleteLabel` | `DELETE` | `/repos/{owner}/{repo}/labels/{id}` | `E:label.catalog.v1` | Delete a label |
| `GiteaRestClient.issueDeleteMilestone` | `DELETE` | `/repos/{owner}/{repo}/milestones/{id}` | `E:milestone.catalog.v1` | Delete a milestone |
| `GiteaRestClient.issueDeleteStopWatch` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/stopwatch/delete` | Unmatched | Delete an issue's existing stopwatch. |
| `GiteaRestClient.issueDeleteSubscription` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/subscriptions/{user}` | Unmatched | Unsubscribe user from issue |
| `GiteaRestClient.issueDeleteTime` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/times/{id}` | Unmatched | Delete specific tracked time |
| `GiteaRestClient.issueEditComment` | `PATCH` | `/repos/{owner}/{repo}/issues/comments/{id}` | `E:issue.comments.v1` | Edit a comment |
| `GiteaRestClient.issueEditCommentDeprecated` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}/comments/{id}` | Unmatched | [Deprecated] Edit a comment |
| `GiteaRestClient.issueEditIssue` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}` | `E:issue.write.v1` | Edit an issue. If using deadline only the date will be taken into account, and time of day ignored. |
| `GiteaRestClient.issueEditIssueAttachment` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}/assets/{attachment_id}` | Unmatched | Edit an issue attachment |
| `GiteaRestClient.issueEditIssueCommentAttachment` | `PATCH` | `/repos/{owner}/{repo}/issues/comments/{id}/assets/{attachment_id}` | Unmatched | Edit a comment attachment |
| `GiteaRestClient.issueEditIssueDeadline` | `POST` | `/repos/{owner}/{repo}/issues/{index}/deadline` | Unmatched | Set an issue deadline. If set to null, the deadline is deleted. If using deadline only the date will be taken into account, and time of day ignored. |
| `GiteaRestClient.issueEditLabel` | `PATCH` | `/repos/{owner}/{repo}/labels/{id}` | `E:label.catalog.v1` | Update a label |
| `GiteaRestClient.issueEditMilestone` | `PATCH` | `/repos/{owner}/{repo}/milestones/{id}` | `E:milestone.catalog.v1` | Update a milestone |
| `GiteaRestClient.issueGetComment` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}` | `E:issue.comments.v1` | Get a comment |
| `GiteaRestClient.issueGetCommentReactions` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}/reactions` | Unmatched | Get a list of reactions from a comment of an issue |
| `GiteaRestClient.issueGetComments` | `GET` | `/repos/{owner}/{repo}/issues/{index}/comments` | `E:issue.comments.v1`<br>`P:pull-request.comments.v1` | List all comments on an issue |
| `GiteaRestClient.issueGetCommentsAndTimeline` | `GET` | `/repos/{owner}/{repo}/issues/{index}/timeline` | Unmatched | List all comments and events on an issue |
| `GiteaRestClient.issueGetIssue` | `GET` | `/repos/{owner}/{repo}/issues/{index}` | `E:issue.read.v1` | Get an issue |
| `GiteaRestClient.issueGetIssueAttachment` | `GET` | `/repos/{owner}/{repo}/issues/{index}/assets/{attachment_id}` | Unmatched | Get an issue attachment |
| `GiteaRestClient.issueGetIssueCommentAttachment` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}/assets/{attachment_id}` | Unmatched | Get a comment attachment |
| `GiteaRestClient.issueGetIssueReactions` | `GET` | `/repos/{owner}/{repo}/issues/{index}/reactions` | Unmatched | Get a list reactions of an issue |
| `GiteaRestClient.issueGetLabel` | `GET` | `/repos/{owner}/{repo}/labels/{id}` | `E:label.catalog.v1` | Get a single label |
| `GiteaRestClient.issueGetLabels` | `GET` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Get an issue's labels |
| `GiteaRestClient.issueGetMilestone` | `GET` | `/repos/{owner}/{repo}/milestones/{id}` | `E:milestone.catalog.v1` | Get a milestone |
| `GiteaRestClient.issueGetMilestonesList` | `GET` | `/repos/{owner}/{repo}/milestones` | `E:milestone.catalog.v1` | Get all of a repository's opened milestones |
| `GiteaRestClient.issueGetRepoComments` | `GET` | `/repos/{owner}/{repo}/issues/comments` | Unmatched | List all comments in a repository |
| `GiteaRestClient.issueListBlocks` | `GET` | `/repos/{owner}/{repo}/issues/{index}/blocks` | Unmatched | List issues that are blocked by this issue |
| `GiteaRestClient.issueListIssueAttachments` | `GET` | `/repos/{owner}/{repo}/issues/{index}/assets` | Unmatched | List issue's attachments |
| `GiteaRestClient.issueListIssueCommentAttachments` | `GET` | `/repos/{owner}/{repo}/issues/comments/{id}/assets` | Unmatched | List comment's attachments |
| `GiteaRestClient.issueListIssueDependencies` | `GET` | `/repos/{owner}/{repo}/issues/{index}/dependencies` | Unmatched | List an issue's dependencies, i.e all issues that block this issue. |
| `GiteaRestClient.issueListIssues` | `GET` | `/repos/{owner}/{repo}/issues` | `E:issue.read.v1` | List a repository's issues |
| `GiteaRestClient.issueListLabels` | `GET` | `/repos/{owner}/{repo}/labels` | `E:label.catalog.v1` | Get all of a repository's labels |
| `GiteaRestClient.issueLockIssue` | `PUT` | `/repos/{owner}/{repo}/issues/{index}/lock` | Unmatched | Lock an issue |
| `GiteaRestClient.issuePostCommentReaction` | `POST` | `/repos/{owner}/{repo}/issues/comments/{id}/reactions` | Unmatched | Add a reaction to a comment of an issue |
| `GiteaRestClient.issuePostIssueReaction` | `POST` | `/repos/{owner}/{repo}/issues/{index}/reactions` | Unmatched | Add a reaction to an issue |
| `GiteaRestClient.issueRemoveAssignees` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/assignees` | Unmatched | Remove assignees from an issue |
| `GiteaRestClient.issueRemoveIssueBlocking` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/blocks` | Unmatched | Unblock the issue given in the body by the issue in path |
| `GiteaRestClient.issueRemoveIssueDependencies` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/dependencies` | Unmatched | Remove an issue dependency |
| `GiteaRestClient.issueRemoveLabel` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/labels/{id}` | Unmatched | Remove a label from an issue |
| `GiteaRestClient.issueReplaceLabels` | `PUT` | `/repos/{owner}/{repo}/issues/{index}/labels` | Unmatched | Replace an issue's labels |
| `GiteaRestClient.issueResetTime` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/times` | Unmatched | Reset a tracked time of an issue |
| `GiteaRestClient.issueSearchIssues` | `GET` | `/repos/issues/search` | Unmatched | Search for issues across the repositories that the user has access to |
| `GiteaRestClient.issueStartStopWatch` | `POST` | `/repos/{owner}/{repo}/issues/{index}/stopwatch/start` | `U:gitea.issue-stopwatch` | Start stopwatch on an issue. |
| `GiteaRestClient.issueStopStopWatch` | `POST` | `/repos/{owner}/{repo}/issues/{index}/stopwatch/stop` | `U:gitea.issue-stopwatch` | Stop an issue's existing stopwatch. |
| `GiteaRestClient.issueSubscriptions` | `GET` | `/repos/{owner}/{repo}/issues/{index}/subscriptions` | Unmatched | Get users who subscribed on an issue. |
| `GiteaRestClient.issueTrackedTimes` | `GET` | `/repos/{owner}/{repo}/issues/{index}/times` | `U:gitea.issue-stopwatch` | List an issue's tracked times |
| `GiteaRestClient.issueUnlockIssue` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/lock` | Unmatched | Unlock an issue |
| `GiteaRestClient.moveIssuePin` | `PATCH` | `/repos/{owner}/{repo}/issues/{index}/pin/{position}` | Unmatched | Moves the Pin to the given Position |
| `GiteaRestClient.pinIssue` | `POST` | `/repos/{owner}/{repo}/issues/{index}/pin` | Unmatched | Pin an Issue |
| `GiteaRestClient.unpinIssue` | `DELETE` | `/repos/{owner}/{repo}/issues/{index}/pin` | Unmatched | Unpin an Issue |

</details>

<details>
<summary><strong>miscellaneous</strong> (14)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.deleteCurrentToken` | `DELETE` | `/token` | Unmatched | Delete the currently authenticated token |
| `GiteaRestClient.getCurrentToken` | `GET` | `/token` | Unmatched | Get the currently authenticated token |
| `GiteaRestClient.getGitignoreTemplateInfo` | `GET` | `/gitignore/templates/{name}` | Unmatched | Returns information about a gitignore template |
| `GiteaRestClient.getLabelTemplateInfo` | `GET` | `/label/templates/{name}` | Unmatched | Returns all labels in a template |
| `GiteaRestClient.getLicenseTemplateInfo` | `GET` | `/licenses/{name}` | Unmatched | Returns information about a license template |
| `GiteaRestClient.getSigningKey` | `GET` | `/signing-key.gpg` | Unmatched | Get default signing-key.gpg |
| `GiteaRestClient.getSigningKeySsh` | `GET` | `/signing-key.pub` | Unmatched | Get default signing-key.pub |
| `GiteaRestClient.getVersion` | `GET` | `/version` | Unmatched | Returns the version of the Gitea application |
| `GiteaRestClient.listGitignoresTemplates` | `GET` | `/gitignore/templates` | Unmatched | Returns a list of all gitignore templates |
| `GiteaRestClient.listLabelTemplates` | `GET` | `/label/templates` | Unmatched | Returns a list of all label templates |
| `GiteaRestClient.listLicenseTemplates` | `GET` | `/licenses` | Unmatched | Returns a list of all license templates |
| `GiteaRestClient.renderMarkdown` | `POST` | `/markdown` | Unmatched | Render a markdown document as HTML |
| `GiteaRestClient.renderMarkdownRaw` | `POST` | `/markdown/raw` | Unmatched | Render raw markdown as HTML |
| `GiteaRestClient.renderMarkup` | `POST` | `/markup` | Unmatched | Render a markup document as HTML |

</details>

<details>
<summary><strong>notification</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.notifyGetList` | `GET` | `/notifications` | `E:notification.read-state.v1` | List users's notification threads |
| `GiteaRestClient.notifyGetRepoList` | `GET` | `/repos/{owner}/{repo}/notifications` | `E:notification.read-state.v1` | List users's notification threads on a specific repo |
| `GiteaRestClient.notifyGetThread` | `GET` | `/notifications/threads/{id}` | Unmatched | Get notification thread by ID |
| `GiteaRestClient.notifyNewAvailable` | `GET` | `/notifications/new` | Unmatched | Check if unread notifications exist |
| `GiteaRestClient.notifyReadList` | `PUT` | `/notifications` | `E:notification.read-state.v1` | Mark notification threads as read, pinned or unread |
| `GiteaRestClient.notifyReadRepoList` | `PUT` | `/repos/{owner}/{repo}/notifications` | Unmatched | Mark notification threads as read, pinned or unread on a specific repo |
| `GiteaRestClient.notifyReadThread` | `PATCH` | `/notifications/threads/{id}` | `E:notification.read-state.v1` | Mark notification thread as read by ID |

</details>

<details>
<summary><strong>organization</strong> (83)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.createOrgRepo` | `POST` | `/orgs/{org}/repos` | `E:repository.create.v1` | Create a repository in an organization |
| `GiteaRestClient.createOrgRepoDeprecated` | `POST` | `/org/{org}/repos` | Unmatched | [Deprecated] Create a repository in an organization |
| `GiteaRestClient.createOrgVariable` | `POST` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Create an org-level variable |
| `GiteaRestClient.deleteOrgRunner` | `DELETE` | `/orgs/{org}/actions/runners/{runner_id}` | Unmatched | Delete an org-level runner |
| `GiteaRestClient.deleteOrgSecret` | `DELETE` | `/orgs/{org}/actions/secrets/{secretname}` | Unmatched | Delete a secret in an organization |
| `GiteaRestClient.deleteOrgVariable` | `DELETE` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Delete an org-level variable |
| `GiteaRestClient.getOrgRunner` | `GET` | `/orgs/{org}/actions/runners/{runner_id}` | Unmatched | Get an org-level runner |
| `GiteaRestClient.getOrgRunners` | `GET` | `/orgs/{org}/actions/runners` | `P:ci.runners.v1` | Get org-level runners |
| `GiteaRestClient.getOrgVariable` | `GET` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Get an org-level variable |
| `GiteaRestClient.getOrgVariablesList` | `GET` | `/orgs/{org}/actions/variables` | Unmatched | Get an org-level variables list |
| `GiteaRestClient.getOrgWorkflowJobs` | `GET` | `/orgs/{org}/actions/jobs` | Unmatched | Get org-level workflow jobs |
| `GiteaRestClient.getOrgWorkflowRuns` | `GET` | `/orgs/{org}/actions/runs` | Unmatched | Get org-level workflow runs |
| `GiteaRestClient.orgAddIssueToProjectColumn` | `POST` | `/orgs/{org}/projects/{id}/columns/{column_id}/issues/{issue_id}` | Unmatched | Add an issue to a project column |
| `GiteaRestClient.orgAddTeamMember` | `PUT` | `/teams/{id}/members/{username}` | `E:team.crud.v1` | Add a team member |
| `GiteaRestClient.orgAddTeamRepository` | `PUT` | `/teams/{id}/repos/{org}/{repo}` | Unmatched | Add a repository to a team |
| `GiteaRestClient.orgConcealMember` | `DELETE` | `/orgs/{org}/public_members/{username}` | Unmatched | Conceal a user's membership |
| `GiteaRestClient.orgCreate` | `POST` | `/orgs` | Unmatched | Create an organization |
| `GiteaRestClient.orgCreateHook` | `POST` | `/orgs/{org}/hooks` | Unmatched | Create a hook |
| `GiteaRestClient.orgCreateLabel` | `POST` | `/orgs/{org}/labels` | Unmatched | Create a label for an organization |
| `GiteaRestClient.orgCreateProject` | `POST` | `/orgs/{org}/projects` | Unmatched | Create a project owned by an organization |
| `GiteaRestClient.orgCreateProjectColumn` | `POST` | `/orgs/{org}/projects/{id}/columns` | Unmatched | Create a column in a project |
| `GiteaRestClient.orgCreateRunnerRegistrationToken` | `POST` | `/orgs/{org}/actions/runners/registration-token` | Unmatched | Get an organization's actions runner registration token |
| `GiteaRestClient.orgCreateTeam` | `POST` | `/orgs/{org}/teams` | `E:team.crud.v1` | Create a team |
| `GiteaRestClient.orgDelete` | `DELETE` | `/orgs/{org}` | Unmatched | Delete an organization |
| `GiteaRestClient.orgDeleteAvatar` | `DELETE` | `/orgs/{org}/avatar` | Unmatched | Delete Avatar |
| `GiteaRestClient.orgDeleteHook` | `DELETE` | `/orgs/{org}/hooks/{id}` | Unmatched | Delete a hook |
| `GiteaRestClient.orgDeleteLabel` | `DELETE` | `/orgs/{org}/labels/{id}` | Unmatched | Delete a label |
| `GiteaRestClient.orgDeleteMember` | `DELETE` | `/orgs/{org}/members/{username}` | Unmatched | Remove a member from an organization |
| `GiteaRestClient.orgDeleteProject` | `DELETE` | `/orgs/{org}/projects/{id}` | Unmatched | Delete a project |
| `GiteaRestClient.orgDeleteProjectColumn` | `DELETE` | `/orgs/{org}/projects/{id}/columns/{column_id}` | Unmatched | Delete a project column |
| `GiteaRestClient.orgDeleteRepos` | `DELETE` | `/orgs/{org}/repos` | Unmatched | Delete all repositories in an organization |
| `GiteaRestClient.orgDeleteTeam` | `DELETE` | `/teams/{id}` | `E:team.crud.v1` | Delete a team |
| `GiteaRestClient.orgEdit` | `PATCH` | `/orgs/{org}` | Unmatched | Edit an organization |
| `GiteaRestClient.orgEditHook` | `PATCH` | `/orgs/{org}/hooks/{id}` | Unmatched | Update a hook |
| `GiteaRestClient.orgEditLabel` | `PATCH` | `/orgs/{org}/labels/{id}` | Unmatched | Update a label |
| `GiteaRestClient.orgEditProject` | `PATCH` | `/orgs/{org}/projects/{id}` | Unmatched | Edit a project |
| `GiteaRestClient.orgEditProjectColumn` | `PATCH` | `/orgs/{org}/projects/{id}/columns/{column_id}` | Unmatched | Edit a project column |
| `GiteaRestClient.orgEditTeam` | `PATCH` | `/teams/{id}` | `E:team.crud.v1` | Edit a team |
| `GiteaRestClient.orgGet` | `GET` | `/orgs/{org}` | `E:namespace.read.v1` | Get an organization |
| `GiteaRestClient.orgGetAll` | `GET` | `/orgs` | `E:namespace.read.v1` | Get list of organizations |
| `GiteaRestClient.orgGetHook` | `GET` | `/orgs/{org}/hooks/{id}` | Unmatched | Get a hook |
| `GiteaRestClient.orgGetLabel` | `GET` | `/orgs/{org}/labels/{id}` | Unmatched | Get a single label |
| `GiteaRestClient.orgGetProject` | `GET` | `/orgs/{org}/projects/{id}` | Unmatched | Get a project |
| `GiteaRestClient.orgGetProjectColumn` | `GET` | `/orgs/{org}/projects/{id}/columns/{column_id}` | Unmatched | Get a project column |
| `GiteaRestClient.orgGetTeam` | `GET` | `/teams/{id}` | `E:team.crud.v1` | Get a team |
| `GiteaRestClient.orgGetUserPermissions` | `GET` | `/users/{username}/orgs/{org}/permissions` | Unmatched | Get user permissions in organization |
| `GiteaRestClient.orgIsMember` | `GET` | `/orgs/{org}/members/{username}` | Unmatched | Check if a user is a member of an organization |
| `GiteaRestClient.orgIsPublicMember` | `GET` | `/orgs/{org}/public_members/{username}` | Unmatched | Check if a user is a public member of an organization |
| `GiteaRestClient.orgListActionsSecrets` | `GET` | `/orgs/{org}/actions/secrets` | Unmatched | List an organization's actions secrets |
| `GiteaRestClient.orgListActivityFeeds` | `GET` | `/orgs/{org}/activities/feeds` | Unmatched | List an organization's activity feeds |
| `GiteaRestClient.orgListCurrentUserOrgs` | `GET` | `/user/orgs` | Unmatched | List the current user's organizations |
| `GiteaRestClient.orgListHooks` | `GET` | `/orgs/{org}/hooks` | Unmatched | List an organization's webhooks |
| `GiteaRestClient.orgListLabels` | `GET` | `/orgs/{org}/labels` | Unmatched | List an organization's labels |
| `GiteaRestClient.orgListMembers` | `GET` | `/orgs/{org}/members` | `E:namespace.members.read.v1` | List an organization's members |
| `GiteaRestClient.orgListProjectColumnIssues` | `GET` | `/orgs/{org}/projects/{id}/columns/{column_id}/issues` | Unmatched | List the issues in a project column |
| `GiteaRestClient.orgListProjectColumns` | `GET` | `/orgs/{org}/projects/{id}/columns` | Unmatched | List a project's columns |
| `GiteaRestClient.orgListProjects` | `GET` | `/orgs/{org}/projects` | Unmatched | List an organization's projects |
| `GiteaRestClient.orgListPublicMembers` | `GET` | `/orgs/{org}/public_members` | `E:namespace.members.read.v1` | List an organization's public members |
| `GiteaRestClient.orgListRepos` | `GET` | `/orgs/{org}/repos` | `E:repository.list.v1` | List an organization's repos |
| `GiteaRestClient.orgListTeamActivityFeeds` | `GET` | `/teams/{id}/activities/feeds` | Unmatched | List a team's activity feeds |
| `GiteaRestClient.orgListTeamMember` | `GET` | `/teams/{id}/members/{username}` | Unmatched | List a particular member of team |
| `GiteaRestClient.orgListTeamMembers` | `GET` | `/teams/{id}/members` | `E:team.crud.v1` | List a team's members |
| `GiteaRestClient.orgListTeamRepo` | `GET` | `/teams/{id}/repos/{org}/{repo}` | Unmatched | List a particular repo of team |
| `GiteaRestClient.orgListTeamRepos` | `GET` | `/teams/{id}/repos` | Unmatched | List a team's repos |
| `GiteaRestClient.orgListTeams` | `GET` | `/orgs/{org}/teams` | `E:team.crud.v1` | List an organization's teams |
| `GiteaRestClient.orgListUserOrgs` | `GET` | `/users/{username}/orgs` | Unmatched | List a user's organizations |
| `GiteaRestClient.orgMoveProjectColumns` | `POST` | `/orgs/{org}/projects/{id}/columns/move` | Unmatched | Reorder a project's columns |
| `GiteaRestClient.orgMoveProjectIssue` | `POST` | `/orgs/{org}/projects/{id}/issues/{issue_id}/move` | Unmatched | Move an issue between a project's columns |
| `GiteaRestClient.orgPublicizeMember` | `PUT` | `/orgs/{org}/public_members/{username}` | Unmatched | Publicize a user's membership |
| `GiteaRestClient.orgRemoveIssueFromProjectColumn` | `DELETE` | `/orgs/{org}/projects/{id}/columns/{column_id}/issues/{issue_id}` | Unmatched | Remove an issue from a project column |
| `GiteaRestClient.orgRemoveTeamMember` | `DELETE` | `/teams/{id}/members/{username}` | `E:team.crud.v1` | Remove a team member |
| `GiteaRestClient.orgRemoveTeamRepository` | `DELETE` | `/teams/{id}/repos/{org}/{repo}` | Unmatched | Remove a repository from a team |
| `GiteaRestClient.orgSetDefaultProjectColumn` | `POST` | `/orgs/{org}/projects/{id}/columns/{column_id}/default` | Unmatched | Set a project's default column |
| `GiteaRestClient.orgUpdateAvatar` | `POST` | `/orgs/{org}/avatar` | Unmatched | Update Avatar |
| `GiteaRestClient.organizationBlockUser` | `PUT` | `/orgs/{org}/blocks/{username}` | Unmatched | Block a user |
| `GiteaRestClient.organizationCheckUserBlock` | `GET` | `/orgs/{org}/blocks/{username}` | Unmatched | Check if a user is blocked by the organization |
| `GiteaRestClient.organizationListBlocks` | `GET` | `/orgs/{org}/blocks` | Unmatched | List users blocked by the organization |
| `GiteaRestClient.organizationUnblockUser` | `DELETE` | `/orgs/{org}/blocks/{username}` | Unmatched | Unblock a user |
| `GiteaRestClient.renameOrg` | `POST` | `/orgs/{org}/rename` | Unmatched | Rename an organization |
| `GiteaRestClient.teamSearch` | `GET` | `/orgs/{org}/teams/search` | Unmatched | Search for teams within an organization |
| `GiteaRestClient.updateOrgRunner` | `PATCH` | `/orgs/{org}/actions/runners/{runner_id}` | Unmatched | Update an org-level runner |
| `GiteaRestClient.updateOrgSecret` | `PUT` | `/orgs/{org}/actions/secrets/{secretname}` | Unmatched | Create or Update a secret value in an organization |
| `GiteaRestClient.updateOrgVariable` | `PUT` | `/orgs/{org}/actions/variables/{variablename}` | Unmatched | Update an org-level variable |

</details>

<details>
<summary><strong>package</strong> (9)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.deletePackage` | `DELETE` | `/packages/{owner}/{type}/{name}` | `P:packages.metadata.v1` | Delete a package |
| `GiteaRestClient.deletePackageVersion` | `DELETE` | `/packages/{owner}/{type}/{name}/{version}` | `P:packages.metadata.v1` | Delete a package version |
| `GiteaRestClient.getLatestPackageVersion` | `GET` | `/packages/{owner}/{type}/{name}/-/latest` | `P:packages.metadata.v1` | Gets the latest version of a package |
| `GiteaRestClient.getPackage` | `GET` | `/packages/{owner}/{type}/{name}/{version}` | `P:packages.metadata.v1` | Gets a package |
| `GiteaRestClient.linkPackage` | `POST` | `/packages/{owner}/{type}/{name}/-/link/{repo_name}` | Unmatched | Link a package to a repository |
| `GiteaRestClient.listPackageFiles` | `GET` | `/packages/{owner}/{type}/{name}/{version}/files` | `P:packages.metadata.v1` | Gets all files of a package |
| `GiteaRestClient.listPackageVersions` | `GET` | `/packages/{owner}/{type}/{name}` | `P:packages.metadata.v1` | Gets all versions of a package |
| `GiteaRestClient.listPackages` | `GET` | `/packages/{owner}` | `P:packages.metadata.v1` | Gets all packages of an owner |
| `GiteaRestClient.unlinkPackage` | `POST` | `/packages/{owner}/{type}/{name}/-/unlink` | Unmatched | Unlink a package from a repository |

</details>

<details>
<summary><strong>repository</strong> (221)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.acceptRepoTransfer` | `POST` | `/repos/{owner}/{repo}/transfer/accept` | Unmatched | Accept a repo transfer |
| `GiteaRestClient.actionsDisableWorkflow` | `PUT` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable` | Unmatched | Disable a workflow |
| `GiteaRestClient.actionsDispatchWorkflow` | `POST` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` | `P:ci.run.v1` | Create a workflow dispatch event |
| `GiteaRestClient.actionsEnableWorkflow` | `PUT` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable` | Unmatched | Enable a workflow |
| `GiteaRestClient.actionsGetWorkflow` | `GET` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}` | Unmatched | Get a workflow |
| `GiteaRestClient.actionsListRepositoryWorkflows` | `GET` | `/repos/{owner}/{repo}/actions/workflows` | Unmatched | List repository workflows |
| `GiteaRestClient.actionsListWorkflowRuns` | `GET` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs` | `P:ci.run.v1` | List runs for a workflow |
| `GiteaRestClient.approveWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run}/approve` | Unmatched | Approve a workflow run that requires approval |
| `GiteaRestClient.cancelWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run}/cancel` | `P:ci.run.v1` | Cancel a workflow run and its jobs |
| `GiteaRestClient.createFork` | `POST` | `/repos/{owner}/{repo}/forks` | `E:repository.fork.create.v1` | Fork a repository |
| `GiteaRestClient.createRepoVariable` | `POST` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Create a repo-level variable |
| `GiteaRestClient.deleteActionRun` | `DELETE` | `/repos/{owner}/{repo}/actions/runs/{run}` | Unmatched | Delete a workflow run |
| `GiteaRestClient.deleteArtifact` | `DELETE` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | `P:ci.artifacts.v1` | Deletes a specific artifact for a workflow run |
| `GiteaRestClient.deleteRepoRunner` | `DELETE` | `/repos/{owner}/{repo}/actions/runners/{runner_id}` | Unmatched | Delete a repo-level runner |
| `GiteaRestClient.deleteRepoSecret` | `DELETE` | `/repos/{owner}/{repo}/actions/secrets/{secretname}` | Unmatched | Delete a secret in a repository |
| `GiteaRestClient.deleteRepoVariable` | `DELETE` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Delete a repo-level variable |
| `GiteaRestClient.downloadActionsRunJobLogs` | `GET` | `/repos/{owner}/{repo}/actions/jobs/{job_id}/logs` | `P:ci.jobs-logs.v1` | Downloads the job logs for a workflow run |
| `GiteaRestClient.downloadArtifact` | `GET` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip` | `P:ci.artifacts.v1` | Downloads a specific artifact for a workflow run redirects to blob url |
| `GiteaRestClient.forceCancelWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run}/force-cancel` | Unmatched | Force-cancel a workflow run |
| `GiteaRestClient.generateRepo` | `POST` | `/repos/{template_owner}/{template_repo}/generate` | Unmatched | Create a repository using a template |
| `GiteaRestClient.getAnnotatedTag` | `GET` | `/repos/{owner}/{repo}/git/tags/{sha}` | Unmatched | Gets the tag object of an annotated tag (not lightweight tags) |
| `GiteaRestClient.getArtifact` | `GET` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | `P:ci.artifacts.v1` | Gets a specific artifact for a workflow run |
| `GiteaRestClient.getArtifacts` | `GET` | `/repos/{owner}/{repo}/actions/artifacts` | `P:ci.artifacts.v1` | Lists all artifacts for a repository |
| `GiteaRestClient.getArtifactsOfRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run}/artifacts` | `P:ci.artifacts.v1` | Lists all artifacts for a repository run |
| `GiteaRestClient.getBlob` | `GET` | `/repos/{owner}/{repo}/git/blobs/{sha}` | `E:git.blob.read.v1` | Gets the blob of a repository. |
| `GiteaRestClient.getRepoRunner` | `GET` | `/repos/{owner}/{repo}/actions/runners/{runner_id}` | Unmatched | Get a repo-level runner |
| `GiteaRestClient.getRepoRunners` | `GET` | `/repos/{owner}/{repo}/actions/runners` | `P:ci.runners.v1` | Get repo-level runners |
| `GiteaRestClient.getRepoVariable` | `GET` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Get a repo-level variable |
| `GiteaRestClient.getRepoVariablesList` | `GET` | `/repos/{owner}/{repo}/actions/variables` | Unmatched | Get repo-level variables list |
| `GiteaRestClient.getTree` | `GET` | `/repos/{owner}/{repo}/git/trees/{sha}` | `E:git.tree.read.v1` | Gets the tree of a repository. |
| `GiteaRestClient.getWorkflowJob` | `GET` | `/repos/{owner}/{repo}/actions/jobs/{job_id}` | Unmatched | Gets a specific workflow job for a workflow run |
| `GiteaRestClient.getWorkflowRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run}` | `P:ci.run.v1` | Gets a specific workflow run |
| `GiteaRestClient.getWorkflowRunAttempt` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run}/attempts/{attempt}` | Unmatched | Gets a specific workflow run attempt |
| `GiteaRestClient.getWorkflowRunLogs` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run}/logs` | `P:ci.jobs-logs.v1` | Download workflow run logs as archive |
| `GiteaRestClient.getWorkflowRuns` | `GET` | `/repos/{owner}/{repo}/actions/runs` | Unmatched | Lists all runs for a repository run |
| `GiteaRestClient.listActionTasks` | `GET` | `/repos/{owner}/{repo}/actions/tasks` | Unmatched | List a repository's action tasks |
| `GiteaRestClient.listForks` | `GET` | `/repos/{owner}/{repo}/forks` | `E:repository.fork.list.v1` | List a repository's forks |
| `GiteaRestClient.listWorkflowJobs` | `GET` | `/repos/{owner}/{repo}/actions/jobs` | Unmatched | Lists all jobs for a repository |
| `GiteaRestClient.listWorkflowRunAttemptJobs` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run}/attempts/{attempt}/jobs` | Unmatched | Lists all jobs for a workflow run attempt |
| `GiteaRestClient.listWorkflowRunJobs` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run}/jobs` | `P:ci.jobs-logs.v1` | Lists all jobs for a workflow run |
| `GiteaRestClient.rejectRepoTransfer` | `POST` | `/repos/{owner}/{repo}/transfer/reject` | Unmatched | Reject a repo transfer |
| `GiteaRestClient.repoAddCollaborator` | `PUT` | `/repos/{owner}/{repo}/collaborators/{collaborator}` | Unmatched | Add or Update a collaborator to a repository |
| `GiteaRestClient.repoAddIssueToProjectColumn` | `POST` | `/repos/{owner}/{repo}/projects/{id}/columns/{column_id}/issues/{issue_id}` | `U:gitea.project-boards` | Add an issue to a project column |
| `GiteaRestClient.repoAddPushMirror` | `POST` | `/repos/{owner}/{repo}/push_mirrors` | Unmatched | add a push mirror to the repository |
| `GiteaRestClient.repoAddTeam` | `PUT` | `/repos/{owner}/{repo}/teams/{team}` | Unmatched | Add a team to a repository |
| `GiteaRestClient.repoAddTopic` | `PUT` | `/repos/{owner}/{repo}/topics/{topic}` | Unmatched | Add a topic to a repository |
| `GiteaRestClient.repoApplyDiffPatch` | `POST` | `/repos/{owner}/{repo}/diffpatch` | Unmatched | Apply diff patch to repository |
| `GiteaRestClient.repoCancelScheduledAutoMerge` | `DELETE` | `/repos/{owner}/{repo}/pulls/{index}/merge` | Unmatched | Cancel the scheduled auto merge for the given pull request |
| `GiteaRestClient.repoChangeFiles` | `POST` | `/repos/{owner}/{repo}/contents` | `E:content.write.v1` | Modify multiple files in a repository |
| `GiteaRestClient.repoCheckAssignee` | `GET` | `/repos/{owner}/{repo}/assignees/{assignee}` | Unmatched | Check if a user can be assigned to issues in a repository |
| `GiteaRestClient.repoCheckCollaborator` | `GET` | `/repos/{owner}/{repo}/collaborators/{collaborator}` | `E:collaborator.read.v1` | Check if a user is a collaborator of a repository |
| `GiteaRestClient.repoCheckTeam` | `GET` | `/repos/{owner}/{repo}/teams/{team}` | Unmatched | Check if a team is assigned to a repository |
| `GiteaRestClient.repoCompareDiff` | `GET` | `/repos/{owner}/{repo}/compare/{basehead}` | `E:commit.compare.v1` | Get commit comparison information |
| `GiteaRestClient.repoCreateBranch` | `POST` | `/repos/{owner}/{repo}/branches` | `E:branch.create.v1` | Create a branch |
| `GiteaRestClient.repoCreateBranchProtection` | `POST` | `/repos/{owner}/{repo}/branch_protections` | `E:branch.protection.write.v1` | Create a branch protections for a repository |
| `GiteaRestClient.repoCreateFile` | `POST` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.write.v1` | Create a file in a repository |
| `GiteaRestClient.repoCreateHook` | `POST` | `/repos/{owner}/{repo}/hooks` | `E:webhook.crud.v1` | Create a hook |
| `GiteaRestClient.repoCreateKey` | `POST` | `/repos/{owner}/{repo}/keys` | `E:deploy-key.crud.v1` | Add a key to a repository |
| `GiteaRestClient.repoCreateProject` | `POST` | `/repos/{owner}/{repo}/projects` | `U:gitea.project-boards` | Create a project owned by a repository |
| `GiteaRestClient.repoCreateProjectColumn` | `POST` | `/repos/{owner}/{repo}/projects/{id}/columns` | `U:gitea.project-boards` | Create a column in a project |
| `GiteaRestClient.repoCreatePullRequest` | `POST` | `/repos/{owner}/{repo}/pulls` | `E:pull-request.core.v1` | Create a pull request |
| `GiteaRestClient.repoCreatePullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews` | `E:pull-request.review.v1` | Create a review to a pull request |
| `GiteaRestClient.repoCreatePullReviewCommentReply` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/comments/{id}/replies` | `P:pull-request.comments.v1` | Reply to a pull request review comment |
| `GiteaRestClient.repoCreatePullReviewRequests` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/requested_reviewers` | `E:pull-request.reviewers.v1` | create review requests for a pull request |
| `GiteaRestClient.repoCreateRelease` | `POST` | `/repos/{owner}/{repo}/releases` | `E:release.crud.v1` | Create a release |
| `GiteaRestClient.repoCreateReleaseAttachment` | `POST` | `/repos/{owner}/{repo}/releases/{id}/assets` | Unmatched | Create a release attachment |
| `GiteaRestClient.repoCreateRunnerRegistrationToken` | `POST` | `/repos/{owner}/{repo}/actions/runners/registration-token` | Unmatched | Get a repository's actions runner registration token |
| `GiteaRestClient.repoCreateStatus` | `POST` | `/repos/{owner}/{repo}/statuses/{sha}` | `E:commit-status.v1` | Create a commit status |
| `GiteaRestClient.repoCreateTag` | `POST` | `/repos/{owner}/{repo}/tags` | `E:tag.create-delete.v1` | Create a new git tag in a repository |
| `GiteaRestClient.repoCreateTagProtection` | `POST` | `/repos/{owner}/{repo}/tag_protections` | Unmatched | Create a tag protections for a repository |
| `GiteaRestClient.repoCreateWikiPage` | `POST` | `/repos/{owner}/{repo}/wiki/new` | `E:wiki.crud.v1` | Create a wiki page |
| `GiteaRestClient.repoDelete` | `DELETE` | `/repos/{owner}/{repo}` | `E:repository.delete.v1` | Delete a repository |
| `GiteaRestClient.repoDeleteAvatar` | `DELETE` | `/repos/{owner}/{repo}/avatar` | Unmatched | Delete avatar |
| `GiteaRestClient.repoDeleteBranch` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}` | `E:branch.delete.v1` | Delete a specific branch from a repository |
| `GiteaRestClient.repoDeleteBranchProtection` | `DELETE` | `/repos/{owner}/{repo}/branch_protections/{name}` | `E:branch.protection.write.v1` | Delete a specific branch protection for the repository |
| `GiteaRestClient.repoDeleteCollaborator` | `DELETE` | `/repos/{owner}/{repo}/collaborators/{collaborator}` | Unmatched | Delete a collaborator from a repository |
| `GiteaRestClient.repoDeleteFile` | `DELETE` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.write.v1` | Delete a file in a repository |
| `GiteaRestClient.repoDeleteGitHook` | `DELETE` | `/repos/{owner}/{repo}/hooks/git/{id}` | Unmatched | Delete a Git hook in a repository |
| `GiteaRestClient.repoDeleteHook` | `DELETE` | `/repos/{owner}/{repo}/hooks/{id}` | `E:webhook.crud.v1` | Delete a hook in a repository |
| `GiteaRestClient.repoDeleteKey` | `DELETE` | `/repos/{owner}/{repo}/keys/{id}` | `E:deploy-key.crud.v1` | Delete a key from a repository |
| `GiteaRestClient.repoDeleteProject` | `DELETE` | `/repos/{owner}/{repo}/projects/{id}` | Unmatched | Delete a project |
| `GiteaRestClient.repoDeleteProjectColumn` | `DELETE` | `/repos/{owner}/{repo}/projects/{id}/columns/{column_id}` | Unmatched | Delete a project column |
| `GiteaRestClient.repoDeletePullReview` | `DELETE` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}` | Unmatched | Delete a specific review from a pull request |
| `GiteaRestClient.repoDeletePullReviewRequests` | `DELETE` | `/repos/{owner}/{repo}/pulls/{index}/requested_reviewers` | `E:pull-request.reviewers.v1` | cancel review requests for a pull request |
| `GiteaRestClient.repoDeletePushMirror` | `DELETE` | `/repos/{owner}/{repo}/push_mirrors/{name}` | Unmatched | deletes a push mirror from a repository by remoteName |
| `GiteaRestClient.repoDeleteRelease` | `DELETE` | `/repos/{owner}/{repo}/releases/{id}` | `E:release.crud.v1` | Delete a release |
| `GiteaRestClient.repoDeleteReleaseAttachment` | `DELETE` | `/repos/{owner}/{repo}/releases/{id}/assets/{attachment_id}` | Unmatched | Delete a release attachment |
| `GiteaRestClient.repoDeleteReleaseByTag` | `DELETE` | `/repos/{owner}/{repo}/releases/tags/{tag}` | Unmatched | Delete a release by tag name |
| `GiteaRestClient.repoDeleteTag` | `DELETE` | `/repos/{owner}/{repo}/tags/{tag}` | `E:tag.create-delete.v1` | Delete a repository's tag by name |
| `GiteaRestClient.repoDeleteTagProtection` | `DELETE` | `/repos/{owner}/{repo}/tag_protections/{id}` | Unmatched | Delete a specific tag protection for the repository |
| `GiteaRestClient.repoDeleteTeam` | `DELETE` | `/repos/{owner}/{repo}/teams/{team}` | Unmatched | Delete a team from a repository |
| `GiteaRestClient.repoDeleteTopic` | `DELETE` | `/repos/{owner}/{repo}/topics/{topic}` | Unmatched | Delete a topic from a repository |
| `GiteaRestClient.repoDeleteWikiPage` | `DELETE` | `/repos/{owner}/{repo}/wiki/page/{pageName}` | `E:wiki.crud.v1` | Delete a wiki page |
| `GiteaRestClient.repoDismissPullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/dismissals` | `E:pull-request.review.v1` | Dismiss a review for a pull request |
| `GiteaRestClient.repoDownloadCommitDiffOrPatch` | `GET` | `/repos/{owner}/{repo}/git/commits/{sha}.{diffType}` | Unmatched | Get a commit's diff or patch |
| `GiteaRestClient.repoDownloadPullDiffOrPatch` | `GET` | `/repos/{owner}/{repo}/pulls/{index}.{diffType}` | `E:pull-request.changes.v1` | Get a pull request diff or patch |
| `GiteaRestClient.repoEdit` | `PATCH` | `/repos/{owner}/{repo}` | `P:repository.archive.v1`<br>`E:repository.update.v1` | Edit a repository's properties. Only fields that are set will be changed. |
| `GiteaRestClient.repoEditBranchProtection` | `PATCH` | `/repos/{owner}/{repo}/branch_protections/{name}` | `E:branch.protection.write.v1` | Edit a branch protections for a repository. Only fields that are set will be changed |
| `GiteaRestClient.repoEditGitHook` | `PATCH` | `/repos/{owner}/{repo}/hooks/git/{id}` | Unmatched | Edit a Git hook in a repository |
| `GiteaRestClient.repoEditHook` | `PATCH` | `/repos/{owner}/{repo}/hooks/{id}` | `E:webhook.crud.v1` | Edit a hook in a repository |
| `GiteaRestClient.repoEditProject` | `PATCH` | `/repos/{owner}/{repo}/projects/{id}` | Unmatched | Edit a project |
| `GiteaRestClient.repoEditProjectColumn` | `PATCH` | `/repos/{owner}/{repo}/projects/{id}/columns/{column_id}` | Unmatched | Edit a project column |
| `GiteaRestClient.repoEditPullRequest` | `PATCH` | `/repos/{owner}/{repo}/pulls/{index}` | `E:pull-request.core.v1` | Update a pull request. If using deadline only the date will be taken into account, and time of day ignored. |
| `GiteaRestClient.repoEditRelease` | `PATCH` | `/repos/{owner}/{repo}/releases/{id}` | `E:release.crud.v1` | Update a release |
| `GiteaRestClient.repoEditReleaseAttachment` | `PATCH` | `/repos/{owner}/{repo}/releases/{id}/assets/{attachment_id}` | Unmatched | Edit a release attachment |
| `GiteaRestClient.repoEditTagProtection` | `PATCH` | `/repos/{owner}/{repo}/tag_protections/{id}` | Unmatched | Edit a tag protections for a repository. Only fields that are set will be changed |
| `GiteaRestClient.repoEditWikiPage` | `PATCH` | `/repos/{owner}/{repo}/wiki/page/{pageName}` | `E:wiki.crud.v1` | Edit a wiki page |
| `GiteaRestClient.repoGet` | `GET` | `/repos/{owner}/{repo}` | `E:repository.get.v1` | Get a repository |
| `GiteaRestClient.repoGetAllCommits` | `GET` | `/repos/{owner}/{repo}/commits` | `E:commit.list.v1` | Get a list of all commits from a repository |
| `GiteaRestClient.repoGetArchive` | `GET` | `/repos/{owner}/{repo}/archive/{archive}` | Unmatched | Get an archive of a repository |
| `GiteaRestClient.repoGetAssignees` | `GET` | `/repos/{owner}/{repo}/assignees` | Unmatched | Return all users that have write access and can be assigned to issues |
| `GiteaRestClient.repoGetBranch` | `GET` | `/repos/{owner}/{repo}/branches/{branch}` | `E:branch.get.v1` | Retrieve a specific branch from a repository, including its effective branch protection |
| `GiteaRestClient.repoGetBranchProtection` | `GET` | `/repos/{owner}/{repo}/branch_protections/{name}` | `E:branch.protection.read.v1` | Get a specific branch protection for the repository |
| `GiteaRestClient.repoGetById` | `GET` | `/repositories/{id}` | `E:repository.get.v1` | Get a repository by id |
| `GiteaRestClient.repoGetCombinedStatusByRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/status` | Unmatched | Get a commit's combined status, by branch/tag/commit reference |
| `GiteaRestClient.repoGetCommitPullRequest` | `GET` | `/repos/{owner}/{repo}/commits/{sha}/pull` | Unmatched | Get the merged pull request of the commit |
| `GiteaRestClient.repoGetContents` | `GET` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.read.v1` | Gets the metadata and contents (if a file) of an entry in a repository, or a list of entries if a dir. |
| `GiteaRestClient.repoGetContentsExt` | `GET` | `/repos/{owner}/{repo}/contents-ext/{filepath}` | `E:content.read.v1` | The extended "contents" API, to get file metadata and/or content, or list a directory. |
| `GiteaRestClient.repoGetContentsList` | `GET` | `/repos/{owner}/{repo}/contents` | `E:content.read.v1` | Gets the metadata of all the entries of the root dir. |
| `GiteaRestClient.repoGetEditorConfig` | `GET` | `/repos/{owner}/{repo}/editorconfig/{filepath}` | Unmatched | Get the EditorConfig definitions of a file in a repository |
| `GiteaRestClient.repoGetFileContents` | `GET` | `/repos/{owner}/{repo}/file-contents` | Unmatched | Get the metadata and contents of requested files |
| `GiteaRestClient.repoGetFileContentsPost` | `POST` | `/repos/{owner}/{repo}/file-contents` | Unmatched | Get the metadata and contents of requested files |
| `GiteaRestClient.repoGetGitHook` | `GET` | `/repos/{owner}/{repo}/hooks/git/{id}` | Unmatched | Get a Git hook |
| `GiteaRestClient.repoGetHook` | `GET` | `/repos/{owner}/{repo}/hooks/{id}` | `E:webhook.crud.v1` | Get a hook |
| `GiteaRestClient.repoGetIssueConfig` | `GET` | `/repos/{owner}/{repo}/issue_config` | Unmatched | Returns the issue config for a repo |
| `GiteaRestClient.repoGetIssueTemplates` | `GET` | `/repos/{owner}/{repo}/issue_templates` | Unmatched | Get available issue templates for a repository |
| `GiteaRestClient.repoGetKey` | `GET` | `/repos/{owner}/{repo}/keys/{id}` | `E:deploy-key.crud.v1` | Get a repository's key by id |
| `GiteaRestClient.repoGetLanguages` | `GET` | `/repos/{owner}/{repo}/languages` | Unmatched | Get languages and number of bytes of code written |
| `GiteaRestClient.repoGetLatestRelease` | `GET` | `/repos/{owner}/{repo}/releases/latest` | Unmatched | Gets the most recent non-prerelease, non-draft release of a repository, sorted by created_at |
| `GiteaRestClient.repoGetLicenses` | `GET` | `/repos/{owner}/{repo}/licenses` | Unmatched | Get repo licenses |
| `GiteaRestClient.repoGetNote` | `GET` | `/repos/{owner}/{repo}/git/notes/{sha}` | Unmatched | Get a note corresponding to a single commit from a repository |
| `GiteaRestClient.repoGetProject` | `GET` | `/repos/{owner}/{repo}/projects/{id}` | Unmatched | Get a project |
| `GiteaRestClient.repoGetProjectColumn` | `GET` | `/repos/{owner}/{repo}/projects/{id}/columns/{column_id}` | Unmatched | Get a project column |
| `GiteaRestClient.repoGetPullRequest` | `GET` | `/repos/{owner}/{repo}/pulls/{index}` | `E:pull-request.core.v1` | Get a pull request |
| `GiteaRestClient.repoGetPullRequestByBaseHead` | `GET` | `/repos/{owner}/{repo}/pulls/{base}/{head}` | Unmatched | Get a pull request by base and head |
| `GiteaRestClient.repoGetPullRequestCommits` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/commits` | `E:pull-request.changes.v1` | Get commits for a pull request |
| `GiteaRestClient.repoGetPullRequestFiles` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/files` | `E:pull-request.changes.v1` | Get changed files for a pull request |
| `GiteaRestClient.repoGetPullReview` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}` | `E:pull-request.review.v1` | Get a specific review for a pull request |
| `GiteaRestClient.repoGetPullReviewComments` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/comments` | `P:pull-request.comments.v1` | Get a specific review for a pull request |
| `GiteaRestClient.repoGetPushMirrorByRemoteName` | `GET` | `/repos/{owner}/{repo}/push_mirrors/{name}` | Unmatched | Get push mirror of the repository by remoteName |
| `GiteaRestClient.repoGetRawFile` | `GET` | `/repos/{owner}/{repo}/raw/{filepath}` | `E:content.read.v1` | Get a file from a repository |
| `GiteaRestClient.repoGetRawFileOrLfs` | `GET` | `/repos/{owner}/{repo}/media/{filepath}` | Unmatched | Get a file or it's LFS object from a repository |
| `GiteaRestClient.repoGetRelease` | `GET` | `/repos/{owner}/{repo}/releases/{id}` | `E:release.crud.v1` | Get a release |
| `GiteaRestClient.repoGetReleaseAttachment` | `GET` | `/repos/{owner}/{repo}/releases/{id}/assets/{attachment_id}` | Unmatched | Get a release attachment |
| `GiteaRestClient.repoGetReleaseByTag` | `GET` | `/repos/{owner}/{repo}/releases/tags/{tag}` | `E:release.crud.v1` | Get a release by tag name |
| `GiteaRestClient.repoGetRepoPermissions` | `GET` | `/repos/{owner}/{repo}/collaborators/{collaborator}/permission` | Unmatched | Get repository permissions for a user |
| `GiteaRestClient.repoGetReviewers` | `GET` | `/repos/{owner}/{repo}/reviewers` | `E:pull-request.reviewers.v1` | Return all users that can be requested to review in this repo |
| `GiteaRestClient.repoGetSingleCommit` | `GET` | `/repos/{owner}/{repo}/git/commits/{sha}` | `E:commit.get.v1` | Get a single commit from a repository, it has a GitHub-compatible alias "/repos/{owner}/{repo}/commits/{ref}" |
| `GiteaRestClient.repoGetTag` | `GET` | `/repos/{owner}/{repo}/tags/{tag}` | `E:tag.list-get.v1` | Get the tag of a repository by tag name |
| `GiteaRestClient.repoGetTagProtection` | `GET` | `/repos/{owner}/{repo}/tag_protections/{id}` | Unmatched | Get a specific tag protection for the repository |
| `GiteaRestClient.repoGetWikiPage` | `GET` | `/repos/{owner}/{repo}/wiki/page/{pageName}` | `E:wiki.crud.v1` | Get a wiki page |
| `GiteaRestClient.repoGetWikiPageRevisions` | `GET` | `/repos/{owner}/{repo}/wiki/revisions/{pageName}` | Unmatched | Get revisions of a wiki page |
| `GiteaRestClient.repoGetWikiPages` | `GET` | `/repos/{owner}/{repo}/wiki/pages` | `E:wiki.crud.v1` | Get all wiki pages |
| `GiteaRestClient.repoListActionsSecrets` | `GET` | `/repos/{owner}/{repo}/actions/secrets` | Unmatched | List a repo's actions secrets |
| `GiteaRestClient.repoListActivityFeeds` | `GET` | `/repos/{owner}/{repo}/activities/feeds` | Unmatched | List a repository's activity feeds |
| `GiteaRestClient.repoListAllGitRefs` | `GET` | `/repos/{owner}/{repo}/git/refs` | `E:git.ref.read.v1` | Get specified ref or filtered repository's refs |
| `GiteaRestClient.repoListBranchProtection` | `GET` | `/repos/{owner}/{repo}/branch_protections` | `E:branch.protection.read.v1` | List branch protections for a repository |
| `GiteaRestClient.repoListBranches` | `GET` | `/repos/{owner}/{repo}/branches` | `E:branch.list.v1` | List a repository's branches |
| `GiteaRestClient.repoListCollaborators` | `GET` | `/repos/{owner}/{repo}/collaborators` | `E:collaborator.read.v1` | List a repository's collaborators |
| `GiteaRestClient.repoListGitHooks` | `GET` | `/repos/{owner}/{repo}/hooks/git` | Unmatched | List the Git hooks in a repository |
| `GiteaRestClient.repoListGitRefs` | `GET` | `/repos/{owner}/{repo}/git/refs/{ref}` | `E:git.ref.read.v1` | Get specified ref or filtered repository's refs |
| `GiteaRestClient.repoListHooks` | `GET` | `/repos/{owner}/{repo}/hooks` | `E:webhook.crud.v1` | List the hooks in a repository |
| `GiteaRestClient.repoListKeys` | `GET` | `/repos/{owner}/{repo}/keys` | `E:deploy-key.crud.v1` | List a repository's keys |
| `GiteaRestClient.repoListPinnedIssues` | `GET` | `/repos/{owner}/{repo}/issues/pinned` | Unmatched | List a repo's pinned issues |
| `GiteaRestClient.repoListPinnedPullRequests` | `GET` | `/repos/{owner}/{repo}/pulls/pinned` | Unmatched | List a repo's pinned pull requests |
| `GiteaRestClient.repoListProjectColumnIssues` | `GET` | `/repos/{owner}/{repo}/projects/{id}/columns/{column_id}/issues` | Unmatched | List the issues in a project column |
| `GiteaRestClient.repoListProjectColumns` | `GET` | `/repos/{owner}/{repo}/projects/{id}/columns` | Unmatched | List a project's columns |
| `GiteaRestClient.repoListProjects` | `GET` | `/repos/{owner}/{repo}/projects` | Unmatched | List a repository's projects |
| `GiteaRestClient.repoListPullRequests` | `GET` | `/repos/{owner}/{repo}/pulls` | `E:pull-request.core.v1` | List a repo's pull requests |
| `GiteaRestClient.repoListPullReviews` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/reviews` | `E:pull-request.review.v1` | List all reviews for a pull request |
| `GiteaRestClient.repoListPushMirrors` | `GET` | `/repos/{owner}/{repo}/push_mirrors` | Unmatched | Get all push mirrors of the repository |
| `GiteaRestClient.repoListReleaseAttachments` | `GET` | `/repos/{owner}/{repo}/releases/{id}/assets` | Unmatched | List release's attachments |
| `GiteaRestClient.repoListReleases` | `GET` | `/repos/{owner}/{repo}/releases` | `E:release.crud.v1` | List a repo's releases |
| `GiteaRestClient.repoListStargazers` | `GET` | `/repos/{owner}/{repo}/stargazers` | Unmatched | List a repo's stargazers |
| `GiteaRestClient.repoListStatuses` | `GET` | `/repos/{owner}/{repo}/statuses/{sha}` | `E:commit-status.v1` | Get a commit's statuses |
| `GiteaRestClient.repoListStatusesByRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/statuses` | `E:commit-status.v1` | Get a commit's statuses, by branch/tag/commit reference |
| `GiteaRestClient.repoListSubscribers` | `GET` | `/repos/{owner}/{repo}/subscribers` | Unmatched | List a repo's watchers |
| `GiteaRestClient.repoListTagProtection` | `GET` | `/repos/{owner}/{repo}/tag_protections` | Unmatched | List tag protections for a repository |
| `GiteaRestClient.repoListTags` | `GET` | `/repos/{owner}/{repo}/tags` | `E:tag.list-get.v1` | List a repository's tags |
| `GiteaRestClient.repoListTeams` | `GET` | `/repos/{owner}/{repo}/teams` | Unmatched | List a repository's teams |
| `GiteaRestClient.repoListTopics` | `GET` | `/repos/{owner}/{repo}/topics` | Unmatched | Get list of topics that a repository has |
| `GiteaRestClient.repoMergePullRequest` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/merge` | `E:pull-request.merge.v1` | Merge a pull request |
| `GiteaRestClient.repoMergeUpstream` | `POST` | `/repos/{owner}/{repo}/merge-upstream` | Unmatched | Merge a branch from upstream |
| `GiteaRestClient.repoMigrate` | `POST` | `/repos/migrate` | Unmatched | Migrate a remote git repository |
| `GiteaRestClient.repoMirrorSync` | `POST` | `/repos/{owner}/{repo}/mirror-sync` | Unmatched | Sync a mirrored repository |
| `GiteaRestClient.repoMoveProjectColumns` | `POST` | `/repos/{owner}/{repo}/projects/{id}/columns/move` | Unmatched | Reorder a project's columns |
| `GiteaRestClient.repoMoveProjectIssue` | `POST` | `/repos/{owner}/{repo}/projects/{id}/issues/{issue_id}/move` | `U:gitea.project-boards` | Move an issue between a project's columns |
| `GiteaRestClient.repoNewPinAllowed` | `GET` | `/repos/{owner}/{repo}/new_pin_allowed` | Unmatched | Returns if new Issue Pins are allowed |
| `GiteaRestClient.repoPullRequestIsMerged` | `GET` | `/repos/{owner}/{repo}/pulls/{index}/merge` | Unmatched | Check if a pull request has been merged |
| `GiteaRestClient.repoPushMirrorSync` | `POST` | `/repos/{owner}/{repo}/push_mirrors-sync` | Unmatched | Sync all push mirrored repository |
| `GiteaRestClient.repoRemoveIssueFromProjectColumn` | `DELETE` | `/repos/{owner}/{repo}/projects/{id}/columns/{column_id}/issues/{issue_id}` | Unmatched | Remove an issue from a project column |
| `GiteaRestClient.repoRenameBranch` | `PATCH` | `/repos/{owner}/{repo}/branches/{branch}` | Unmatched | Rename a branch |
| `GiteaRestClient.repoResolvePullReviewComment` | `POST` | `/repos/{owner}/{repo}/pulls/comments/{id}/resolve` | Unmatched | Resolve a pull request review comment |
| `GiteaRestClient.repoSearch` | `GET` | `/repos/search` | Unmatched | Search for repositories |
| `GiteaRestClient.repoSetDefaultProjectColumn` | `POST` | `/repos/{owner}/{repo}/projects/{id}/columns/{column_id}/default` | `U:gitea.project-boards` | Set a project's default column |
| `GiteaRestClient.repoSigningKey` | `GET` | `/repos/{owner}/{repo}/signing-key.gpg` | Unmatched | Get signing-key.gpg for given repository |
| `GiteaRestClient.repoSigningKeySsh` | `GET` | `/repos/{owner}/{repo}/signing-key.pub` | Unmatched | Get signing-key.pub for given repository |
| `GiteaRestClient.repoSubmitPullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}` | `E:pull-request.review.v1` | Submit a pending review to a pull request |
| `GiteaRestClient.repoTestHook` | `POST` | `/repos/{owner}/{repo}/hooks/{id}/tests` | `E:webhook.crud.v1` | Test a push webhook |
| `GiteaRestClient.repoTrackedTimes` | `GET` | `/repos/{owner}/{repo}/times` | Unmatched | List a repo's tracked times |
| `GiteaRestClient.repoTransfer` | `POST` | `/repos/{owner}/{repo}/transfer` | Unmatched | Transfer a repo ownership |
| `GiteaRestClient.repoUnDismissPullReview` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/reviews/{id}/undismissals` | Unmatched | Cancel to dismiss a review for a pull request |
| `GiteaRestClient.repoUnresolvePullReviewComment` | `POST` | `/repos/{owner}/{repo}/pulls/comments/{id}/unresolve` | Unmatched | Unresolve a pull request review comment |
| `GiteaRestClient.repoUpdateAvatar` | `POST` | `/repos/{owner}/{repo}/avatar` | Unmatched | Update avatar |
| `GiteaRestClient.repoUpdateBranch` | `PUT` | `/repos/{owner}/{repo}/branches/{branch}` | Unmatched | Update a branch reference to a new commit |
| `GiteaRestClient.repoUpdateBranchProtectionPriories` | `POST` | `/repos/{owner}/{repo}/branch_protections/priority` | Unmatched | Update the priorities of branch protections for a repository. |
| `GiteaRestClient.repoUpdateFile` | `PUT` | `/repos/{owner}/{repo}/contents/{filepath}` | `E:content.write.v1` | Update a file in a repository if SHA is set, or create the file if SHA is not set |
| `GiteaRestClient.repoUpdatePullRequest` | `POST` | `/repos/{owner}/{repo}/pulls/{index}/update` | Unmatched | Merge PR's baseBranch into headBranch |
| `GiteaRestClient.repoUpdateTopics` | `PUT` | `/repos/{owner}/{repo}/topics` | Unmatched | Replace list of topics for a repository |
| `GiteaRestClient.repoValidateIssueConfig` | `GET` | `/repos/{owner}/{repo}/issue_config/validate` | Unmatched | Returns the validation information for a issue config |
| `GiteaRestClient.rerunFailedWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run}/rerun-failed-jobs` | Unmatched | Reruns all failed jobs in a workflow run |
| `GiteaRestClient.rerunWorkflowJob` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run}/jobs/{job_id}/rerun` | Unmatched | Reruns a specific workflow job in a run |
| `GiteaRestClient.rerunWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run}/rerun` | `P:ci.run.v1` | Reruns an entire workflow run |
| `GiteaRestClient.topicSearch` | `GET` | `/topics/search` | Unmatched | search topics via keyword |
| `GiteaRestClient.updateRepoRunner` | `PATCH` | `/repos/{owner}/{repo}/actions/runners/{runner_id}` | Unmatched | Update a repo-level runner |
| `GiteaRestClient.updateRepoSecret` | `PUT` | `/repos/{owner}/{repo}/actions/secrets/{secretname}` | Unmatched | Create or Update a secret value in a repository |
| `GiteaRestClient.updateRepoVariable` | `PUT` | `/repos/{owner}/{repo}/actions/variables/{variablename}` | Unmatched | Update a repo-level variable |
| `GiteaRestClient.userCurrentCheckSubscription` | `GET` | `/repos/{owner}/{repo}/subscription` | Unmatched | Check if the current user is watching a repo |
| `GiteaRestClient.userCurrentDeleteSubscription` | `DELETE` | `/repos/{owner}/{repo}/subscription` | Unmatched | Unwatch a repo |
| `GiteaRestClient.userCurrentPutSubscription` | `PUT` | `/repos/{owner}/{repo}/subscription` | Unmatched | Watch a repo |
| `GiteaRestClient.userTrackedTimes` | `GET` | `/repos/{owner}/{repo}/times/{user}` | Unmatched | [Deprecated] List a user's tracked times in a repo |

</details>

<details>
<summary><strong>settings</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.getGeneralApiSettings` | `GET` | `/settings/api` | Unmatched | Get instance's global settings for api |
| `GiteaRestClient.getGeneralAttachmentSettings` | `GET` | `/settings/attachment` | Unmatched | Get instance's global settings for Attachment |
| `GiteaRestClient.getGeneralRepositorySettings` | `GET` | `/settings/repository` | Unmatched | Get instance's global settings for repositories |
| `GiteaRestClient.getGeneralUiSettings` | `GET` | `/settings/ui` | Unmatched | Get instance's global settings for ui |

</details>

<details>
<summary><strong>user</strong> (93)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GiteaRestClient.createCurrentUserRepo` | `POST` | `/user/repos` | `E:repository.create.v1` | Create a repository |
| `GiteaRestClient.createUserVariable` | `POST` | `/user/actions/variables/{variablename}` | Unmatched | Create a user-level variable |
| `GiteaRestClient.deleteUserRunner` | `DELETE` | `/user/actions/runners/{runner_id}` | Unmatched | Delete a user-level runner |
| `GiteaRestClient.deleteUserSecret` | `DELETE` | `/user/actions/secrets/{secretname}` | Unmatched | Delete a secret in a user scope |
| `GiteaRestClient.deleteUserVariable` | `DELETE` | `/user/actions/variables/{variablename}` | Unmatched | Delete a user-level variable which is created by current doer |
| `GiteaRestClient.getUserRunner` | `GET` | `/user/actions/runners/{runner_id}` | Unmatched | Get a user-level runner |
| `GiteaRestClient.getUserRunners` | `GET` | `/user/actions/runners` | `P:ci.runners.v1` | Get user-level runners |
| `GiteaRestClient.getUserSettings` | `GET` | `/user/settings` | Unmatched | Get user settings |
| `GiteaRestClient.getUserVariable` | `GET` | `/user/actions/variables/{variablename}` | Unmatched | Get a user-level variable which is created by current doer |
| `GiteaRestClient.getUserVariablesList` | `GET` | `/user/actions/variables` | Unmatched | Get the user-level list of variables which is created by current doer |
| `GiteaRestClient.getUserWorkflowJobs` | `GET` | `/user/actions/jobs` | Unmatched | Get workflow jobs |
| `GiteaRestClient.getUserWorkflowRuns` | `GET` | `/user/actions/runs` | Unmatched | Get workflow runs |
| `GiteaRestClient.getVerificationToken` | `GET` | `/user/gpg_key_token` | Unmatched | Get a Token to verify |
| `GiteaRestClient.updateUserRunner` | `PATCH` | `/user/actions/runners/{runner_id}` | Unmatched | Update a user-level runner |
| `GiteaRestClient.updateUserSecret` | `PUT` | `/user/actions/secrets/{secretname}` | Unmatched | Create or Update a secret value in a user scope |
| `GiteaRestClient.updateUserSettings` | `PATCH` | `/user/settings` | Unmatched | Update user settings |
| `GiteaRestClient.updateUserVariable` | `PUT` | `/user/actions/variables/{variablename}` | Unmatched | Update a user-level variable which is created by current doer |
| `GiteaRestClient.userAddEmail` | `POST` | `/user/emails` | Unmatched | Add email addresses |
| `GiteaRestClient.userBlockUser` | `PUT` | `/user/blocks/{username}` | Unmatched | Block a user |
| `GiteaRestClient.userCheckFollowing` | `GET` | `/users/{username}/following/{target}` | Unmatched | Check if one user is following another user |
| `GiteaRestClient.userCheckUserBlock` | `GET` | `/user/blocks/{username}` | Unmatched | Check if a user is blocked by the authenticated user |
| `GiteaRestClient.userCreateHook` | `POST` | `/user/hooks` | Unmatched | Create a hook |
| `GiteaRestClient.userCreateOAuth2Application` | `POST` | `/user/applications/oauth2` | Unmatched | creates a new OAuth2 application |
| `GiteaRestClient.userCreateRunnerRegistrationToken` | `POST` | `/user/actions/runners/registration-token` | Unmatched | Get a user's actions runner registration token |
| `GiteaRestClient.userCreateToken` | `POST` | `/users/{username}/tokens` | Unmatched | Create an access token |
| `GiteaRestClient.userCurrentAddIssueToProjectColumn` | `POST` | `/user/projects/{id}/columns/{column_id}/issues/{issue_id}` | Unmatched | Add an issue to a project column |
| `GiteaRestClient.userCurrentCheckFollowing` | `GET` | `/user/following/{username}` | Unmatched | Check whether a user is followed by the authenticated user |
| `GiteaRestClient.userCurrentCheckStarring` | `GET` | `/user/starred/{owner}/{repo}` | Unmatched | Whether the authenticated is starring the repo |
| `GiteaRestClient.userCurrentCreateProject` | `POST` | `/user/projects` | Unmatched | Create a project owned by the authenticated user |
| `GiteaRestClient.userCurrentCreateProjectColumn` | `POST` | `/user/projects/{id}/columns` | Unmatched | Create a column in a project |
| `GiteaRestClient.userCurrentDeleteFollow` | `DELETE` | `/user/following/{username}` | Unmatched | Unfollow a user |
| `GiteaRestClient.userCurrentDeleteGpgKey` | `DELETE` | `/user/gpg_keys/{id}` | Unmatched | Remove a GPG key |
| `GiteaRestClient.userCurrentDeleteKey` | `DELETE` | `/user/keys/{id}` | Unmatched | Delete a public key |
| `GiteaRestClient.userCurrentDeleteProject` | `DELETE` | `/user/projects/{id}` | Unmatched | Delete a project |
| `GiteaRestClient.userCurrentDeleteProjectColumn` | `DELETE` | `/user/projects/{id}/columns/{column_id}` | Unmatched | Delete a project column |
| `GiteaRestClient.userCurrentDeleteStar` | `DELETE` | `/user/starred/{owner}/{repo}` | Unmatched | Unstar the given repo |
| `GiteaRestClient.userCurrentEditProject` | `PATCH` | `/user/projects/{id}` | Unmatched | Edit a project |
| `GiteaRestClient.userCurrentEditProjectColumn` | `PATCH` | `/user/projects/{id}/columns/{column_id}` | Unmatched | Edit a project column |
| `GiteaRestClient.userCurrentGetGpgKey` | `GET` | `/user/gpg_keys/{id}` | Unmatched | Get a GPG key |
| `GiteaRestClient.userCurrentGetKey` | `GET` | `/user/keys/{id}` | Unmatched | Get a public key |
| `GiteaRestClient.userCurrentGetProject` | `GET` | `/user/projects/{id}` | Unmatched | Get a project |
| `GiteaRestClient.userCurrentGetProjectColumn` | `GET` | `/user/projects/{id}/columns/{column_id}` | Unmatched | Get a project column |
| `GiteaRestClient.userCurrentListFollowers` | `GET` | `/user/followers` | Unmatched | List the authenticated user's followers |
| `GiteaRestClient.userCurrentListFollowing` | `GET` | `/user/following` | Unmatched | List the users that the authenticated user is following |
| `GiteaRestClient.userCurrentListGpgKeys` | `GET` | `/user/gpg_keys` | Unmatched | List the authenticated user's GPG keys |
| `GiteaRestClient.userCurrentListKeys` | `GET` | `/user/keys` | Unmatched | List the authenticated user's public keys |
| `GiteaRestClient.userCurrentListProjectColumnIssues` | `GET` | `/user/projects/{id}/columns/{column_id}/issues` | Unmatched | List the issues in a project column |
| `GiteaRestClient.userCurrentListProjectColumns` | `GET` | `/user/projects/{id}/columns` | Unmatched | List a project's columns |
| `GiteaRestClient.userCurrentListProjects` | `GET` | `/user/projects` | Unmatched | List your projects |
| `GiteaRestClient.userCurrentListRepos` | `GET` | `/user/repos` | `E:repository.list.v1` | List the repos that the authenticated user owns |
| `GiteaRestClient.userCurrentListStarred` | `GET` | `/user/starred` | Unmatched | The repos that the authenticated user has starred |
| `GiteaRestClient.userCurrentListSubscriptions` | `GET` | `/user/subscriptions` | Unmatched | List repositories watched by the authenticated user |
| `GiteaRestClient.userCurrentMoveProjectColumns` | `POST` | `/user/projects/{id}/columns/move` | Unmatched | Reorder a project's columns |
| `GiteaRestClient.userCurrentMoveProjectIssue` | `POST` | `/user/projects/{id}/issues/{issue_id}/move` | Unmatched | Move an issue between a project's columns |
| `GiteaRestClient.userCurrentPostGpgKey` | `POST` | `/user/gpg_keys` | Unmatched | Create a GPG key |
| `GiteaRestClient.userCurrentPostKey` | `POST` | `/user/keys` | Unmatched | Create a public key |
| `GiteaRestClient.userCurrentPutFollow` | `PUT` | `/user/following/{username}` | Unmatched | Follow a user |
| `GiteaRestClient.userCurrentPutStar` | `PUT` | `/user/starred/{owner}/{repo}` | Unmatched | Star the given repo |
| `GiteaRestClient.userCurrentRemoveIssueFromProjectColumn` | `DELETE` | `/user/projects/{id}/columns/{column_id}/issues/{issue_id}` | Unmatched | Remove an issue from a project column |
| `GiteaRestClient.userCurrentSetDefaultProjectColumn` | `POST` | `/user/projects/{id}/columns/{column_id}/default` | Unmatched | Set a project's default column |
| `GiteaRestClient.userCurrentTrackedTimes` | `GET` | `/user/times` | Unmatched | List the current user's tracked times |
| `GiteaRestClient.userDeleteAccessToken` | `DELETE` | `/users/{username}/tokens/{token}` | Unmatched | delete an access token |
| `GiteaRestClient.userDeleteAvatar` | `DELETE` | `/user/avatar` | Unmatched | Delete Avatar |
| `GiteaRestClient.userDeleteEmail` | `DELETE` | `/user/emails` | Unmatched | Delete email addresses |
| `GiteaRestClient.userDeleteHook` | `DELETE` | `/user/hooks/{id}` | Unmatched | Delete a hook |
| `GiteaRestClient.userDeleteOAuth2Application` | `DELETE` | `/user/applications/oauth2/{id}` | Unmatched | delete an OAuth2 Application |
| `GiteaRestClient.userEditHook` | `PATCH` | `/user/hooks/{id}` | Unmatched | Update a hook |
| `GiteaRestClient.userGet` | `GET` | `/users/{username}` | `E:user.named.read.v1` | Get a user |
| `GiteaRestClient.userGetCurrent` | `GET` | `/user` | `E:user.current.read.v1` | Get the authenticated user |
| `GiteaRestClient.userGetHeatmapData` | `GET` | `/users/{username}/heatmap` | Unmatched | Get a user's heatmap |
| `GiteaRestClient.userGetHook` | `GET` | `/user/hooks/{id}` | Unmatched | Get a hook |
| `GiteaRestClient.userGetOAuth2Application_1tziy91` | `GET` | `/user/applications/oauth2/{id}` | Unmatched | get an OAuth2 Application |
| `GiteaRestClient.userGetOauth2Application_0hhkiwt` | `GET` | `/user/applications/oauth2` | Unmatched | List the authenticated user's oauth2 applications |
| `GiteaRestClient.userGetStopWatches` | `GET` | `/user/stopwatches` | Unmatched | Get list of all existing stopwatches |
| `GiteaRestClient.userGetTokens` | `GET` | `/users/{username}/tokens` | Unmatched | List the authenticated user's access tokens |
| `GiteaRestClient.userListActivityFeeds` | `GET` | `/users/{username}/activities/feeds` | Unmatched | List a user's activity feeds |
| `GiteaRestClient.userListBlocks` | `GET` | `/user/blocks` | Unmatched | List users blocked by the authenticated user |
| `GiteaRestClient.userListEmails` | `GET` | `/user/emails` | Unmatched | List the authenticated user's email addresses |
| `GiteaRestClient.userListFollowers` | `GET` | `/users/{username}/followers` | Unmatched | List the given user's followers |
| `GiteaRestClient.userListFollowing` | `GET` | `/users/{username}/following` | Unmatched | List the users that the given user is following |
| `GiteaRestClient.userListGpgKeys` | `GET` | `/users/{username}/gpg_keys` | Unmatched | List the given user's GPG keys |
| `GiteaRestClient.userListHooks` | `GET` | `/user/hooks` | Unmatched | List the authenticated user's webhooks |
| `GiteaRestClient.userListKeys` | `GET` | `/users/{username}/keys` | Unmatched | List the given user's public keys |
| `GiteaRestClient.userListProjects` | `GET` | `/users/{username}/projects` | Unmatched | List a user's projects |
| `GiteaRestClient.userListRepos` | `GET` | `/users/{username}/repos` | `E:repository.list.v1` | List the repos owned by the given user |
| `GiteaRestClient.userListStarred` | `GET` | `/users/{username}/starred` | Unmatched | The repos that the given user has starred |
| `GiteaRestClient.userListSubscriptions` | `GET` | `/users/{username}/subscriptions` | Unmatched | List the repositories watched by a user |
| `GiteaRestClient.userListTeams` | `GET` | `/user/teams` | Unmatched | List all the teams a user belongs to |
| `GiteaRestClient.userSearch` | `GET` | `/users/search` | `E:user.search.v1` | Search for users |
| `GiteaRestClient.userUnblockUser` | `DELETE` | `/user/blocks/{username}` | Unmatched | Unblock a user |
| `GiteaRestClient.userUpdateAvatar` | `POST` | `/user/avatar` | Unmatched | Update Avatar |
| `GiteaRestClient.userUpdateOAuth2Application` | `PATCH` | `/user/applications/oauth2/{id}` | Unmatched | update an OAuth2 Application, this includes regenerating the client secret |
| `GiteaRestClient.userVerifyGpgKey` | `POST` | `/user/gpg_key_verify` | Unmatched | Verify a GPG key |

</details>

### GitHub: 1221 methods

<details>
<summary><strong>actions</strong> (187)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.actionsAddCustomLabelsToSelfHostedRunnerForOrg` | `POST` | `/orgs/{org}/actions/runners/{runner_id}/labels` | Unmatched | Add custom labels to a self-hosted runner for an organization |
| `GitHubRestClient.actionsAddCustomLabelsToSelfHostedRunnerForRepo` | `POST` | `/repos/{owner}/{repo}/actions/runners/{runner_id}/labels` | Unmatched | Add custom labels to a self-hosted runner for a repository |
| `GitHubRestClient.actionsAddRepoAccessToSelfHostedRunnerGroupInOrg` | `PUT` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}` | Unmatched | Add repository access to a self-hosted runner group in an organization |
| `GitHubRestClient.actionsAddSelectedRepoToOrgSecret` | `PUT` | `/orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Add selected repository to an organization secret |
| `GitHubRestClient.actionsAddSelectedRepoToOrgVariable` | `PUT` | `/orgs/{org}/actions/variables/{name}/repositories/{repository_id}` | Unmatched | Add selected repository to an organization variable |
| `GitHubRestClient.actionsAddSelfHostedRunnerToGroupForOrg` | `PUT` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/runners/{runner_id}` | Unmatched | Add a self-hosted runner to a group for an organization |
| `GitHubRestClient.actionsApproveWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/approve` | Unmatched | Approve a workflow run for a fork pull request |
| `GitHubRestClient.actionsCancelWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/cancel` | `P:ci.run.v1` | Cancel a workflow run |
| `GitHubRestClient.actionsCreateEnvironmentVariable` | `POST` | `/repos/{owner}/{repo}/environments/{environment_name}/variables` | Unmatched | Create an environment variable |
| `GitHubRestClient.actionsCreateHostedRunnerForOrg` | `POST` | `/orgs/{org}/actions/hosted-runners` | Unmatched | Create a GitHub-hosted runner for an organization |
| `GitHubRestClient.actionsCreateOrUpdateEnvironmentSecret` | `PUT` | `/repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}` | Unmatched | Create or update an environment secret |
| `GitHubRestClient.actionsCreateOrUpdateOrgSecret` | `PUT` | `/orgs/{org}/actions/secrets/{secret_name}` | Unmatched | Create or update an organization secret |
| `GitHubRestClient.actionsCreateOrUpdateRepoSecret` | `PUT` | `/repos/{owner}/{repo}/actions/secrets/{secret_name}` | Unmatched | Create or update a repository secret |
| `GitHubRestClient.actionsCreateOrgVariable` | `POST` | `/orgs/{org}/actions/variables` | Unmatched | Create an organization variable |
| `GitHubRestClient.actionsCreateRegistrationTokenForOrg` | `POST` | `/orgs/{org}/actions/runners/registration-token` | Unmatched | Create a registration token for an organization |
| `GitHubRestClient.actionsCreateRegistrationTokenForRepo` | `POST` | `/repos/{owner}/{repo}/actions/runners/registration-token` | Unmatched | Create a registration token for a repository |
| `GitHubRestClient.actionsCreateRemoveTokenForOrg` | `POST` | `/orgs/{org}/actions/runners/remove-token` | Unmatched | Create a remove token for an organization |
| `GitHubRestClient.actionsCreateRemoveTokenForRepo` | `POST` | `/repos/{owner}/{repo}/actions/runners/remove-token` | Unmatched | Create a remove token for a repository |
| `GitHubRestClient.actionsCreateRepoVariable` | `POST` | `/repos/{owner}/{repo}/actions/variables` | Unmatched | Create a repository variable |
| `GitHubRestClient.actionsCreateSelfHostedRunnerGroupForOrg` | `POST` | `/orgs/{org}/actions/runner-groups` | Unmatched | Create a self-hosted runner group for an organization |
| `GitHubRestClient.actionsCreateWorkflowDispatch` | `POST` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` | `P:ci.run.v1` | Create a workflow dispatch event |
| `GitHubRestClient.actionsDeleteActionsCacheById` | `DELETE` | `/repos/{owner}/{repo}/actions/caches/{cache_id}` | Unmatched | Delete a GitHub Actions cache for a repository (using a cache ID) |
| `GitHubRestClient.actionsDeleteActionsCacheByKey` | `DELETE` | `/repos/{owner}/{repo}/actions/caches` | Unmatched | Delete GitHub Actions caches for a repository (using a cache key) |
| `GitHubRestClient.actionsDeleteArtifact` | `DELETE` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | `P:ci.artifacts.v1` | Delete an artifact |
| `GitHubRestClient.actionsDeleteCustomImageFromOrg` | `DELETE` | `/orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}` | Unmatched | Delete a custom image from the organization |
| `GitHubRestClient.actionsDeleteCustomImageVersionFromOrg` | `DELETE` | `/orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}` | Unmatched | Delete an image version of custom image from the organization |
| `GitHubRestClient.actionsDeleteEnvironmentSecret` | `DELETE` | `/repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}` | Unmatched | Delete an environment secret |
| `GitHubRestClient.actionsDeleteEnvironmentVariable` | `DELETE` | `/repos/{owner}/{repo}/environments/{environment_name}/variables/{name}` | Unmatched | Delete an environment variable |
| `GitHubRestClient.actionsDeleteHostedRunnerForOrg` | `DELETE` | `/orgs/{org}/actions/hosted-runners/{hosted_runner_id}` | Unmatched | Delete a GitHub-hosted runner for an organization |
| `GitHubRestClient.actionsDeleteOrgSecret` | `DELETE` | `/orgs/{org}/actions/secrets/{secret_name}` | Unmatched | Delete an organization secret |
| `GitHubRestClient.actionsDeleteOrgVariable` | `DELETE` | `/orgs/{org}/actions/variables/{name}` | Unmatched | Delete an organization variable |
| `GitHubRestClient.actionsDeleteRepoSecret` | `DELETE` | `/repos/{owner}/{repo}/actions/secrets/{secret_name}` | Unmatched | Delete a repository secret |
| `GitHubRestClient.actionsDeleteRepoVariable` | `DELETE` | `/repos/{owner}/{repo}/actions/variables/{name}` | Unmatched | Delete a repository variable |
| `GitHubRestClient.actionsDeleteSelfHostedRunnerFromOrg` | `DELETE` | `/orgs/{org}/actions/runners/{runner_id}` | `P:ci.runners.v1` | Delete a self-hosted runner from an organization |
| `GitHubRestClient.actionsDeleteSelfHostedRunnerFromRepo` | `DELETE` | `/repos/{owner}/{repo}/actions/runners/{runner_id}` | Unmatched | Delete a self-hosted runner from a repository |
| `GitHubRestClient.actionsDeleteSelfHostedRunnerGroupFromOrg` | `DELETE` | `/orgs/{org}/actions/runner-groups/{runner_group_id}` | Unmatched | Delete a self-hosted runner group from an organization |
| `GitHubRestClient.actionsDeleteWorkflowRun` | `DELETE` | `/repos/{owner}/{repo}/actions/runs/{run_id}` | Unmatched | Delete a workflow run |
| `GitHubRestClient.actionsDeleteWorkflowRunLogs` | `DELETE` | `/repos/{owner}/{repo}/actions/runs/{run_id}/logs` | Unmatched | Delete workflow run logs |
| `GitHubRestClient.actionsDisableSelectedRepositoryGithubActionsOrganization` | `DELETE` | `/orgs/{org}/actions/permissions/repositories/{repository_id}` | Unmatched | Disable a selected repository for GitHub Actions in an organization |
| `GitHubRestClient.actionsDisableSelectedRepositorySelfHostedRunnersOrganization` | `DELETE` | `/orgs/{org}/actions/permissions/self-hosted-runners/repositories/{repository_id}` | Unmatched | Remove a repository from the list of repositories allowed to use self-hosted runners in an organization |
| `GitHubRestClient.actionsDisableWorkflow` | `PUT` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable` | Unmatched | Disable a workflow |
| `GitHubRestClient.actionsDownloadArtifact` | `GET` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}` | `P:ci.artifacts.v1` | Download an artifact |
| `GitHubRestClient.actionsDownloadJobLogsForWorkflowRun` | `GET` | `/repos/{owner}/{repo}/actions/jobs/{job_id}/logs` | `P:ci.jobs-logs.v1` | Download job logs for a workflow run |
| `GitHubRestClient.actionsDownloadWorkflowRunAttemptLogs` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs` | Unmatched | Download workflow run attempt logs |
| `GitHubRestClient.actionsDownloadWorkflowRunLogs` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/logs` | `P:ci.jobs-logs.v1` | Download workflow run logs |
| `GitHubRestClient.actionsEnableSelectedRepositoryGithubActionsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/repositories/{repository_id}` | Unmatched | Enable a selected repository for GitHub Actions in an organization |
| `GitHubRestClient.actionsEnableSelectedRepositorySelfHostedRunnersOrganization` | `PUT` | `/orgs/{org}/actions/permissions/self-hosted-runners/repositories/{repository_id}` | Unmatched | Add a repository to the list of repositories allowed to use self-hosted runners in an organization |
| `GitHubRestClient.actionsEnableWorkflow` | `PUT` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable` | Unmatched | Enable a workflow |
| `GitHubRestClient.actionsForceCancelWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel` | Unmatched | Force cancel a workflow run |
| `GitHubRestClient.actionsGenerateRunnerJitconfigForOrg` | `POST` | `/orgs/{org}/actions/runners/generate-jitconfig` | `P:ci.runners.v1` | Create configuration for a just-in-time runner for an organization |
| `GitHubRestClient.actionsGenerateRunnerJitconfigForRepo` | `POST` | `/repos/{owner}/{repo}/actions/runners/generate-jitconfig` | Unmatched | Create configuration for a just-in-time runner for a repository |
| `GitHubRestClient.actionsGetActionsCacheList` | `GET` | `/repos/{owner}/{repo}/actions/caches` | Unmatched | List GitHub Actions caches for a repository |
| `GitHubRestClient.actionsGetActionsCacheRetentionLimitForEnterprise` | `GET` | `/enterprises/{enterprise}/actions/cache/retention-limit` | Unmatched | Get GitHub Actions cache retention limit for an enterprise |
| `GitHubRestClient.actionsGetActionsCacheRetentionLimitForOrganization` | `GET` | `/organizations/{org}/actions/cache/retention-limit` | Unmatched | Get GitHub Actions cache retention limit for an organization |
| `GitHubRestClient.actionsGetActionsCacheRetentionLimitForRepository` | `GET` | `/repos/{owner}/{repo}/actions/cache/retention-limit` | Unmatched | Get GitHub Actions cache retention limit for a repository |
| `GitHubRestClient.actionsGetActionsCacheStorageLimitForEnterprise` | `GET` | `/enterprises/{enterprise}/actions/cache/storage-limit` | Unmatched | Get GitHub Actions cache storage limit for an enterprise |
| `GitHubRestClient.actionsGetActionsCacheStorageLimitForOrganization` | `GET` | `/organizations/{org}/actions/cache/storage-limit` | Unmatched | Get GitHub Actions cache storage limit for an organization |
| `GitHubRestClient.actionsGetActionsCacheStorageLimitForRepository` | `GET` | `/repos/{owner}/{repo}/actions/cache/storage-limit` | Unmatched | Get GitHub Actions cache storage limit for a repository |
| `GitHubRestClient.actionsGetActionsCacheUsage` | `GET` | `/repos/{owner}/{repo}/actions/cache/usage` | Unmatched | Get GitHub Actions cache usage for a repository |
| `GitHubRestClient.actionsGetActionsCacheUsageByRepoForOrg` | `GET` | `/orgs/{org}/actions/cache/usage-by-repository` | Unmatched | List repositories with GitHub Actions cache usage for an organization |
| `GitHubRestClient.actionsGetActionsCacheUsageForOrg` | `GET` | `/orgs/{org}/actions/cache/usage` | Unmatched | Get GitHub Actions cache usage for an organization |
| `GitHubRestClient.actionsGetAllowedActionsOrganization` | `GET` | `/orgs/{org}/actions/permissions/selected-actions` | Unmatched | Get allowed actions and reusable workflows for an organization |
| `GitHubRestClient.actionsGetAllowedActionsRepository` | `GET` | `/repos/{owner}/{repo}/actions/permissions/selected-actions` | Unmatched | Get allowed actions and reusable workflows for a repository |
| `GitHubRestClient.actionsGetArtifact` | `GET` | `/repos/{owner}/{repo}/actions/artifacts/{artifact_id}` | Unmatched | Get an artifact |
| `GitHubRestClient.actionsGetArtifactAndLogRetentionSettingsOrganization` | `GET` | `/orgs/{org}/actions/permissions/artifact-and-log-retention` | Unmatched | Get artifact and log retention settings for an organization |
| `GitHubRestClient.actionsGetArtifactAndLogRetentionSettingsRepository` | `GET` | `/repos/{owner}/{repo}/actions/permissions/artifact-and-log-retention` | Unmatched | Get artifact and log retention settings for a repository |
| `GitHubRestClient.actionsGetConcurrencyGroupForRepository` | `GET` | `/repos/{owner}/{repo}/actions/concurrency_groups/{concurrency_group_name}` | Unmatched | Get a concurrency group for a repository |
| `GitHubRestClient.actionsGetCustomImageForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}` | Unmatched | Get a custom image definition for GitHub Actions Hosted Runners |
| `GitHubRestClient.actionsGetCustomImageVersionForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}` | Unmatched | Get an image version of a custom image for GitHub Actions Hosted Runners |
| `GitHubRestClient.actionsGetCustomOidcSubClaimForRepo` | `GET` | `/repos/{owner}/{repo}/actions/oidc/customization/sub` | Unmatched | Get the customization template for an OIDC subject claim for a repository |
| `GitHubRestClient.actionsGetEnvironmentPublicKey` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key` | Unmatched | Get an environment public key |
| `GitHubRestClient.actionsGetEnvironmentSecret` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}` | Unmatched | Get an environment secret |
| `GitHubRestClient.actionsGetEnvironmentVariable` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/variables/{name}` | Unmatched | Get an environment variable |
| `GitHubRestClient.actionsGetForkPrContributorApprovalPermissionsOrganization` | `GET` | `/orgs/{org}/actions/permissions/fork-pr-contributor-approval` | Unmatched | Get fork PR contributor approval permissions for an organization |
| `GitHubRestClient.actionsGetForkPrContributorApprovalPermissionsRepository` | `GET` | `/repos/{owner}/{repo}/actions/permissions/fork-pr-contributor-approval` | Unmatched | Get fork PR contributor approval permissions for a repository |
| `GitHubRestClient.actionsGetGithubActionsDefaultWorkflowPermissionsOrganization` | `GET` | `/orgs/{org}/actions/permissions/workflow` | Unmatched | Get default workflow permissions for an organization |
| `GitHubRestClient.actionsGetGithubActionsDefaultWorkflowPermissionsRepository` | `GET` | `/repos/{owner}/{repo}/actions/permissions/workflow` | Unmatched | Get default workflow permissions for a repository |
| `GitHubRestClient.actionsGetGithubActionsPermissionsOrganization` | `GET` | `/orgs/{org}/actions/permissions` | Unmatched | Get GitHub Actions permissions for an organization |
| `GitHubRestClient.actionsGetGithubActionsPermissionsRepository` | `GET` | `/repos/{owner}/{repo}/actions/permissions` | Unmatched | Get GitHub Actions permissions for a repository |
| `GitHubRestClient.actionsGetHostedRunnerForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/{hosted_runner_id}` | Unmatched | Get a GitHub-hosted runner for an organization |
| `GitHubRestClient.actionsGetHostedRunnersGithubOwnedImagesForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/images/github-owned` | Unmatched | Get GitHub-owned images for GitHub-hosted runners in an organization |
| `GitHubRestClient.actionsGetHostedRunnersLimitsForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/limits` | Unmatched | Get limits on GitHub-hosted runners for an organization |
| `GitHubRestClient.actionsGetHostedRunnersMachineSpecsForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/machine-sizes` | Unmatched | Get GitHub-hosted runners machine specs for an organization |
| `GitHubRestClient.actionsGetHostedRunnersPartnerImagesForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/images/partner` | Unmatched | Get partner images for GitHub-hosted runners in an organization |
| `GitHubRestClient.actionsGetHostedRunnersPlatformsForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/platforms` | Unmatched | Get platforms for GitHub-hosted runners in an organization |
| `GitHubRestClient.actionsGetJobForWorkflowRun` | `GET` | `/repos/{owner}/{repo}/actions/jobs/{job_id}` | Unmatched | Get a job for a workflow run |
| `GitHubRestClient.actionsGetOrgPublicKey` | `GET` | `/orgs/{org}/actions/secrets/public-key` | Unmatched | Get an organization public key |
| `GitHubRestClient.actionsGetOrgSecret` | `GET` | `/orgs/{org}/actions/secrets/{secret_name}` | Unmatched | Get an organization secret |
| `GitHubRestClient.actionsGetOrgVariable` | `GET` | `/orgs/{org}/actions/variables/{name}` | Unmatched | Get an organization variable |
| `GitHubRestClient.actionsGetPendingDeploymentsForRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments` | Unmatched | Get pending deployments for a workflow run |
| `GitHubRestClient.actionsGetPrivateRepoForkPrWorkflowsSettingsOrganization` | `GET` | `/orgs/{org}/actions/permissions/fork-pr-workflows-private-repos` | Unmatched | Get private repo fork PR workflow settings for an organization |
| `GitHubRestClient.actionsGetPrivateRepoForkPrWorkflowsSettingsRepository` | `GET` | `/repos/{owner}/{repo}/actions/permissions/fork-pr-workflows-private-repos` | Unmatched | Get private repo fork PR workflow settings for a repository |
| `GitHubRestClient.actionsGetRepoPublicKey` | `GET` | `/repos/{owner}/{repo}/actions/secrets/public-key` | Unmatched | Get a repository public key |
| `GitHubRestClient.actionsGetRepoSecret` | `GET` | `/repos/{owner}/{repo}/actions/secrets/{secret_name}` | Unmatched | Get a repository secret |
| `GitHubRestClient.actionsGetRepoVariable` | `GET` | `/repos/{owner}/{repo}/actions/variables/{name}` | Unmatched | Get a repository variable |
| `GitHubRestClient.actionsGetReviewsForRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/approvals` | Unmatched | Get the review history for a workflow run |
| `GitHubRestClient.actionsGetSelfHostedRunnerForOrg` | `GET` | `/orgs/{org}/actions/runners/{runner_id}` | Unmatched | Get a self-hosted runner for an organization |
| `GitHubRestClient.actionsGetSelfHostedRunnerForRepo` | `GET` | `/repos/{owner}/{repo}/actions/runners/{runner_id}` | Unmatched | Get a self-hosted runner for a repository |
| `GitHubRestClient.actionsGetSelfHostedRunnerGroupForOrg` | `GET` | `/orgs/{org}/actions/runner-groups/{runner_group_id}` | Unmatched | Get a self-hosted runner group for an organization |
| `GitHubRestClient.actionsGetSelfHostedRunnersPermissionsOrganization` | `GET` | `/orgs/{org}/actions/permissions/self-hosted-runners` | Unmatched | Get self-hosted runners settings for an organization |
| `GitHubRestClient.actionsGetWorkflow` | `GET` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}` | Unmatched | Get a workflow |
| `GitHubRestClient.actionsGetWorkflowAccessToRepository` | `GET` | `/repos/{owner}/{repo}/actions/permissions/access` | Unmatched | Get the level of access for workflows outside of the repository |
| `GitHubRestClient.actionsGetWorkflowRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}` | `P:ci.run.v1` | Get a workflow run |
| `GitHubRestClient.actionsGetWorkflowRunAttempt` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}` | Unmatched | Get a workflow run attempt |
| `GitHubRestClient.actionsGetWorkflowRunUsage` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/timing` | Unmatched | Get workflow run usage |
| `GitHubRestClient.actionsGetWorkflowUsage` | `GET` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing` | Unmatched | Get workflow usage |
| `GitHubRestClient.actionsListArtifactsForRepo` | `GET` | `/repos/{owner}/{repo}/actions/artifacts` | Unmatched | List artifacts for a repository |
| `GitHubRestClient.actionsListConcurrencyGroupsForRepository` | `GET` | `/repos/{owner}/{repo}/actions/concurrency_groups` | Unmatched | List concurrency groups for a repository |
| `GitHubRestClient.actionsListConcurrencyGroupsForWorkflowRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/concurrency_groups` | Unmatched | List concurrency groups for a workflow run |
| `GitHubRestClient.actionsListCustomImageVersionsForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions` | Unmatched | List image versions of a custom image for an organization |
| `GitHubRestClient.actionsListCustomImagesForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners/images/custom` | Unmatched | List custom images for an organization |
| `GitHubRestClient.actionsListEnvironmentSecrets` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/secrets` | Unmatched | List environment secrets |
| `GitHubRestClient.actionsListEnvironmentVariables` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/variables` | Unmatched | List environment variables |
| `GitHubRestClient.actionsListGithubHostedRunnersInGroupForOrg` | `GET` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners` | Unmatched | List GitHub-hosted runners in a group for an organization |
| `GitHubRestClient.actionsListHostedRunnersForOrg` | `GET` | `/orgs/{org}/actions/hosted-runners` | Unmatched | List GitHub-hosted runners for an organization |
| `GitHubRestClient.actionsListJobsForWorkflowRun` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/jobs` | `P:ci.jobs-logs.v1` | List jobs for a workflow run |
| `GitHubRestClient.actionsListJobsForWorkflowRunAttempt` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs` | Unmatched | List jobs for a workflow run attempt |
| `GitHubRestClient.actionsListLabelsForSelfHostedRunnerForOrg` | `GET` | `/orgs/{org}/actions/runners/{runner_id}/labels` | Unmatched | List labels for a self-hosted runner for an organization |
| `GitHubRestClient.actionsListLabelsForSelfHostedRunnerForRepo` | `GET` | `/repos/{owner}/{repo}/actions/runners/{runner_id}/labels` | Unmatched | List labels for a self-hosted runner for a repository |
| `GitHubRestClient.actionsListOrgSecrets` | `GET` | `/orgs/{org}/actions/secrets` | Unmatched | List organization secrets |
| `GitHubRestClient.actionsListOrgVariables` | `GET` | `/orgs/{org}/actions/variables` | Unmatched | List organization variables |
| `GitHubRestClient.actionsListRepoAccessToSelfHostedRunnerGroupInOrg` | `GET` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories` | Unmatched | List repository access to a self-hosted runner group in an organization |
| `GitHubRestClient.actionsListRepoOrganizationSecrets` | `GET` | `/repos/{owner}/{repo}/actions/organization-secrets` | Unmatched | List repository organization secrets |
| `GitHubRestClient.actionsListRepoOrganizationVariables` | `GET` | `/repos/{owner}/{repo}/actions/organization-variables` | Unmatched | List repository organization variables |
| `GitHubRestClient.actionsListRepoSecrets` | `GET` | `/repos/{owner}/{repo}/actions/secrets` | Unmatched | List repository secrets |
| `GitHubRestClient.actionsListRepoVariables` | `GET` | `/repos/{owner}/{repo}/actions/variables` | Unmatched | List repository variables |
| `GitHubRestClient.actionsListRepoWorkflows` | `GET` | `/repos/{owner}/{repo}/actions/workflows` | Unmatched | List repository workflows |
| `GitHubRestClient.actionsListRunnerApplicationsForOrg` | `GET` | `/orgs/{org}/actions/runners/downloads` | Unmatched | List runner applications for an organization |
| `GitHubRestClient.actionsListRunnerApplicationsForRepo` | `GET` | `/repos/{owner}/{repo}/actions/runners/downloads` | Unmatched | List runner applications for a repository |
| `GitHubRestClient.actionsListSelectedReposForOrgSecret` | `GET` | `/orgs/{org}/actions/secrets/{secret_name}/repositories` | Unmatched | List selected repositories for an organization secret |
| `GitHubRestClient.actionsListSelectedReposForOrgVariable` | `GET` | `/orgs/{org}/actions/variables/{name}/repositories` | Unmatched | List selected repositories for an organization variable |
| `GitHubRestClient.actionsListSelectedRepositoriesEnabledGithubActionsOrganization` | `GET` | `/orgs/{org}/actions/permissions/repositories` | Unmatched | List selected repositories enabled for GitHub Actions in an organization |
| `GitHubRestClient.actionsListSelectedRepositoriesSelfHostedRunnersOrganization` | `GET` | `/orgs/{org}/actions/permissions/self-hosted-runners/repositories` | Unmatched | List repositories allowed to use self-hosted runners in an organization |
| `GitHubRestClient.actionsListSelfHostedRunnerGroupsForOrg` | `GET` | `/orgs/{org}/actions/runner-groups` | Unmatched | List self-hosted runner groups for an organization |
| `GitHubRestClient.actionsListSelfHostedRunnersForOrg` | `GET` | `/orgs/{org}/actions/runners` | `P:ci.runners.v1` | List self-hosted runners for an organization |
| `GitHubRestClient.actionsListSelfHostedRunnersForRepo` | `GET` | `/repos/{owner}/{repo}/actions/runners` | `P:ci.runners.v1` | List self-hosted runners for a repository |
| `GitHubRestClient.actionsListSelfHostedRunnersInGroupForOrg` | `GET` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/runners` | Unmatched | List self-hosted runners in a group for an organization |
| `GitHubRestClient.actionsListWorkflowRunArtifacts` | `GET` | `/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts` | `P:ci.artifacts.v1` | List workflow run artifacts |
| `GitHubRestClient.actionsListWorkflowRuns` | `GET` | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs` | Unmatched | List workflow runs for a workflow |
| `GitHubRestClient.actionsListWorkflowRunsForRepo` | `GET` | `/repos/{owner}/{repo}/actions/runs` | `P:ci.run.v1` | List workflow runs for a repository |
| `GitHubRestClient.actionsReRunJobForWorkflowRun` | `POST` | `/repos/{owner}/{repo}/actions/jobs/{job_id}/rerun` | Unmatched | Re-run a job from a workflow run |
| `GitHubRestClient.actionsReRunWorkflow` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/rerun` | `P:ci.run.v1` | Re-run a workflow |
| `GitHubRestClient.actionsReRunWorkflowFailedJobs` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs` | Unmatched | Re-run failed jobs from a workflow run |
| `GitHubRestClient.actionsRemoveAllCustomLabelsFromSelfHostedRunnerForOrg` | `DELETE` | `/orgs/{org}/actions/runners/{runner_id}/labels` | Unmatched | Remove all custom labels from a self-hosted runner for an organization |
| `GitHubRestClient.actionsRemoveAllCustomLabelsFromSelfHostedRunnerForRepo` | `DELETE` | `/repos/{owner}/{repo}/actions/runners/{runner_id}/labels` | Unmatched | Remove all custom labels from a self-hosted runner for a repository |
| `GitHubRestClient.actionsRemoveCustomLabelFromSelfHostedRunnerForOrg` | `DELETE` | `/orgs/{org}/actions/runners/{runner_id}/labels/{name}` | Unmatched | Remove a custom label from a self-hosted runner for an organization |
| `GitHubRestClient.actionsRemoveCustomLabelFromSelfHostedRunnerForRepo` | `DELETE` | `/repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}` | Unmatched | Remove a custom label from a self-hosted runner for a repository |
| `GitHubRestClient.actionsRemoveRepoAccessToSelfHostedRunnerGroupInOrg` | `DELETE` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}` | Unmatched | Remove repository access to a self-hosted runner group in an organization |
| `GitHubRestClient.actionsRemoveSelectedRepoFromOrgSecret` | `DELETE` | `/orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Remove selected repository from an organization secret |
| `GitHubRestClient.actionsRemoveSelectedRepoFromOrgVariable` | `DELETE` | `/orgs/{org}/actions/variables/{name}/repositories/{repository_id}` | Unmatched | Remove selected repository from an organization variable |
| `GitHubRestClient.actionsRemoveSelfHostedRunnerFromGroupForOrg` | `DELETE` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/runners/{runner_id}` | Unmatched | Remove a self-hosted runner from a group for an organization |
| `GitHubRestClient.actionsReviewCustomGatesForRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule` | Unmatched | Review custom deployment protection rules for a workflow run |
| `GitHubRestClient.actionsReviewPendingDeploymentsForRun` | `POST` | `/repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments` | Unmatched | Review pending deployments for a workflow run |
| `GitHubRestClient.actionsSetActionsCacheRetentionLimitForEnterprise` | `PUT` | `/enterprises/{enterprise}/actions/cache/retention-limit` | Unmatched | Set GitHub Actions cache retention limit for an enterprise |
| `GitHubRestClient.actionsSetActionsCacheRetentionLimitForOrganization` | `PUT` | `/organizations/{org}/actions/cache/retention-limit` | Unmatched | Set GitHub Actions cache retention limit for an organization |
| `GitHubRestClient.actionsSetActionsCacheRetentionLimitForRepository` | `PUT` | `/repos/{owner}/{repo}/actions/cache/retention-limit` | Unmatched | Set GitHub Actions cache retention limit for a repository |
| `GitHubRestClient.actionsSetActionsCacheStorageLimitForEnterprise` | `PUT` | `/enterprises/{enterprise}/actions/cache/storage-limit` | Unmatched | Set GitHub Actions cache storage limit for an enterprise |
| `GitHubRestClient.actionsSetActionsCacheStorageLimitForOrganization` | `PUT` | `/organizations/{org}/actions/cache/storage-limit` | Unmatched | Set GitHub Actions cache storage limit for an organization |
| `GitHubRestClient.actionsSetActionsCacheStorageLimitForRepository` | `PUT` | `/repos/{owner}/{repo}/actions/cache/storage-limit` | Unmatched | Set GitHub Actions cache storage limit for a repository |
| `GitHubRestClient.actionsSetAllowedActionsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/selected-actions` | Unmatched | Set allowed actions and reusable workflows for an organization |
| `GitHubRestClient.actionsSetAllowedActionsRepository` | `PUT` | `/repos/{owner}/{repo}/actions/permissions/selected-actions` | Unmatched | Set allowed actions and reusable workflows for a repository |
| `GitHubRestClient.actionsSetArtifactAndLogRetentionSettingsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/artifact-and-log-retention` | Unmatched | Set artifact and log retention settings for an organization |
| `GitHubRestClient.actionsSetArtifactAndLogRetentionSettingsRepository` | `PUT` | `/repos/{owner}/{repo}/actions/permissions/artifact-and-log-retention` | Unmatched | Set artifact and log retention settings for a repository |
| `GitHubRestClient.actionsSetCustomLabelsForSelfHostedRunnerForOrg` | `PUT` | `/orgs/{org}/actions/runners/{runner_id}/labels` | Unmatched | Set custom labels for a self-hosted runner for an organization |
| `GitHubRestClient.actionsSetCustomLabelsForSelfHostedRunnerForRepo` | `PUT` | `/repos/{owner}/{repo}/actions/runners/{runner_id}/labels` | Unmatched | Set custom labels for a self-hosted runner for a repository |
| `GitHubRestClient.actionsSetCustomOidcSubClaimForRepo` | `PUT` | `/repos/{owner}/{repo}/actions/oidc/customization/sub` | Unmatched | Set the customization template for an OIDC subject claim for a repository |
| `GitHubRestClient.actionsSetForkPrContributorApprovalPermissionsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/fork-pr-contributor-approval` | Unmatched | Set fork PR contributor approval permissions for an organization |
| `GitHubRestClient.actionsSetForkPrContributorApprovalPermissionsRepository` | `PUT` | `/repos/{owner}/{repo}/actions/permissions/fork-pr-contributor-approval` | Unmatched | Set fork PR contributor approval permissions for a repository |
| `GitHubRestClient.actionsSetGithubActionsDefaultWorkflowPermissionsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/workflow` | Unmatched | Set default workflow permissions for an organization |
| `GitHubRestClient.actionsSetGithubActionsDefaultWorkflowPermissionsRepository` | `PUT` | `/repos/{owner}/{repo}/actions/permissions/workflow` | Unmatched | Set default workflow permissions for a repository |
| `GitHubRestClient.actionsSetGithubActionsPermissionsOrganization` | `PUT` | `/orgs/{org}/actions/permissions` | Unmatched | Set GitHub Actions permissions for an organization |
| `GitHubRestClient.actionsSetGithubActionsPermissionsRepository` | `PUT` | `/repos/{owner}/{repo}/actions/permissions` | Unmatched | Set GitHub Actions permissions for a repository |
| `GitHubRestClient.actionsSetPrivateRepoForkPrWorkflowsSettingsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/fork-pr-workflows-private-repos` | Unmatched | Set private repo fork PR workflow settings for an organization |
| `GitHubRestClient.actionsSetPrivateRepoForkPrWorkflowsSettingsRepository` | `PUT` | `/repos/{owner}/{repo}/actions/permissions/fork-pr-workflows-private-repos` | Unmatched | Set private repo fork PR workflow settings for a repository |
| `GitHubRestClient.actionsSetRepoAccessToSelfHostedRunnerGroupInOrg` | `PUT` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/repositories` | Unmatched | Set repository access for a self-hosted runner group in an organization |
| `GitHubRestClient.actionsSetSelectedReposForOrgSecret` | `PUT` | `/orgs/{org}/actions/secrets/{secret_name}/repositories` | Unmatched | Set selected repositories for an organization secret |
| `GitHubRestClient.actionsSetSelectedReposForOrgVariable` | `PUT` | `/orgs/{org}/actions/variables/{name}/repositories` | Unmatched | Set selected repositories for an organization variable |
| `GitHubRestClient.actionsSetSelectedRepositoriesEnabledGithubActionsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/repositories` | Unmatched | Set selected repositories enabled for GitHub Actions in an organization |
| `GitHubRestClient.actionsSetSelectedRepositoriesSelfHostedRunnersOrganization` | `PUT` | `/orgs/{org}/actions/permissions/self-hosted-runners/repositories` | Unmatched | Set repositories allowed to use self-hosted runners in an organization |
| `GitHubRestClient.actionsSetSelfHostedRunnersInGroupForOrg` | `PUT` | `/orgs/{org}/actions/runner-groups/{runner_group_id}/runners` | Unmatched | Set self-hosted runners in a group for an organization |
| `GitHubRestClient.actionsSetSelfHostedRunnersPermissionsOrganization` | `PUT` | `/orgs/{org}/actions/permissions/self-hosted-runners` | Unmatched | Set self-hosted runners settings for an organization |
| `GitHubRestClient.actionsSetWorkflowAccessToRepository` | `PUT` | `/repos/{owner}/{repo}/actions/permissions/access` | Unmatched | Set the level of access for workflows outside of the repository |
| `GitHubRestClient.actionsUpdateEnvironmentVariable` | `PATCH` | `/repos/{owner}/{repo}/environments/{environment_name}/variables/{name}` | Unmatched | Update an environment variable |
| `GitHubRestClient.actionsUpdateHostedRunnerForOrg` | `PATCH` | `/orgs/{org}/actions/hosted-runners/{hosted_runner_id}` | Unmatched | Update a GitHub-hosted runner for an organization |
| `GitHubRestClient.actionsUpdateOrgVariable` | `PATCH` | `/orgs/{org}/actions/variables/{name}` | Unmatched | Update an organization variable |
| `GitHubRestClient.actionsUpdateRepoVariable` | `PATCH` | `/repos/{owner}/{repo}/actions/variables/{name}` | Unmatched | Update a repository variable |
| `GitHubRestClient.actionsUpdateSelfHostedRunnerGroupForOrg` | `PATCH` | `/orgs/{org}/actions/runner-groups/{runner_group_id}` | Unmatched | Update a self-hosted runner group for an organization |

</details>

<details>
<summary><strong>activity</strong> (33)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.activityCheckRepoIsStarredByAuthenticatedUser` | `GET` | `/user/starred/{owner}/{repo}` | Unmatched | Check if a repository is starred by the authenticated user |
| `GitHubRestClient.activityDeleteRepoSubscription` | `DELETE` | `/repos/{owner}/{repo}/subscription` | Unmatched | Delete a repository subscription |
| `GitHubRestClient.activityDeleteThreadSubscription` | `DELETE` | `/notifications/threads/{thread_id}/subscription` | Unmatched | Delete a thread subscription |
| `GitHubRestClient.activityGetFeeds` | `GET` | `/feeds` | Unmatched | Get feeds |
| `GitHubRestClient.activityGetRepoSubscription` | `GET` | `/repos/{owner}/{repo}/subscription` | Unmatched | Get a repository subscription |
| `GitHubRestClient.activityGetStargazerCountForRepo` | `GET` | `/repos/{owner}/{repo}/stargazers/count` | Unmatched | Get stargazer count |
| `GitHubRestClient.activityGetThread` | `GET` | `/notifications/threads/{thread_id}` | Unmatched | Get a thread |
| `GitHubRestClient.activityGetThreadSubscriptionForAuthenticatedUser` | `GET` | `/notifications/threads/{thread_id}/subscription` | Unmatched | Get a thread subscription for the authenticated user |
| `GitHubRestClient.activityListEventsForAuthenticatedUser` | `GET` | `/users/{username}/events` | Unmatched | List events for the authenticated user |
| `GitHubRestClient.activityListNotificationsForAuthenticatedUser` | `GET` | `/notifications` | `P:notification.read-state.v1` | List notifications for the authenticated user |
| `GitHubRestClient.activityListOrgEventsForAuthenticatedUser` | `GET` | `/users/{username}/events/orgs/{org}` | Unmatched | List organization events for the authenticated user |
| `GitHubRestClient.activityListPublicEvents` | `GET` | `/events` | Unmatched | List public events |
| `GitHubRestClient.activityListPublicEventsForRepoNetwork` | `GET` | `/networks/{owner}/{repo}/events` | Unmatched | List public events for a network of repositories |
| `GitHubRestClient.activityListPublicEventsForUser` | `GET` | `/users/{username}/events/public` | Unmatched | List public events for a user |
| `GitHubRestClient.activityListPublicOrgEvents` | `GET` | `/orgs/{org}/events` | Unmatched | List public organization events |
| `GitHubRestClient.activityListReceivedEventsForUser` | `GET` | `/users/{username}/received_events` | Unmatched | List events received by the authenticated user |
| `GitHubRestClient.activityListReceivedPublicEventsForUser` | `GET` | `/users/{username}/received_events/public` | Unmatched | List public events received by a user |
| `GitHubRestClient.activityListRepoEvents` | `GET` | `/repos/{owner}/{repo}/events` | Unmatched | List repository events |
| `GitHubRestClient.activityListRepoNotificationsForAuthenticatedUser` | `GET` | `/repos/{owner}/{repo}/notifications` | `P:notification.read-state.v1` | List repository notifications for the authenticated user |
| `GitHubRestClient.activityListReposStarredByAuthenticatedUser` | `GET` | `/user/starred` | Unmatched | List repositories starred by the authenticated user |
| `GitHubRestClient.activityListReposStarredByUser` | `GET` | `/users/{username}/starred` | Unmatched | List repositories starred by a user |
| `GitHubRestClient.activityListReposWatchedByUser` | `GET` | `/users/{username}/subscriptions` | Unmatched | List repositories watched by a user |
| `GitHubRestClient.activityListStargazersForRepo` | `GET` | `/repos/{owner}/{repo}/stargazers` | Unmatched | List stargazers |
| `GitHubRestClient.activityListWatchedReposForAuthenticatedUser` | `GET` | `/user/subscriptions` | Unmatched | List repositories watched by the authenticated user |
| `GitHubRestClient.activityListWatchersForRepo` | `GET` | `/repos/{owner}/{repo}/subscribers` | Unmatched | List watchers |
| `GitHubRestClient.activityMarkNotificationsAsRead` | `PUT` | `/notifications` | `P:notification.read-state.v1` | Mark notifications as read |
| `GitHubRestClient.activityMarkRepoNotificationsAsRead` | `PUT` | `/repos/{owner}/{repo}/notifications` | Unmatched | Mark repository notifications as read |
| `GitHubRestClient.activityMarkThreadAsDone` | `DELETE` | `/notifications/threads/{thread_id}` | `P:notification.read-state.v1` | Mark a thread as done |
| `GitHubRestClient.activityMarkThreadAsRead` | `PATCH` | `/notifications/threads/{thread_id}` | `P:notification.read-state.v1` | Mark a thread as read |
| `GitHubRestClient.activitySetRepoSubscription` | `PUT` | `/repos/{owner}/{repo}/subscription` | Unmatched | Set a repository subscription |
| `GitHubRestClient.activitySetThreadSubscription` | `PUT` | `/notifications/threads/{thread_id}/subscription` | Unmatched | Set a thread subscription |
| `GitHubRestClient.activityStarRepoForAuthenticatedUser` | `PUT` | `/user/starred/{owner}/{repo}` | Unmatched | Star a repository for the authenticated user |
| `GitHubRestClient.activityUnstarRepoForAuthenticatedUser` | `DELETE` | `/user/starred/{owner}/{repo}` | Unmatched | Unstar a repository for the authenticated user |

</details>

<details>
<summary><strong>agent-tasks</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.agentTasksCreateTaskInRepo` | `POST` | `/agents/repos/{owner}/{repo}/tasks` | `U:github.codespaces-copilot-agents` | Start a task |
| `GitHubRestClient.agentTasksGetTaskById` | `GET` | `/agents/tasks/{task_id}` | Unmatched | Get a task by ID |
| `GitHubRestClient.agentTasksGetTaskByRepoAndId` | `GET` | `/agents/repos/{owner}/{repo}/tasks/{task_id}` | Unmatched | Get a task by repo |
| `GitHubRestClient.agentTasksListTasks` | `GET` | `/agents/tasks` | Unmatched | List tasks |
| `GitHubRestClient.agentTasksListTasksForRepo` | `GET` | `/agents/repos/{owner}/{repo}/tasks` | Unmatched | List tasks for repository |

</details>

<details>
<summary><strong>agents</strong> (30)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.agentsAddSelectedRepoToOrgSecret` | `PUT` | `/orgs/{org}/agents/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Add selected repository to an organization secret |
| `GitHubRestClient.agentsAddSelectedRepoToOrgVariable` | `PUT` | `/orgs/{org}/agents/variables/{name}/repositories/{repository_id}` | Unmatched | Add selected repository to an organization variable |
| `GitHubRestClient.agentsCreateOrUpdateOrgSecret` | `PUT` | `/orgs/{org}/agents/secrets/{secret_name}` | Unmatched | Create or update an organization secret |
| `GitHubRestClient.agentsCreateOrUpdateRepoSecret` | `PUT` | `/repos/{owner}/{repo}/agents/secrets/{secret_name}` | Unmatched | Create or update a repository secret |
| `GitHubRestClient.agentsCreateOrgVariable` | `POST` | `/orgs/{org}/agents/variables` | Unmatched | Create an organization variable |
| `GitHubRestClient.agentsCreateRepoVariable` | `POST` | `/repos/{owner}/{repo}/agents/variables` | Unmatched | Create a repository variable |
| `GitHubRestClient.agentsDeleteOrgSecret` | `DELETE` | `/orgs/{org}/agents/secrets/{secret_name}` | Unmatched | Delete an organization secret |
| `GitHubRestClient.agentsDeleteOrgVariable` | `DELETE` | `/orgs/{org}/agents/variables/{name}` | Unmatched | Delete an organization variable |
| `GitHubRestClient.agentsDeleteRepoSecret` | `DELETE` | `/repos/{owner}/{repo}/agents/secrets/{secret_name}` | Unmatched | Delete a repository secret |
| `GitHubRestClient.agentsDeleteRepoVariable` | `DELETE` | `/repos/{owner}/{repo}/agents/variables/{name}` | Unmatched | Delete a repository variable |
| `GitHubRestClient.agentsGetOrgPublicKey` | `GET` | `/orgs/{org}/agents/secrets/public-key` | Unmatched | Get an organization public key |
| `GitHubRestClient.agentsGetOrgSecret` | `GET` | `/orgs/{org}/agents/secrets/{secret_name}` | Unmatched | Get an organization secret |
| `GitHubRestClient.agentsGetOrgVariable` | `GET` | `/orgs/{org}/agents/variables/{name}` | Unmatched | Get an organization variable |
| `GitHubRestClient.agentsGetRepoPublicKey` | `GET` | `/repos/{owner}/{repo}/agents/secrets/public-key` | Unmatched | Get a repository public key |
| `GitHubRestClient.agentsGetRepoSecret` | `GET` | `/repos/{owner}/{repo}/agents/secrets/{secret_name}` | Unmatched | Get a repository secret |
| `GitHubRestClient.agentsGetRepoVariable` | `GET` | `/repos/{owner}/{repo}/agents/variables/{name}` | Unmatched | Get a repository variable |
| `GitHubRestClient.agentsListOrgSecrets` | `GET` | `/orgs/{org}/agents/secrets` | Unmatched | List organization secrets |
| `GitHubRestClient.agentsListOrgVariables` | `GET` | `/orgs/{org}/agents/variables` | Unmatched | List organization variables |
| `GitHubRestClient.agentsListRepoOrganizationSecrets` | `GET` | `/repos/{owner}/{repo}/agents/organization-secrets` | Unmatched | List repository organization secrets |
| `GitHubRestClient.agentsListRepoOrganizationVariables` | `GET` | `/repos/{owner}/{repo}/agents/organization-variables` | Unmatched | List repository organization variables |
| `GitHubRestClient.agentsListRepoSecrets` | `GET` | `/repos/{owner}/{repo}/agents/secrets` | Unmatched | List repository secrets |
| `GitHubRestClient.agentsListRepoVariables` | `GET` | `/repos/{owner}/{repo}/agents/variables` | Unmatched | List repository variables |
| `GitHubRestClient.agentsListSelectedReposForOrgSecret` | `GET` | `/orgs/{org}/agents/secrets/{secret_name}/repositories` | Unmatched | List selected repositories for an organization secret |
| `GitHubRestClient.agentsListSelectedReposForOrgVariable` | `GET` | `/orgs/{org}/agents/variables/{name}/repositories` | Unmatched | List selected repositories for an organization variable |
| `GitHubRestClient.agentsRemoveSelectedRepoFromOrgSecret` | `DELETE` | `/orgs/{org}/agents/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Remove selected repository from an organization secret |
| `GitHubRestClient.agentsRemoveSelectedRepoFromOrgVariable` | `DELETE` | `/orgs/{org}/agents/variables/{name}/repositories/{repository_id}` | Unmatched | Remove selected repository from an organization variable |
| `GitHubRestClient.agentsSetSelectedReposForOrgSecret` | `PUT` | `/orgs/{org}/agents/secrets/{secret_name}/repositories` | Unmatched | Set selected repositories for an organization secret |
| `GitHubRestClient.agentsSetSelectedReposForOrgVariable` | `PUT` | `/orgs/{org}/agents/variables/{name}/repositories` | Unmatched | Set selected repositories for an organization variable |
| `GitHubRestClient.agentsUpdateOrgVariable` | `PATCH` | `/orgs/{org}/agents/variables/{name}` | Unmatched | Update an organization variable |
| `GitHubRestClient.agentsUpdateRepoVariable` | `PATCH` | `/repos/{owner}/{repo}/agents/variables/{name}` | Unmatched | Update a repository variable |

</details>

<details>
<summary><strong>apps</strong> (37)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.appsAddRepoToInstallationForAuthenticatedUser` | `PUT` | `/user/installations/{installation_id}/repositories/{repository_id}` | Unmatched | Add a repository to an app installation |
| `GitHubRestClient.appsCheckToken` | `POST` | `/applications/{client_id}/token` | Unmatched | Check a token |
| `GitHubRestClient.appsCreateFromManifest` | `POST` | `/app-manifests/{code}/conversions` | `U:github.app-installations` | Create a GitHub App from a manifest |
| `GitHubRestClient.appsCreateInstallationAccessToken` | `POST` | `/app/installations/{installation_id}/access_tokens` | `U:github.app-installations` | Create an installation access token for an app |
| `GitHubRestClient.appsDeleteAuthorization` | `DELETE` | `/applications/{client_id}/grant` | Unmatched | Delete an app authorization |
| `GitHubRestClient.appsDeleteInstallation` | `DELETE` | `/app/installations/{installation_id}` | Unmatched | Delete an installation for the authenticated app |
| `GitHubRestClient.appsDeleteToken` | `DELETE` | `/applications/{client_id}/token` | Unmatched | Delete an app token |
| `GitHubRestClient.appsGetAuthenticated` | `GET` | `/app` | Unmatched | Get the authenticated app |
| `GitHubRestClient.appsGetBySlug` | `GET` | `/apps/{app_slug}` | Unmatched | Get an app |
| `GitHubRestClient.appsGetInstallation` | `GET` | `/app/installations/{installation_id}` | Unmatched | Get an installation for the authenticated app |
| `GitHubRestClient.appsGetOrgInstallation` | `GET` | `/orgs/{org}/installation` | Unmatched | Get an organization installation for the authenticated app |
| `GitHubRestClient.appsGetRepoInstallation` | `GET` | `/repos/{owner}/{repo}/installation` | Unmatched | Get a repository installation for the authenticated app |
| `GitHubRestClient.appsGetSubscriptionPlanForAccount` | `GET` | `/marketplace_listing/accounts/{account_id}` | Unmatched | Get a subscription plan for an account |
| `GitHubRestClient.appsGetSubscriptionPlanForAccountStubbed` | `GET` | `/marketplace_listing/stubbed/accounts/{account_id}` | Unmatched | Get a subscription plan for an account (stubbed) |
| `GitHubRestClient.appsGetUserInstallation` | `GET` | `/users/{username}/installation` | Unmatched | Get a user installation for the authenticated app |
| `GitHubRestClient.appsGetWebhookConfigForApp` | `GET` | `/app/hook/config` | Unmatched | Get a webhook configuration for an app |
| `GitHubRestClient.appsGetWebhookDelivery` | `GET` | `/app/hook/deliveries/{delivery_id}` | Unmatched | Get a delivery for an app webhook |
| `GitHubRestClient.appsListAccountsForPlan` | `GET` | `/marketplace_listing/plans/{plan_id}/accounts` | Unmatched | List accounts for a plan |
| `GitHubRestClient.appsListAccountsForPlanStubbed` | `GET` | `/marketplace_listing/stubbed/plans/{plan_id}/accounts` | Unmatched | List accounts for a plan (stubbed) |
| `GitHubRestClient.appsListInstallationReposForAuthenticatedUser` | `GET` | `/user/installations/{installation_id}/repositories` | Unmatched | List repositories accessible to the user access token |
| `GitHubRestClient.appsListInstallationRequestsForAuthenticatedApp` | `GET` | `/app/installation-requests` | Unmatched | List installation requests for the authenticated app |
| `GitHubRestClient.appsListInstallations` | `GET` | `/app/installations` | `U:github.app-installations` | List installations for the authenticated app |
| `GitHubRestClient.appsListInstallationsForAuthenticatedUser` | `GET` | `/user/installations` | Unmatched | List app installations accessible to the user access token |
| `GitHubRestClient.appsListPlans` | `GET` | `/marketplace_listing/plans` | Unmatched | List plans |
| `GitHubRestClient.appsListPlansStubbed` | `GET` | `/marketplace_listing/stubbed/plans` | Unmatched | List plans (stubbed) |
| `GitHubRestClient.appsListReposAccessibleToInstallation` | `GET` | `/installation/repositories` | `U:github.app-installations` | List repositories accessible to the app installation |
| `GitHubRestClient.appsListSubscriptionsForAuthenticatedUser` | `GET` | `/user/marketplace_purchases` | Unmatched | List subscriptions for the authenticated user |
| `GitHubRestClient.appsListSubscriptionsForAuthenticatedUserStubbed` | `GET` | `/user/marketplace_purchases/stubbed` | Unmatched | List subscriptions for the authenticated user (stubbed) |
| `GitHubRestClient.appsListWebhookDeliveries` | `GET` | `/app/hook/deliveries` | Unmatched | List deliveries for an app webhook |
| `GitHubRestClient.appsRedeliverWebhookDelivery` | `POST` | `/app/hook/deliveries/{delivery_id}/attempts` | Unmatched | Redeliver a delivery for an app webhook |
| `GitHubRestClient.appsRemoveRepoFromInstallationForAuthenticatedUser` | `DELETE` | `/user/installations/{installation_id}/repositories/{repository_id}` | Unmatched | Remove a repository from an app installation |
| `GitHubRestClient.appsResetToken` | `PATCH` | `/applications/{client_id}/token` | Unmatched | Reset a token |
| `GitHubRestClient.appsRevokeInstallationAccessToken` | `DELETE` | `/installation/token` | Unmatched | Revoke an installation access token |
| `GitHubRestClient.appsScopeToken` | `POST` | `/applications/{client_id}/token/scoped` | Unmatched | Create a scoped access token |
| `GitHubRestClient.appsSuspendInstallation` | `PUT` | `/app/installations/{installation_id}/suspended` | `U:github.app-installations` | Suspend an app installation |
| `GitHubRestClient.appsUnsuspendInstallation` | `DELETE` | `/app/installations/{installation_id}/suspended` | Unmatched | Unsuspend an app installation |
| `GitHubRestClient.appsUpdateWebhookConfigForApp` | `PATCH` | `/app/hook/config` | Unmatched | Update a webhook configuration for an app |

</details>

<details>
<summary><strong>billing</strong> (13)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.billingCreateOrganizationBudget` | `POST` | `/organizations/{org}/settings/billing/budgets` | `U:github.billing` | Create a budget for an organization |
| `GitHubRestClient.billingDeleteBudgetOrg` | `DELETE` | `/organizations/{org}/settings/billing/budgets/{budget_id}` | Unmatched | Delete a budget for an organization |
| `GitHubRestClient.billingGetAllBudgetsOrg` | `GET` | `/organizations/{org}/settings/billing/budgets` | `U:github.billing` | Get all budgets for an organization |
| `GitHubRestClient.billingGetBudgetOrg` | `GET` | `/organizations/{org}/settings/billing/budgets/{budget_id}` | Unmatched | Get a budget by ID for an organization |
| `GitHubRestClient.billingGetGithubBillingAiCreditUsageReportOrg` | `GET` | `/organizations/{org}/settings/billing/ai_credit/usage` | `U:github.billing` | Get billing AI credit usage report for an organization |
| `GitHubRestClient.billingGetGithubBillingAiCreditUsageReportUser` | `GET` | `/users/{username}/settings/billing/ai_credit/usage` | Unmatched | Get billing AI credit usage report for a user |
| `GitHubRestClient.billingGetGithubBillingPremiumRequestUsageReportOrg` | `GET` | `/organizations/{org}/settings/billing/premium_request/usage` | Unmatched | Get billing premium request usage report for an organization |
| `GitHubRestClient.billingGetGithubBillingPremiumRequestUsageReportUser` | `GET` | `/users/{username}/settings/billing/premium_request/usage` | Unmatched | Get billing premium request usage report for a user |
| `GitHubRestClient.billingGetGithubBillingUsageReportOrg` | `GET` | `/organizations/{org}/settings/billing/usage` | `U:github.billing` | Get billing usage report for an organization |
| `GitHubRestClient.billingGetGithubBillingUsageReportUser` | `GET` | `/users/{username}/settings/billing/usage` | Unmatched | Get billing usage report for a user |
| `GitHubRestClient.billingGetGithubBillingUsageSummaryReportOrg` | `GET` | `/organizations/{org}/settings/billing/usage/summary` | Unmatched | Get billing usage summary for an organization |
| `GitHubRestClient.billingGetGithubBillingUsageSummaryReportUser` | `GET` | `/users/{username}/settings/billing/usage/summary` | Unmatched | Get billing usage summary for a user |
| `GitHubRestClient.billingUpdateBudgetOrg` | `PATCH` | `/organizations/{org}/settings/billing/budgets/{budget_id}` | Unmatched | Update a budget for an organization |

</details>

<details>
<summary><strong>campaigns</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.campaignsCreateCampaign` | `POST` | `/orgs/{org}/campaigns` | Unmatched | Create a campaign for an organization |
| `GitHubRestClient.campaignsDeleteCampaign` | `DELETE` | `/orgs/{org}/campaigns/{campaign_number}` | Unmatched | Delete a campaign for an organization |
| `GitHubRestClient.campaignsGetCampaignSummary` | `GET` | `/orgs/{org}/campaigns/{campaign_number}` | Unmatched | Get a campaign for an organization |
| `GitHubRestClient.campaignsListOrgCampaigns` | `GET` | `/orgs/{org}/campaigns` | Unmatched | List campaigns for an organization |
| `GitHubRestClient.campaignsUpdateCampaign` | `PATCH` | `/orgs/{org}/campaigns/{campaign_number}` | Unmatched | Update a campaign |

</details>

<details>
<summary><strong>checks</strong> (12)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.checksCreate` | `POST` | `/repos/{owner}/{repo}/check-runs` | Unmatched | Create a check run |
| `GitHubRestClient.checksCreateSuite` | `POST` | `/repos/{owner}/{repo}/check-suites` | Unmatched | Create a check suite |
| `GitHubRestClient.checksGet` | `GET` | `/repos/{owner}/{repo}/check-runs/{check_run_id}` | Unmatched | Get a check run |
| `GitHubRestClient.checksGetSuite` | `GET` | `/repos/{owner}/{repo}/check-suites/{check_suite_id}` | Unmatched | Get a check suite |
| `GitHubRestClient.checksListAnnotations` | `GET` | `/repos/{owner}/{repo}/check-runs/{check_run_id}/annotations` | Unmatched | List check run annotations |
| `GitHubRestClient.checksListForRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/check-runs` | Unmatched | List check runs for a Git reference |
| `GitHubRestClient.checksListForSuite` | `GET` | `/repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs` | Unmatched | List check runs in a check suite |
| `GitHubRestClient.checksListSuitesForRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/check-suites` | Unmatched | List check suites for a Git reference |
| `GitHubRestClient.checksRerequestRun` | `POST` | `/repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest` | Unmatched | Rerequest a check run |
| `GitHubRestClient.checksRerequestSuite` | `POST` | `/repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest` | Unmatched | Rerequest a check suite |
| `GitHubRestClient.checksSetSuitesPreferences` | `PATCH` | `/repos/{owner}/{repo}/check-suites/preferences` | Unmatched | Update repository preferences for check suites |
| `GitHubRestClient.checksUpdate` | `PATCH` | `/repos/{owner}/{repo}/check-runs/{check_run_id}` | Unmatched | Update a check run |

</details>

<details>
<summary><strong>classroom</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.classroomGetAClassroom` | `GET` | `/classrooms/{classroom_id}` | Unmatched | [Deprecated] Closing down - Get a classroom |
| `GitHubRestClient.classroomGetAnAssignment` | `GET` | `/assignments/{assignment_id}` | Unmatched | [Deprecated] Closing down - Get an assignment |
| `GitHubRestClient.classroomGetAssignmentGrades` | `GET` | `/assignments/{assignment_id}/grades` | Unmatched | [Deprecated] Closing down - Get assignment grades |
| `GitHubRestClient.classroomListAcceptedAssignmentsForAnAssignment` | `GET` | `/assignments/{assignment_id}/accepted_assignments` | Unmatched | [Deprecated] Closing down - List accepted assignments for an assignment |
| `GitHubRestClient.classroomListAssignmentsForAClassroom` | `GET` | `/classrooms/{classroom_id}/assignments` | Unmatched | [Deprecated] Closing down - List assignments for a classroom |
| `GitHubRestClient.classroomListClassrooms` | `GET` | `/classrooms` | Unmatched | [Deprecated] Closing down - List classrooms |

</details>

<details>
<summary><strong>code-quality</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.codeQualityGetFinding` | `GET` | `/repos/{owner}/{repo}/code-quality/findings/{finding_number}` | Unmatched | Get a code quality finding |
| `GitHubRestClient.codeQualityGetSetup` | `GET` | `/repos/{owner}/{repo}/code-quality/setup` | Unmatched | Get a code quality setup configuration |
| `GitHubRestClient.codeQualityListFindingsForRepo` | `GET` | `/repos/{owner}/{repo}/code-quality/findings` | Unmatched | List code quality findings for a repository |
| `GitHubRestClient.codeQualityUpdateSetup` | `PATCH` | `/repos/{owner}/{repo}/code-quality/setup` | Unmatched | Update a code quality setup configuration |

</details>

<details>
<summary><strong>code-scanning</strong> (21)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.codeScanningCommitAutofix` | `POST` | `/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits` | Unmatched | Commit an autofix for a code scanning alert |
| `GitHubRestClient.codeScanningCreateAutofix` | `POST` | `/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix` | `U:github.security` | Create an autofix for a code scanning alert |
| `GitHubRestClient.codeScanningCreateVariantAnalysis` | `POST` | `/repos/{owner}/{repo}/code-scanning/codeql/variant-analyses` | Unmatched | Create a CodeQL variant analysis |
| `GitHubRestClient.codeScanningDeleteAnalysis` | `DELETE` | `/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}` | Unmatched | Delete a code scanning analysis from a repository |
| `GitHubRestClient.codeScanningDeleteCodeqlDatabase` | `DELETE` | `/repos/{owner}/{repo}/code-scanning/codeql/databases/{language}` | Unmatched | Delete a CodeQL database |
| `GitHubRestClient.codeScanningGetAlert` | `GET` | `/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}` | Unmatched | Get a code scanning alert |
| `GitHubRestClient.codeScanningGetAnalysis` | `GET` | `/repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}` | Unmatched | Get a code scanning analysis for a repository |
| `GitHubRestClient.codeScanningGetAutofix` | `GET` | `/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix` | Unmatched | Get the status of an autofix for a code scanning alert |
| `GitHubRestClient.codeScanningGetCodeqlDatabase` | `GET` | `/repos/{owner}/{repo}/code-scanning/codeql/databases/{language}` | Unmatched | Get a CodeQL database for a repository |
| `GitHubRestClient.codeScanningGetDefaultSetup` | `GET` | `/repos/{owner}/{repo}/code-scanning/default-setup` | Unmatched | Get a code scanning default setup configuration |
| `GitHubRestClient.codeScanningGetSarif` | `GET` | `/repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}` | Unmatched | Get information about a SARIF upload |
| `GitHubRestClient.codeScanningGetVariantAnalysis` | `GET` | `/repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}` | Unmatched | Get the summary of a CodeQL variant analysis |
| `GitHubRestClient.codeScanningGetVariantAnalysisRepoTask` | `GET` | `/repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}` | Unmatched | Get the analysis status of a repository in a CodeQL variant analysis |
| `GitHubRestClient.codeScanningListAlertInstances` | `GET` | `/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances` | Unmatched | List instances of a code scanning alert |
| `GitHubRestClient.codeScanningListAlertsForOrg` | `GET` | `/orgs/{org}/code-scanning/alerts` | Unmatched | List code scanning alerts for an organization |
| `GitHubRestClient.codeScanningListAlertsForRepo` | `GET` | `/repos/{owner}/{repo}/code-scanning/alerts` | `U:github.security` | List code scanning alerts for a repository |
| `GitHubRestClient.codeScanningListCodeqlDatabases` | `GET` | `/repos/{owner}/{repo}/code-scanning/codeql/databases` | Unmatched | List CodeQL databases for a repository |
| `GitHubRestClient.codeScanningListRecentAnalyses` | `GET` | `/repos/{owner}/{repo}/code-scanning/analyses` | Unmatched | List code scanning analyses for a repository |
| `GitHubRestClient.codeScanningUpdateAlert` | `PATCH` | `/repos/{owner}/{repo}/code-scanning/alerts/{alert_number}` | Unmatched | Update a code scanning alert |
| `GitHubRestClient.codeScanningUpdateDefaultSetup` | `PATCH` | `/repos/{owner}/{repo}/code-scanning/default-setup` | Unmatched | Update a code scanning default setup configuration |
| `GitHubRestClient.codeScanningUploadSarif` | `POST` | `/repos/{owner}/{repo}/code-scanning/sarifs` | `U:github.security` | Upload an analysis as SARIF data |

</details>

<details>
<summary><strong>code-security</strong> (20)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.codeSecurityAttachConfiguration` | `POST` | `/orgs/{org}/code-security/configurations/{configuration_id}/attach` | Unmatched | Attach a configuration to repositories |
| `GitHubRestClient.codeSecurityAttachEnterpriseConfiguration` | `POST` | `/enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach` | Unmatched | Attach an enterprise configuration to repositories |
| `GitHubRestClient.codeSecurityCreateConfiguration` | `POST` | `/orgs/{org}/code-security/configurations` | Unmatched | Create a code security configuration |
| `GitHubRestClient.codeSecurityCreateConfigurationForEnterprise` | `POST` | `/enterprises/{enterprise}/code-security/configurations` | Unmatched | Create a code security configuration for an enterprise |
| `GitHubRestClient.codeSecurityDeleteConfiguration` | `DELETE` | `/orgs/{org}/code-security/configurations/{configuration_id}` | Unmatched | Delete a code security configuration |
| `GitHubRestClient.codeSecurityDeleteConfigurationForEnterprise` | `DELETE` | `/enterprises/{enterprise}/code-security/configurations/{configuration_id}` | Unmatched | Delete a code security configuration for an enterprise |
| `GitHubRestClient.codeSecurityDetachConfiguration` | `DELETE` | `/orgs/{org}/code-security/configurations/detach` | Unmatched | Detach configurations from repositories |
| `GitHubRestClient.codeSecurityGetConfiguration` | `GET` | `/orgs/{org}/code-security/configurations/{configuration_id}` | Unmatched | Get a code security configuration |
| `GitHubRestClient.codeSecurityGetConfigurationForRepository` | `GET` | `/repos/{owner}/{repo}/code-security-configuration` | Unmatched | Get the code security configuration associated with a repository |
| `GitHubRestClient.codeSecurityGetConfigurationsForEnterprise` | `GET` | `/enterprises/{enterprise}/code-security/configurations` | Unmatched | Get code security configurations for an enterprise |
| `GitHubRestClient.codeSecurityGetConfigurationsForOrg` | `GET` | `/orgs/{org}/code-security/configurations` | Unmatched | Get code security configurations for an organization |
| `GitHubRestClient.codeSecurityGetDefaultConfigurations` | `GET` | `/orgs/{org}/code-security/configurations/defaults` | Unmatched | Get default code security configurations |
| `GitHubRestClient.codeSecurityGetDefaultConfigurationsForEnterprise` | `GET` | `/enterprises/{enterprise}/code-security/configurations/defaults` | Unmatched | Get default code security configurations for an enterprise |
| `GitHubRestClient.codeSecurityGetRepositoriesForConfiguration` | `GET` | `/orgs/{org}/code-security/configurations/{configuration_id}/repositories` | Unmatched | Get repositories associated with a code security configuration |
| `GitHubRestClient.codeSecurityGetRepositoriesForEnterpriseConfiguration` | `GET` | `/enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories` | Unmatched | Get repositories associated with an enterprise code security configuration |
| `GitHubRestClient.codeSecurityGetSingleConfigurationForEnterprise` | `GET` | `/enterprises/{enterprise}/code-security/configurations/{configuration_id}` | Unmatched | Retrieve a code security configuration of an enterprise |
| `GitHubRestClient.codeSecuritySetConfigurationAsDefault` | `PUT` | `/orgs/{org}/code-security/configurations/{configuration_id}/defaults` | Unmatched | Set a code security configuration as a default for an organization |
| `GitHubRestClient.codeSecuritySetConfigurationAsDefaultForEnterprise` | `PUT` | `/enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults` | Unmatched | Set a code security configuration as a default for an enterprise |
| `GitHubRestClient.codeSecurityUpdateConfiguration` | `PATCH` | `/orgs/{org}/code-security/configurations/{configuration_id}` | Unmatched | Update a code security configuration |
| `GitHubRestClient.codeSecurityUpdateEnterpriseConfiguration` | `PATCH` | `/enterprises/{enterprise}/code-security/configurations/{configuration_id}` | Unmatched | Update a custom code security configuration for an enterprise |

</details>

<details>
<summary><strong>codes-of-conduct</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.codesOfConductGetAllCodesOfConduct` | `GET` | `/codes_of_conduct` | Unmatched | Get all codes of conduct |
| `GitHubRestClient.codesOfConductGetConductCode` | `GET` | `/codes_of_conduct/{key}` | Unmatched | Get a code of conduct |

</details>

<details>
<summary><strong>codespaces</strong> (48)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.codespacesAddRepositoryForSecretForAuthenticatedUser` | `PUT` | `/user/codespaces/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Add a selected repository to a user secret |
| `GitHubRestClient.codespacesAddSelectedRepoToOrgSecret` | `PUT` | `/orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Add selected repository to an organization secret |
| `GitHubRestClient.codespacesCheckPermissionsForDevcontainer` | `GET` | `/repos/{owner}/{repo}/codespaces/permissions_check` | Unmatched | Check if permissions defined by a devcontainer have been accepted by the authenticated user |
| `GitHubRestClient.codespacesCodespaceMachinesForAuthenticatedUser` | `GET` | `/user/codespaces/{codespace_name}/machines` | Unmatched | List machine types for a codespace |
| `GitHubRestClient.codespacesCreateForAuthenticatedUser` | `POST` | `/user/codespaces` | Unmatched | Create a codespace for the authenticated user |
| `GitHubRestClient.codespacesCreateOrUpdateOrgSecret` | `PUT` | `/orgs/{org}/codespaces/secrets/{secret_name}` | Unmatched | Create or update an organization secret |
| `GitHubRestClient.codespacesCreateOrUpdateRepoSecret` | `PUT` | `/repos/{owner}/{repo}/codespaces/secrets/{secret_name}` | Unmatched | Create or update a repository secret |
| `GitHubRestClient.codespacesCreateOrUpdateSecretForAuthenticatedUser` | `PUT` | `/user/codespaces/secrets/{secret_name}` | Unmatched | Create or update a secret for the authenticated user |
| `GitHubRestClient.codespacesCreateWithPrForAuthenticatedUser` | `POST` | `/repos/{owner}/{repo}/pulls/{pull_number}/codespaces` | Unmatched | Create a codespace from a pull request |
| `GitHubRestClient.codespacesCreateWithRepoForAuthenticatedUser` | `POST` | `/repos/{owner}/{repo}/codespaces` | `U:github.codespaces-copilot-agents` | Create a codespace in a repository |
| `GitHubRestClient.codespacesDeleteCodespacesAccessUsers` | `DELETE` | `/orgs/{org}/codespaces/access/selected_users` | Unmatched | [Deprecated] Remove users from Codespaces access for an organization |
| `GitHubRestClient.codespacesDeleteForAuthenticatedUser` | `DELETE` | `/user/codespaces/{codespace_name}` | Unmatched | Delete a codespace for the authenticated user |
| `GitHubRestClient.codespacesDeleteFromOrganization` | `DELETE` | `/orgs/{org}/members/{username}/codespaces/{codespace_name}` | Unmatched | Delete a codespace from the organization |
| `GitHubRestClient.codespacesDeleteOrgSecret` | `DELETE` | `/orgs/{org}/codespaces/secrets/{secret_name}` | Unmatched | Delete an organization secret |
| `GitHubRestClient.codespacesDeleteRepoSecret` | `DELETE` | `/repos/{owner}/{repo}/codespaces/secrets/{secret_name}` | Unmatched | Delete a repository secret |
| `GitHubRestClient.codespacesDeleteSecretForAuthenticatedUser` | `DELETE` | `/user/codespaces/secrets/{secret_name}` | Unmatched | Delete a secret for the authenticated user |
| `GitHubRestClient.codespacesExportForAuthenticatedUser` | `POST` | `/user/codespaces/{codespace_name}/exports` | Unmatched | Export a codespace for the authenticated user |
| `GitHubRestClient.codespacesGetCodespacesForUserInOrg` | `GET` | `/orgs/{org}/members/{username}/codespaces` | Unmatched | List codespaces for a user in organization |
| `GitHubRestClient.codespacesGetExportDetailsForAuthenticatedUser` | `GET` | `/user/codespaces/{codespace_name}/exports/{export_id}` | Unmatched | Get details about a codespace export |
| `GitHubRestClient.codespacesGetForAuthenticatedUser` | `GET` | `/user/codespaces/{codespace_name}` | Unmatched | Get a codespace for the authenticated user |
| `GitHubRestClient.codespacesGetOrgPublicKey` | `GET` | `/orgs/{org}/codespaces/secrets/public-key` | Unmatched | Get an organization public key |
| `GitHubRestClient.codespacesGetOrgSecret` | `GET` | `/orgs/{org}/codespaces/secrets/{secret_name}` | Unmatched | Get an organization secret |
| `GitHubRestClient.codespacesGetPublicKeyForAuthenticatedUser` | `GET` | `/user/codespaces/secrets/public-key` | Unmatched | Get public key for the authenticated user |
| `GitHubRestClient.codespacesGetRepoPublicKey` | `GET` | `/repos/{owner}/{repo}/codespaces/secrets/public-key` | Unmatched | Get a repository public key |
| `GitHubRestClient.codespacesGetRepoSecret` | `GET` | `/repos/{owner}/{repo}/codespaces/secrets/{secret_name}` | Unmatched | Get a repository secret |
| `GitHubRestClient.codespacesGetSecretForAuthenticatedUser` | `GET` | `/user/codespaces/secrets/{secret_name}` | Unmatched | Get a secret for the authenticated user |
| `GitHubRestClient.codespacesListDevcontainersInRepositoryForAuthenticatedUser` | `GET` | `/repos/{owner}/{repo}/codespaces/devcontainers` | Unmatched | List devcontainer configurations in a repository for the authenticated user |
| `GitHubRestClient.codespacesListForAuthenticatedUser` | `GET` | `/user/codespaces` | Unmatched | List codespaces for the authenticated user |
| `GitHubRestClient.codespacesListInOrganization` | `GET` | `/orgs/{org}/codespaces` | Unmatched | List codespaces for the organization |
| `GitHubRestClient.codespacesListInRepositoryForAuthenticatedUser` | `GET` | `/repos/{owner}/{repo}/codespaces` | Unmatched | List codespaces in a repository for the authenticated user |
| `GitHubRestClient.codespacesListOrgSecrets` | `GET` | `/orgs/{org}/codespaces/secrets` | Unmatched | List organization secrets |
| `GitHubRestClient.codespacesListRepoSecrets` | `GET` | `/repos/{owner}/{repo}/codespaces/secrets` | Unmatched | List repository secrets |
| `GitHubRestClient.codespacesListRepositoriesForSecretForAuthenticatedUser` | `GET` | `/user/codespaces/secrets/{secret_name}/repositories` | Unmatched | List selected repositories for a user secret |
| `GitHubRestClient.codespacesListSecretsForAuthenticatedUser` | `GET` | `/user/codespaces/secrets` | Unmatched | List secrets for the authenticated user |
| `GitHubRestClient.codespacesListSelectedReposForOrgSecret` | `GET` | `/orgs/{org}/codespaces/secrets/{secret_name}/repositories` | Unmatched | List selected repositories for an organization secret |
| `GitHubRestClient.codespacesPreFlightWithRepoForAuthenticatedUser` | `GET` | `/repos/{owner}/{repo}/codespaces/new` | Unmatched | Get default attributes for a codespace |
| `GitHubRestClient.codespacesPublishForAuthenticatedUser` | `POST` | `/user/codespaces/{codespace_name}/publish` | Unmatched | Create a repository from an unpublished codespace |
| `GitHubRestClient.codespacesRemoveRepositoryForSecretForAuthenticatedUser` | `DELETE` | `/user/codespaces/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Remove a selected repository from a user secret |
| `GitHubRestClient.codespacesRemoveSelectedRepoFromOrgSecret` | `DELETE` | `/orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Remove selected repository from an organization secret |
| `GitHubRestClient.codespacesRepoMachinesForAuthenticatedUser` | `GET` | `/repos/{owner}/{repo}/codespaces/machines` | Unmatched | List available machine types for a repository |
| `GitHubRestClient.codespacesSetCodespacesAccess` | `PUT` | `/orgs/{org}/codespaces/access` | Unmatched | [Deprecated] Manage access control for organization codespaces |
| `GitHubRestClient.codespacesSetCodespacesAccessUsers` | `POST` | `/orgs/{org}/codespaces/access/selected_users` | Unmatched | [Deprecated] Add users to Codespaces access for an organization |
| `GitHubRestClient.codespacesSetRepositoriesForSecretForAuthenticatedUser` | `PUT` | `/user/codespaces/secrets/{secret_name}/repositories` | Unmatched | Set selected repositories for a user secret |
| `GitHubRestClient.codespacesSetSelectedReposForOrgSecret` | `PUT` | `/orgs/{org}/codespaces/secrets/{secret_name}/repositories` | Unmatched | Set selected repositories for an organization secret |
| `GitHubRestClient.codespacesStartForAuthenticatedUser` | `POST` | `/user/codespaces/{codespace_name}/start` | `U:github.codespaces-copilot-agents` | Start a codespace for the authenticated user |
| `GitHubRestClient.codespacesStopForAuthenticatedUser` | `POST` | `/user/codespaces/{codespace_name}/stop` | Unmatched | Stop a codespace for the authenticated user |
| `GitHubRestClient.codespacesStopInOrganization` | `POST` | `/orgs/{org}/members/{username}/codespaces/{codespace_name}/stop` | Unmatched | Stop a codespace for an organization user |
| `GitHubRestClient.codespacesUpdateForAuthenticatedUser` | `PATCH` | `/user/codespaces/{codespace_name}` | Unmatched | Update a codespace for the authenticated user |

</details>

<details>
<summary><strong>copilot</strong> (31)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.copilotAddCopilotSeatsForTeams` | `POST` | `/orgs/{org}/copilot/billing/selected_teams` | Unmatched | Add teams to the Copilot subscription for an organization |
| `GitHubRestClient.copilotAddCopilotSeatsForUsers` | `POST` | `/orgs/{org}/copilot/billing/selected_users` | `U:github.codespaces-copilot-agents` | Add users to the Copilot subscription for an organization |
| `GitHubRestClient.copilotAddOrganizationsToEnterpriseCodingAgentPolicy` | `POST` | `/enterprises/{enterprise}/copilot/policies/coding_agent/organizations` | Unmatched | Add organizations to the enterprise coding agent policy |
| `GitHubRestClient.copilotCancelCopilotSeatAssignmentForTeams` | `DELETE` | `/orgs/{org}/copilot/billing/selected_teams` | Unmatched | Remove teams from the Copilot subscription for an organization |
| `GitHubRestClient.copilotCancelCopilotSeatAssignmentForUsers` | `DELETE` | `/orgs/{org}/copilot/billing/selected_users` | Unmatched | Remove users from the Copilot subscription for an organization |
| `GitHubRestClient.copilotCopilotContentExclusionForOrganization` | `GET` | `/orgs/{org}/copilot/content_exclusion` | Unmatched | Get Copilot content exclusion rules for an organization |
| `GitHubRestClient.copilotCopilotEnterpriseOneDayUsageMetrics` | `GET` | `/enterprises/{enterprise}/copilot/metrics/reports/enterprise-1-day` | Unmatched | Get Copilot enterprise usage metrics for a specific day |
| `GitHubRestClient.copilotCopilotEnterpriseReposOneDayReport` | `GET` | `/enterprises/{enterprise}/copilot/metrics/reports/repos-1-day` | Unmatched | Get Copilot enterprise repository report for a specific day |
| `GitHubRestClient.copilotCopilotEnterpriseUsageMetrics` | `GET` | `/enterprises/{enterprise}/copilot/metrics/reports/enterprise-28-day/latest` | Unmatched | Get Copilot enterprise usage metrics |
| `GitHubRestClient.copilotCopilotEnterpriseUserTeamsOneDayReport` | `GET` | `/enterprises/{enterprise}/copilot/metrics/reports/user-teams-1-day` | Unmatched | Get Copilot enterprise user-teams report for a specific day |
| `GitHubRestClient.copilotCopilotOrganizationOneDayUsageMetrics` | `GET` | `/orgs/{org}/copilot/metrics/reports/organization-1-day` | Unmatched | Get Copilot organization usage metrics for a specific day |
| `GitHubRestClient.copilotCopilotOrganizationReposOneDayReport` | `GET` | `/orgs/{org}/copilot/metrics/reports/repos-1-day` | Unmatched | Get Copilot organization repository report for a specific day |
| `GitHubRestClient.copilotCopilotOrganizationUsageMetrics` | `GET` | `/orgs/{org}/copilot/metrics/reports/organization-28-day/latest` | Unmatched | Get Copilot organization usage metrics |
| `GitHubRestClient.copilotCopilotOrganizationUserTeamsOneDayReport` | `GET` | `/orgs/{org}/copilot/metrics/reports/user-teams-1-day` | Unmatched | Get Copilot organization user-teams report for a specific day |
| `GitHubRestClient.copilotCopilotOrganizationUsersOneDayUsageMetrics` | `GET` | `/orgs/{org}/copilot/metrics/reports/users-1-day` | Unmatched | Get Copilot organization users usage metrics for a specific day |
| `GitHubRestClient.copilotCopilotOrganizationUsersUsageMetrics` | `GET` | `/orgs/{org}/copilot/metrics/reports/users-28-day/latest` | Unmatched | Get Copilot organization users usage metrics |
| `GitHubRestClient.copilotCopilotUsersOneDayUsageMetrics` | `GET` | `/enterprises/{enterprise}/copilot/metrics/reports/users-1-day` | Unmatched | Get Copilot users usage metrics for a specific day |
| `GitHubRestClient.copilotCopilotUsersUsageMetrics` | `GET` | `/enterprises/{enterprise}/copilot/metrics/reports/users-28-day/latest` | Unmatched | Get Copilot users usage metrics |
| `GitHubRestClient.copilotDisableCopilotCodingAgentForRepositoryInOrganization` | `DELETE` | `/orgs/{org}/copilot/coding-agent/permissions/repositories/{repository_id}` | Unmatched | Disable a repository for Copilot cloud agent in an organization |
| `GitHubRestClient.copilotEnableCopilotCodingAgentForRepositoryInOrganization` | `PUT` | `/orgs/{org}/copilot/coding-agent/permissions/repositories/{repository_id}` | Unmatched | Enable a repository for Copilot cloud agent in an organization |
| `GitHubRestClient.copilotGetCopilotCloudAgentConfiguration` | `GET` | `/repos/{owner}/{repo}/copilot/cloud-agent/configuration` | Unmatched | Get Copilot cloud agent configuration for a repository |
| `GitHubRestClient.copilotGetCopilotCodingAgentPermissionsOrganization` | `GET` | `/orgs/{org}/copilot/coding-agent/permissions` | Unmatched | Get Copilot cloud agent permissions for an organization |
| `GitHubRestClient.copilotGetCopilotOrganizationDetails` | `GET` | `/orgs/{org}/copilot/billing` | Unmatched | Get Copilot seat information and settings for an organization |
| `GitHubRestClient.copilotGetCopilotSeatDetailsForUser` | `GET` | `/orgs/{org}/members/{username}/copilot` | Unmatched | Get Copilot seat assignment details for a user |
| `GitHubRestClient.copilotListCopilotCodingAgentSelectedRepositoriesForOrganization` | `GET` | `/orgs/{org}/copilot/coding-agent/permissions/repositories` | Unmatched | List repositories enabled for Copilot cloud agent in an organization |
| `GitHubRestClient.copilotListCopilotSeats` | `GET` | `/orgs/{org}/copilot/billing/seats` | Unmatched | List all Copilot seat assignments for an organization |
| `GitHubRestClient.copilotRemoveOrganizationsFromEnterpriseCodingAgentPolicy` | `DELETE` | `/enterprises/{enterprise}/copilot/policies/coding_agent/organizations` | Unmatched | Remove organizations from the enterprise coding agent policy |
| `GitHubRestClient.copilotSetCopilotCodingAgentPermissionsOrganization` | `PUT` | `/orgs/{org}/copilot/coding-agent/permissions` | Unmatched | Set Copilot cloud agent permissions for an organization |
| `GitHubRestClient.copilotSetCopilotCodingAgentSelectedRepositoriesForOrganization` | `PUT` | `/orgs/{org}/copilot/coding-agent/permissions/repositories` | Unmatched | Set selected repositories for Copilot cloud agent in an organization |
| `GitHubRestClient.copilotSetCopilotContentExclusionForOrganization` | `PUT` | `/orgs/{org}/copilot/content_exclusion` | Unmatched | Set Copilot content exclusion rules for an organization |
| `GitHubRestClient.copilotSetEnterpriseCodingAgentPolicy` | `PUT` | `/enterprises/{enterprise}/copilot/policies/coding_agent` | Unmatched | Set the coding agent policy for an enterprise |

</details>

<details>
<summary><strong>copilot-spaces</strong> (28)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.copilotSpacesAddCollaboratorForOrg` | `POST` | `/orgs/{org}/copilot-spaces/{space_number}/collaborators` | Unmatched | Add a collaborator to an organization Copilot Space |
| `GitHubRestClient.copilotSpacesAddCollaboratorForUser` | `POST` | `/users/{username}/copilot-spaces/{space_number}/collaborators` | Unmatched | Add a collaborator to a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesCreateForOrg` | `POST` | `/orgs/{org}/copilot-spaces` | `U:github.codespaces-copilot-agents` | Create an organization Copilot Space |
| `GitHubRestClient.copilotSpacesCreateForUser` | `POST` | `/users/{username}/copilot-spaces` | Unmatched | Create a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesCreateResourceForOrg` | `POST` | `/orgs/{org}/copilot-spaces/{space_number}/resources` | Unmatched | Create a resource for an organization Copilot Space |
| `GitHubRestClient.copilotSpacesCreateResourceForUser` | `POST` | `/users/{username}/copilot-spaces/{space_number}/resources` | Unmatched | Create a resource for a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesDeleteForOrg` | `DELETE` | `/orgs/{org}/copilot-spaces/{space_number}` | Unmatched | Delete an organization Copilot Space |
| `GitHubRestClient.copilotSpacesDeleteForUser` | `DELETE` | `/users/{username}/copilot-spaces/{space_number}` | Unmatched | Delete a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesDeleteResourceForOrg` | `DELETE` | `/orgs/{org}/copilot-spaces/{space_number}/resources/{space_resource_id}` | Unmatched | Delete a resource from an organization Copilot Space |
| `GitHubRestClient.copilotSpacesDeleteResourceForUser` | `DELETE` | `/users/{username}/copilot-spaces/{space_number}/resources/{space_resource_id}` | Unmatched | Delete a resource from a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesGetForOrg` | `GET` | `/orgs/{org}/copilot-spaces/{space_number}` | Unmatched | Get an organization Copilot Space |
| `GitHubRestClient.copilotSpacesGetForUser` | `GET` | `/users/{username}/copilot-spaces/{space_number}` | Unmatched | Get a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesGetResourceForOrg` | `GET` | `/orgs/{org}/copilot-spaces/{space_number}/resources/{space_resource_id}` | Unmatched | Get a resource for an organization Copilot Space |
| `GitHubRestClient.copilotSpacesGetResourceForUser` | `GET` | `/users/{username}/copilot-spaces/{space_number}/resources/{space_resource_id}` | Unmatched | Get a resource for a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesListCollaboratorsForOrg` | `GET` | `/orgs/{org}/copilot-spaces/{space_number}/collaborators` | Unmatched | List collaborators for an organization Copilot Space |
| `GitHubRestClient.copilotSpacesListCollaboratorsForUser` | `GET` | `/users/{username}/copilot-spaces/{space_number}/collaborators` | Unmatched | List collaborators for a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesListForOrg` | `GET` | `/orgs/{org}/copilot-spaces` | Unmatched | List organization Copilot Spaces |
| `GitHubRestClient.copilotSpacesListForUser` | `GET` | `/users/{username}/copilot-spaces` | Unmatched | List Copilot Spaces for a user |
| `GitHubRestClient.copilotSpacesListResourcesForOrg` | `GET` | `/orgs/{org}/copilot-spaces/{space_number}/resources` | Unmatched | List resources for an organization Copilot Space |
| `GitHubRestClient.copilotSpacesListResourcesForUser` | `GET` | `/users/{username}/copilot-spaces/{space_number}/resources` | Unmatched | List resources for a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesRemoveCollaboratorForOrg` | `DELETE` | `/orgs/{org}/copilot-spaces/{space_number}/collaborators/{actor_type}/{actor_identifier}` | Unmatched | Remove a collaborator from an organization Copilot Space |
| `GitHubRestClient.copilotSpacesRemoveCollaboratorForUser` | `DELETE` | `/users/{username}/copilot-spaces/{space_number}/collaborators/{actor_type}/{actor_identifier}` | Unmatched | Remove a collaborator from a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesUpdateCollaboratorForOrg` | `PUT` | `/orgs/{org}/copilot-spaces/{space_number}/collaborators/{actor_type}/{actor_identifier}` | Unmatched | Set a collaborator role for an organization Copilot Space |
| `GitHubRestClient.copilotSpacesUpdateCollaboratorForUser` | `PUT` | `/users/{username}/copilot-spaces/{space_number}/collaborators/{actor_type}/{actor_identifier}` | Unmatched | Set a collaborator role for a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesUpdateForOrg` | `PUT` | `/orgs/{org}/copilot-spaces/{space_number}` | Unmatched | Set an organization Copilot Space |
| `GitHubRestClient.copilotSpacesUpdateForUser` | `PUT` | `/users/{username}/copilot-spaces/{space_number}` | Unmatched | Set a Copilot Space for a user |
| `GitHubRestClient.copilotSpacesUpdateResourceForOrg` | `PUT` | `/orgs/{org}/copilot-spaces/{space_number}/resources/{space_resource_id}` | Unmatched | Set a resource for an organization Copilot Space |
| `GitHubRestClient.copilotSpacesUpdateResourceForUser` | `PUT` | `/users/{username}/copilot-spaces/{space_number}/resources/{space_resource_id}` | Unmatched | Set a resource for a Copilot Space for a user |

</details>

<details>
<summary><strong>credentials</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.credentialsRevoke` | `POST` | `/credentials/revoke` | Unmatched | Revoke a list of credentials |

</details>

<details>
<summary><strong>dependabot</strong> (25)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.dependabotAddSelectedRepoToOrgSecret` | `PUT` | `/orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Add selected repository to an organization secret |
| `GitHubRestClient.dependabotCreateOrUpdateOrgSecret` | `PUT` | `/orgs/{org}/dependabot/secrets/{secret_name}` | Unmatched | Create or update an organization secret |
| `GitHubRestClient.dependabotCreateOrUpdateRepoSecret` | `PUT` | `/repos/{owner}/{repo}/dependabot/secrets/{secret_name}` | Unmatched | Create or update a repository secret |
| `GitHubRestClient.dependabotDeleteOrgSecret` | `DELETE` | `/orgs/{org}/dependabot/secrets/{secret_name}` | Unmatched | Delete an organization secret |
| `GitHubRestClient.dependabotDeleteRepoSecret` | `DELETE` | `/repos/{owner}/{repo}/dependabot/secrets/{secret_name}` | Unmatched | Delete a repository secret |
| `GitHubRestClient.dependabotGetAlert` | `GET` | `/repos/{owner}/{repo}/dependabot/alerts/{alert_number}` | Unmatched | Get a Dependabot alert |
| `GitHubRestClient.dependabotGetOrgPublicKey` | `GET` | `/orgs/{org}/dependabot/secrets/public-key` | Unmatched | Get an organization public key |
| `GitHubRestClient.dependabotGetOrgSecret` | `GET` | `/orgs/{org}/dependabot/secrets/{secret_name}` | Unmatched | Get an organization secret |
| `GitHubRestClient.dependabotGetRepoPublicKey` | `GET` | `/repos/{owner}/{repo}/dependabot/secrets/public-key` | Unmatched | Get a repository public key |
| `GitHubRestClient.dependabotGetRepoSecret` | `GET` | `/repos/{owner}/{repo}/dependabot/secrets/{secret_name}` | Unmatched | Get a repository secret |
| `GitHubRestClient.dependabotListAlertsForEnterprise` | `GET` | `/enterprises/{enterprise}/dependabot/alerts` | Unmatched | List Dependabot alerts for an enterprise |
| `GitHubRestClient.dependabotListAlertsForOrg` | `GET` | `/orgs/{org}/dependabot/alerts` | Unmatched | List Dependabot alerts for an organization |
| `GitHubRestClient.dependabotListAlertsForRepo` | `GET` | `/repos/{owner}/{repo}/dependabot/alerts` | Unmatched | List Dependabot alerts for a repository |
| `GitHubRestClient.dependabotListOrgSecrets` | `GET` | `/orgs/{org}/dependabot/secrets` | Unmatched | List organization secrets |
| `GitHubRestClient.dependabotListRepoSecrets` | `GET` | `/repos/{owner}/{repo}/dependabot/secrets` | Unmatched | List repository secrets |
| `GitHubRestClient.dependabotListSelectedReposForOrgSecret` | `GET` | `/orgs/{org}/dependabot/secrets/{secret_name}/repositories` | Unmatched | List selected repositories for an organization secret |
| `GitHubRestClient.dependabotRemoveSelectedRepoFromOrgSecret` | `DELETE` | `/orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}` | Unmatched | Remove selected repository from an organization secret |
| `GitHubRestClient.dependabotRepositoryAccessForEnterprise` | `GET` | `/enterprises/{enterprise}/dependabot/repository-access` | Unmatched | Lists the repositories Dependabot can access in an enterprise |
| `GitHubRestClient.dependabotRepositoryAccessForOrg` | `GET` | `/orgs/{org}/dependabot/repository-access` | Unmatched | Lists the repositories Dependabot can access in an organization |
| `GitHubRestClient.dependabotSetRepositoryAccessDefaultLevel` | `PUT` | `/orgs/{org}/dependabot/repository-access/default-level` | Unmatched | Set the default repository access level for Dependabot |
| `GitHubRestClient.dependabotSetRepositoryAccessDefaultLevelForEnterprise` | `PUT` | `/enterprises/{enterprise}/dependabot/repository-access/default-level` | Unmatched | Set the default repository access level for Dependabot in an enterprise |
| `GitHubRestClient.dependabotSetSelectedReposForOrgSecret` | `PUT` | `/orgs/{org}/dependabot/secrets/{secret_name}/repositories` | Unmatched | Set selected repositories for an organization secret |
| `GitHubRestClient.dependabotUpdateAlert` | `PATCH` | `/repos/{owner}/{repo}/dependabot/alerts/{alert_number}` | Unmatched | Update a Dependabot alert |
| `GitHubRestClient.dependabotUpdateRepositoryAccessForEnterprise` | `PATCH` | `/enterprises/{enterprise}/dependabot/repository-access` | Unmatched | Updates Dependabot's repository access list for an enterprise |
| `GitHubRestClient.dependabotUpdateRepositoryAccessForOrg` | `PATCH` | `/orgs/{org}/dependabot/repository-access` | Unmatched | Updates Dependabot's repository access list for an organization |

</details>

<details>
<summary><strong>dependency-graph</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.dependencyGraphCreateRepositorySnapshot` | `POST` | `/repos/{owner}/{repo}/dependency-graph/snapshots` | Unmatched | Create a snapshot of dependencies for a repository |
| `GitHubRestClient.dependencyGraphDiffRange` | `GET` | `/repos/{owner}/{repo}/dependency-graph/compare/{basehead}` | Unmatched | Get a diff of the dependencies between commits |
| `GitHubRestClient.dependencyGraphExportSbom` | `GET` | `/repos/{owner}/{repo}/dependency-graph/sbom` | `U:github.security` | Export a software bill of materials (SBOM) for a repository. |
| `GitHubRestClient.dependencyGraphFetchSbomReport` | `GET` | `/repos/{owner}/{repo}/dependency-graph/sbom/fetch-report/{sbom_uuid}` | Unmatched | Fetch a software bill of materials (SBOM) for a repository. |
| `GitHubRestClient.dependencyGraphGenerateSbomReport` | `GET` | `/repos/{owner}/{repo}/dependency-graph/sbom/generate-report` | Unmatched | Request generation of a software bill of materials (SBOM) for a repository. |

</details>

<details>
<summary><strong>emojis</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.emojisGet` | `GET` | `/emojis` | Unmatched | Get emojis |

</details>

<details>
<summary><strong>enterprise-team-memberships</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.enterpriseTeamMembershipsAdd` | `PUT` | `/enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}` | Unmatched | Add team member |
| `GitHubRestClient.enterpriseTeamMembershipsBulkAdd` | `POST` | `/enterprises/{enterprise}/teams/{enterprise-team}/memberships/add` | Unmatched | Bulk add team members |
| `GitHubRestClient.enterpriseTeamMembershipsBulkRemove` | `POST` | `/enterprises/{enterprise}/teams/{enterprise-team}/memberships/remove` | Unmatched | Bulk remove team members |
| `GitHubRestClient.enterpriseTeamMembershipsGet` | `GET` | `/enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}` | Unmatched | Get enterprise team membership |
| `GitHubRestClient.enterpriseTeamMembershipsList` | `GET` | `/enterprises/{enterprise}/teams/{enterprise-team}/memberships` | Unmatched | List members in an enterprise team |
| `GitHubRestClient.enterpriseTeamMembershipsRemove` | `DELETE` | `/enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}` | Unmatched | Remove team membership |

</details>

<details>
<summary><strong>enterprise-team-organizations</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.enterpriseTeamOrganizationsAdd` | `PUT` | `/enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}` | Unmatched | Add an organization assignment |
| `GitHubRestClient.enterpriseTeamOrganizationsBulkAdd` | `POST` | `/enterprises/{enterprise}/teams/{enterprise-team}/organizations/add` | Unmatched | Add organization assignments |
| `GitHubRestClient.enterpriseTeamOrganizationsBulkRemove` | `POST` | `/enterprises/{enterprise}/teams/{enterprise-team}/organizations/remove` | Unmatched | Remove organization assignments |
| `GitHubRestClient.enterpriseTeamOrganizationsDelete` | `DELETE` | `/enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}` | Unmatched | Delete an organization assignment |
| `GitHubRestClient.enterpriseTeamOrganizationsGetAssignment` | `GET` | `/enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}` | Unmatched | Get organization assignment |
| `GitHubRestClient.enterpriseTeamOrganizationsGetAssignments` | `GET` | `/enterprises/{enterprise}/teams/{enterprise-team}/organizations` | Unmatched | Get organization assignments |

</details>

<details>
<summary><strong>enterprise-teams</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.enterpriseTeamsCreate` | `POST` | `/enterprises/{enterprise}/teams` | Unmatched | Create an enterprise team |
| `GitHubRestClient.enterpriseTeamsDelete` | `DELETE` | `/enterprises/{enterprise}/teams/{team_slug}` | Unmatched | Delete an enterprise team |
| `GitHubRestClient.enterpriseTeamsGet` | `GET` | `/enterprises/{enterprise}/teams/{team_slug}` | Unmatched | Get an enterprise team |
| `GitHubRestClient.enterpriseTeamsList` | `GET` | `/enterprises/{enterprise}/teams` | Unmatched | List enterprise teams |
| `GitHubRestClient.enterpriseTeamsUpdate` | `PATCH` | `/enterprises/{enterprise}/teams/{team_slug}` | Unmatched | Update an enterprise team |

</details>

<details>
<summary><strong>gists</strong> (20)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.gistsCheckIsStarred` | `GET` | `/gists/{gist_id}/star` | Unmatched | Check if a gist is starred |
| `GitHubRestClient.gistsCreate` | `POST` | `/gists` | `P:snippet.crud.v1` | Create a gist |
| `GitHubRestClient.gistsCreateComment` | `POST` | `/gists/{gist_id}/comments` | Unmatched | Create a gist comment |
| `GitHubRestClient.gistsDelete` | `DELETE` | `/gists/{gist_id}` | `P:snippet.crud.v1` | Delete a gist |
| `GitHubRestClient.gistsDeleteComment` | `DELETE` | `/gists/{gist_id}/comments/{comment_id}` | Unmatched | Delete a gist comment |
| `GitHubRestClient.gistsFork` | `POST` | `/gists/{gist_id}/forks` | Unmatched | Fork a gist |
| `GitHubRestClient.gistsGet` | `GET` | `/gists/{gist_id}` | `P:snippet.crud.v1` | Get a gist |
| `GitHubRestClient.gistsGetComment` | `GET` | `/gists/{gist_id}/comments/{comment_id}` | Unmatched | Get a gist comment |
| `GitHubRestClient.gistsGetRevision` | `GET` | `/gists/{gist_id}/{sha}` | Unmatched | Get a gist revision |
| `GitHubRestClient.gistsList` | `GET` | `/gists` | `P:snippet.crud.v1` | List gists for the authenticated user |
| `GitHubRestClient.gistsListComments` | `GET` | `/gists/{gist_id}/comments` | Unmatched | List gist comments |
| `GitHubRestClient.gistsListCommits` | `GET` | `/gists/{gist_id}/commits` | Unmatched | List gist commits |
| `GitHubRestClient.gistsListForUser` | `GET` | `/users/{username}/gists` | Unmatched | List gists for a user |
| `GitHubRestClient.gistsListForks` | `GET` | `/gists/{gist_id}/forks` | Unmatched | List gist forks |
| `GitHubRestClient.gistsListPublic` | `GET` | `/gists/public` | Unmatched | List public gists |
| `GitHubRestClient.gistsListStarred` | `GET` | `/gists/starred` | Unmatched | List starred gists |
| `GitHubRestClient.gistsStar` | `PUT` | `/gists/{gist_id}/star` | Unmatched | Star a gist |
| `GitHubRestClient.gistsUnstar` | `DELETE` | `/gists/{gist_id}/star` | Unmatched | Unstar a gist |
| `GitHubRestClient.gistsUpdate` | `PATCH` | `/gists/{gist_id}` | `P:snippet.crud.v1` | Update a gist |
| `GitHubRestClient.gistsUpdateComment` | `PATCH` | `/gists/{gist_id}/comments/{comment_id}` | Unmatched | Update a gist comment |

</details>

<details>
<summary><strong>git</strong> (13)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.gitCreateBlob` | `POST` | `/repos/{owner}/{repo}/git/blobs` | `P:content.write.v1` | Create a blob |
| `GitHubRestClient.gitCreateCommit` | `POST` | `/repos/{owner}/{repo}/git/commits` | `P:content.write.v1` | Create a commit |
| `GitHubRestClient.gitCreateRef` | `POST` | `/repos/{owner}/{repo}/git/refs` | `P:branch.create.v1`<br>`P:tag.create-delete.v1` | Create a reference |
| `GitHubRestClient.gitCreateTag` | `POST` | `/repos/{owner}/{repo}/git/tags` | `P:tag.create-delete.v1` | Create a tag object |
| `GitHubRestClient.gitCreateTree` | `POST` | `/repos/{owner}/{repo}/git/trees` | `P:content.write.v1` | Create a tree |
| `GitHubRestClient.gitDeleteRef` | `DELETE` | `/repos/{owner}/{repo}/git/refs/{ref}` | `P:branch.delete.v1`<br>`P:tag.create-delete.v1` | Delete a reference |
| `GitHubRestClient.gitGetBlob` | `GET` | `/repos/{owner}/{repo}/git/blobs/{file_sha}` | `E:git.blob.read.v1` | Get a blob |
| `GitHubRestClient.gitGetCommit` | `GET` | `/repos/{owner}/{repo}/git/commits/{commit_sha}` | `E:commit.get.v1` | Get a commit object |
| `GitHubRestClient.gitGetRef` | `GET` | `/repos/{owner}/{repo}/git/ref/{ref}` | `E:git.ref.read.v1`<br>`P:tag.list-get.v1` | Get a reference |
| `GitHubRestClient.gitGetTag` | `GET` | `/repos/{owner}/{repo}/git/tags/{tag_sha}` | `P:tag.list-get.v1` | Get a tag |
| `GitHubRestClient.gitGetTree` | `GET` | `/repos/{owner}/{repo}/git/trees/{tree_sha}` | `E:git.tree.read.v1` | Get a tree |
| `GitHubRestClient.gitListMatchingRefs` | `GET` | `/repos/{owner}/{repo}/git/matching-refs/{ref}` | `E:git.ref.read.v1` | List matching references |
| `GitHubRestClient.gitUpdateRef` | `PATCH` | `/repos/{owner}/{repo}/git/refs/{ref}` | `P:content.write.v1` | Update a reference |

</details>

<details>
<summary><strong>gitignore</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.gitignoreGetAllTemplates` | `GET` | `/gitignore/templates` | Unmatched | Get all gitignore templates |
| `GitHubRestClient.gitignoreGetTemplate` | `GET` | `/gitignore/templates/{name}` | Unmatched | Get a gitignore template |

</details>

<details>
<summary><strong>hosted-compute</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.hostedComputeCreateNetworkConfigurationForOrg` | `POST` | `/orgs/{org}/settings/network-configurations` | Unmatched | Create a hosted compute network configuration for an organization |
| `GitHubRestClient.hostedComputeDeleteNetworkConfigurationFromOrg` | `DELETE` | `/orgs/{org}/settings/network-configurations/{network_configuration_id}` | Unmatched | Delete a hosted compute network configuration from an organization |
| `GitHubRestClient.hostedComputeGetNetworkConfigurationForOrg` | `GET` | `/orgs/{org}/settings/network-configurations/{network_configuration_id}` | Unmatched | Get a hosted compute network configuration for an organization |
| `GitHubRestClient.hostedComputeGetNetworkSettingsForOrg` | `GET` | `/orgs/{org}/settings/network-settings/{network_settings_id}` | Unmatched | Get a hosted compute network settings resource for an organization |
| `GitHubRestClient.hostedComputeListNetworkConfigurationsForOrg` | `GET` | `/orgs/{org}/settings/network-configurations` | Unmatched | List hosted compute network configurations for an organization |
| `GitHubRestClient.hostedComputeUpdateNetworkConfigurationForOrg` | `PATCH` | `/orgs/{org}/settings/network-configurations/{network_configuration_id}` | Unmatched | Update a hosted compute network configuration for an organization |

</details>

<details>
<summary><strong>interactions</strong> (16)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.interactionsGetPullRequestBypassListForRepo` | `GET` | `/repos/{owner}/{repo}/interaction-limits/pulls/bypass-list` | Unmatched | Get pull request creation cap bypass list for a repository |
| `GitHubRestClient.interactionsGetPullRequestCreationCapForOrg` | `GET` | `/orgs/{org}/interaction-limits/pulls/creation-cap` | Unmatched | Get pull request creation cap for an org |
| `GitHubRestClient.interactionsGetPullRequestCreationCapForRepo` | `GET` | `/repos/{owner}/{repo}/interaction-limits/pulls/creation-cap` | Unmatched | Get pull request creation cap for a repository |
| `GitHubRestClient.interactionsGetRestrictionsForAuthenticatedUser` | `GET` | `/user/interaction-limits` | Unmatched | Get interaction restrictions for your public repositories |
| `GitHubRestClient.interactionsGetRestrictionsForOrg` | `GET` | `/orgs/{org}/interaction-limits` | Unmatched | Get interaction restrictions for an organization |
| `GitHubRestClient.interactionsGetRestrictionsForRepo` | `GET` | `/repos/{owner}/{repo}/interaction-limits` | Unmatched | Get interaction restrictions for a repository |
| `GitHubRestClient.interactionsRemovePullRequestBypassListForRepo` | `DELETE` | `/repos/{owner}/{repo}/interaction-limits/pulls/bypass-list` | Unmatched | Remove users from the pull request creation cap bypass list for a repository |
| `GitHubRestClient.interactionsRemoveRestrictionsForAuthenticatedUser` | `DELETE` | `/user/interaction-limits` | Unmatched | Remove interaction restrictions from your public repositories |
| `GitHubRestClient.interactionsRemoveRestrictionsForOrg` | `DELETE` | `/orgs/{org}/interaction-limits` | Unmatched | Remove interaction restrictions for an organization |
| `GitHubRestClient.interactionsRemoveRestrictionsForRepo` | `DELETE` | `/repos/{owner}/{repo}/interaction-limits` | Unmatched | Remove interaction restrictions for a repository |
| `GitHubRestClient.interactionsSetPullRequestBypassListForRepo` | `PUT` | `/repos/{owner}/{repo}/interaction-limits/pulls/bypass-list` | Unmatched | Add users to the pull request creation cap bypass list for a repository |
| `GitHubRestClient.interactionsSetRestrictionsForAuthenticatedUser` | `PUT` | `/user/interaction-limits` | Unmatched | Set interaction restrictions for your public repositories |
| `GitHubRestClient.interactionsSetRestrictionsForOrg` | `PUT` | `/orgs/{org}/interaction-limits` | Unmatched | Set interaction restrictions for an organization |
| `GitHubRestClient.interactionsSetRestrictionsForRepo` | `PUT` | `/repos/{owner}/{repo}/interaction-limits` | Unmatched | Set interaction restrictions for a repository |
| `GitHubRestClient.interactionsUpdatePullRequestCreationCapForOrg` | `PATCH` | `/orgs/{org}/interaction-limits/pulls/creation-cap` | Unmatched | Update pull request creation cap for an org |
| `GitHubRestClient.interactionsUpdatePullRequestCreationCapForRepo` | `PATCH` | `/repos/{owner}/{repo}/interaction-limits/pulls/creation-cap` | Unmatched | Update pull request creation cap for a repository |

</details>

<details>
<summary><strong>issues</strong> (58)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.issuesAddAssignees` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/assignees` | Unmatched | Add assignees to an issue |
| `GitHubRestClient.issuesAddBlockedByDependency` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by` | Unmatched | Add a dependency an issue is blocked by |
| `GitHubRestClient.issuesAddIssueFieldValues` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/issue-field-values` | Unmatched | Add issue field values to an issue |
| `GitHubRestClient.issuesAddLabels` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/labels` | Unmatched | Add labels to an issue |
| `GitHubRestClient.issuesAddSubIssue` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/sub_issues` | Unmatched | Add sub-issue |
| `GitHubRestClient.issuesApproveSuggestion` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/suggestions/{suggestion_id}/approve` | Unmatched | Approve an issue suggestion |
| `GitHubRestClient.issuesCheckUserCanBeAssigned` | `GET` | `/repos/{owner}/{repo}/assignees/{assignee}` | Unmatched | Check if a user can be assigned |
| `GitHubRestClient.issuesCheckUserCanBeAssignedToIssue` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}` | Unmatched | Check if a user can be assigned to a issue |
| `GitHubRestClient.issuesCreate` | `POST` | `/repos/{owner}/{repo}/issues` | `P:issue.write.v1` | Create an issue |
| `GitHubRestClient.issuesCreateComment` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/comments` | `E:issue.comments.v1`<br>`P:pull-request.comments.v1` | Create an issue comment |
| `GitHubRestClient.issuesCreateLabel` | `POST` | `/repos/{owner}/{repo}/labels` | `E:label.catalog.v1` | Create a label |
| `GitHubRestClient.issuesCreateMilestone` | `POST` | `/repos/{owner}/{repo}/milestones` | `E:milestone.catalog.v1` | Create a milestone |
| `GitHubRestClient.issuesDeleteComment` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{comment_id}` | `E:issue.comments.v1` | Delete an issue comment |
| `GitHubRestClient.issuesDeleteIssueFieldValue` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/issue-field-values/{issue_field_id}` | Unmatched | Delete an issue field value from an issue |
| `GitHubRestClient.issuesDeleteLabel` | `DELETE` | `/repos/{owner}/{repo}/labels/{name}` | `E:label.catalog.v1` | Delete a label |
| `GitHubRestClient.issuesDeleteMilestone` | `DELETE` | `/repos/{owner}/{repo}/milestones/{milestone_number}` | `E:milestone.catalog.v1` | Delete a milestone |
| `GitHubRestClient.issuesDismissSuggestion` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/suggestions/{suggestion_id}/dismiss` | Unmatched | Dismiss an issue suggestion |
| `GitHubRestClient.issuesGet` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}` | `P:issue.read.v1` | Get an issue |
| `GitHubRestClient.issuesGetComment` | `GET` | `/repos/{owner}/{repo}/issues/comments/{comment_id}` | `E:issue.comments.v1` | Get an issue comment |
| `GitHubRestClient.issuesGetEvent` | `GET` | `/repos/{owner}/{repo}/issues/events/{event_id}` | Unmatched | Get an issue event |
| `GitHubRestClient.issuesGetLabel` | `GET` | `/repos/{owner}/{repo}/labels/{name}` | `E:label.catalog.v1` | Get a label |
| `GitHubRestClient.issuesGetMilestone` | `GET` | `/repos/{owner}/{repo}/milestones/{milestone_number}` | `E:milestone.catalog.v1` | Get a milestone |
| `GitHubRestClient.issuesGetParent` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/parent` | Unmatched | Get parent issue |
| `GitHubRestClient.issuesList` | `GET` | `/issues` | Unmatched | List issues assigned to the authenticated user |
| `GitHubRestClient.issuesListAssignees` | `GET` | `/repos/{owner}/{repo}/assignees` | Unmatched | List assignees |
| `GitHubRestClient.issuesListComments` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/comments` | `E:issue.comments.v1`<br>`P:pull-request.comments.v1` | List issue comments |
| `GitHubRestClient.issuesListCommentsForRepo` | `GET` | `/repos/{owner}/{repo}/issues/comments` | Unmatched | List issue comments for a repository |
| `GitHubRestClient.issuesListDependenciesBlockedBy` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by` | Unmatched | List dependencies an issue is blocked by |
| `GitHubRestClient.issuesListDependenciesBlocking` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking` | Unmatched | List dependencies an issue is blocking |
| `GitHubRestClient.issuesListEvents` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/events` | Unmatched | List issue events |
| `GitHubRestClient.issuesListEventsForRepo` | `GET` | `/repos/{owner}/{repo}/issues/events` | Unmatched | List issue events for a repository |
| `GitHubRestClient.issuesListEventsForTimeline` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/timeline` | Unmatched | List timeline events for an issue |
| `GitHubRestClient.issuesListForAuthenticatedUser` | `GET` | `/user/issues` | Unmatched | List user account issues assigned to the authenticated user |
| `GitHubRestClient.issuesListForOrg` | `GET` | `/orgs/{org}/issues` | Unmatched | List organization issues assigned to the authenticated user |
| `GitHubRestClient.issuesListForRepo` | `GET` | `/repos/{owner}/{repo}/issues` | `P:issue.read.v1` | List repository issues |
| `GitHubRestClient.issuesListIssueFieldValuesForIssue` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/issue-field-values` | Unmatched | List issue field values for an issue |
| `GitHubRestClient.issuesListLabelsForMilestone` | `GET` | `/repos/{owner}/{repo}/milestones/{milestone_number}/labels` | Unmatched | List labels for issues in a milestone |
| `GitHubRestClient.issuesListLabelsForRepo` | `GET` | `/repos/{owner}/{repo}/labels` | `E:label.catalog.v1` | List labels for a repository |
| `GitHubRestClient.issuesListLabelsOnIssue` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/labels` | Unmatched | List labels for an issue |
| `GitHubRestClient.issuesListMilestones` | `GET` | `/repos/{owner}/{repo}/milestones` | `E:milestone.catalog.v1` | List milestones |
| `GitHubRestClient.issuesListSubIssues` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/sub_issues` | Unmatched | List sub-issues |
| `GitHubRestClient.issuesListSuggestions` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/suggestions` | Unmatched | List issue suggestions |
| `GitHubRestClient.issuesLock` | `PUT` | `/repos/{owner}/{repo}/issues/{issue_number}/lock` | Unmatched | Lock an issue |
| `GitHubRestClient.issuesPinComment` | `PUT` | `/repos/{owner}/{repo}/issues/comments/{comment_id}/pin` | Unmatched | Pin an issue comment |
| `GitHubRestClient.issuesRemoveAllLabels` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/labels` | Unmatched | Remove all labels from an issue |
| `GitHubRestClient.issuesRemoveAssignees` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/assignees` | Unmatched | Remove assignees from an issue |
| `GitHubRestClient.issuesRemoveDependencyBlockedBy` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}` | Unmatched | Remove dependency an issue is blocked by |
| `GitHubRestClient.issuesRemoveLabel` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/labels/{name}` | Unmatched | Remove a label from an issue |
| `GitHubRestClient.issuesRemoveSubIssue` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/sub_issue` | Unmatched | Remove sub-issue |
| `GitHubRestClient.issuesReprioritizeSubIssue` | `PATCH` | `/repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority` | Unmatched | Reprioritize sub-issue |
| `GitHubRestClient.issuesSetIssueFieldValues` | `PUT` | `/repos/{owner}/{repo}/issues/{issue_number}/issue-field-values` | Unmatched | Set issue field values for an issue |
| `GitHubRestClient.issuesSetLabels` | `PUT` | `/repos/{owner}/{repo}/issues/{issue_number}/labels` | Unmatched | Set labels for an issue |
| `GitHubRestClient.issuesUnlock` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/lock` | Unmatched | Unlock an issue |
| `GitHubRestClient.issuesUnpinComment` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{comment_id}/pin` | Unmatched | Unpin an issue comment |
| `GitHubRestClient.issuesUpdate` | `PATCH` | `/repos/{owner}/{repo}/issues/{issue_number}` | `P:issue.write.v1` | Update an issue |
| `GitHubRestClient.issuesUpdateComment` | `PATCH` | `/repos/{owner}/{repo}/issues/comments/{comment_id}` | `E:issue.comments.v1` | Update an issue comment |
| `GitHubRestClient.issuesUpdateLabel` | `PATCH` | `/repos/{owner}/{repo}/labels/{name}` | `E:label.catalog.v1` | Update a label |
| `GitHubRestClient.issuesUpdateMilestone` | `PATCH` | `/repos/{owner}/{repo}/milestones/{milestone_number}` | `E:milestone.catalog.v1` | Update a milestone |

</details>

<details>
<summary><strong>licenses</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.licensesGet` | `GET` | `/licenses/{license}` | Unmatched | Get a license |
| `GitHubRestClient.licensesGetAllCommonlyUsed` | `GET` | `/licenses` | Unmatched | Get all commonly used licenses |
| `GitHubRestClient.licensesGetForRepo` | `GET` | `/repos/{owner}/{repo}/license` | Unmatched | Get the license for a repository |

</details>

<details>
<summary><strong>markdown</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.markdownRender` | `POST` | `/markdown` | Unmatched | Render a Markdown document |
| `GitHubRestClient.markdownRenderRaw` | `POST` | `/markdown/raw` | Unmatched | Render a Markdown document in raw mode |

</details>

<details>
<summary><strong>meta</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.metaGet` | `GET` | `/meta` | Unmatched | Get GitHub meta information |
| `GitHubRestClient.metaGetAllVersions` | `GET` | `/versions` | Unmatched | Get all API versions |
| `GitHubRestClient.metaGetOctocat` | `GET` | `/octocat` | Unmatched | Get Octocat |
| `GitHubRestClient.metaGetZen` | `GET` | `/zen` | Unmatched | Get the Zen of GitHub |
| `GitHubRestClient.metaRoot` | `GET` | `/` | Unmatched | GitHub API Root |

</details>

<details>
<summary><strong>migrations</strong> (22)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.migrationsCancelImport` | `DELETE` | `/repos/{owner}/{repo}/import` | Unmatched | [Deprecated] Cancel an import |
| `GitHubRestClient.migrationsDeleteArchiveForAuthenticatedUser` | `DELETE` | `/user/migrations/{migration_id}/archive` | Unmatched | Delete a user migration archive |
| `GitHubRestClient.migrationsDeleteArchiveForOrg` | `DELETE` | `/orgs/{org}/migrations/{migration_id}/archive` | Unmatched | Delete an organization migration archive |
| `GitHubRestClient.migrationsDownloadArchiveForOrg` | `GET` | `/orgs/{org}/migrations/{migration_id}/archive` | Unmatched | Download an organization migration archive |
| `GitHubRestClient.migrationsGetArchiveForAuthenticatedUser` | `GET` | `/user/migrations/{migration_id}/archive` | Unmatched | Download a user migration archive |
| `GitHubRestClient.migrationsGetCommitAuthors` | `GET` | `/repos/{owner}/{repo}/import/authors` | Unmatched | [Deprecated] Get commit authors |
| `GitHubRestClient.migrationsGetImportStatus` | `GET` | `/repos/{owner}/{repo}/import` | Unmatched | [Deprecated] Get an import status |
| `GitHubRestClient.migrationsGetLargeFiles` | `GET` | `/repos/{owner}/{repo}/import/large_files` | Unmatched | [Deprecated] Get large files |
| `GitHubRestClient.migrationsGetStatusForAuthenticatedUser` | `GET` | `/user/migrations/{migration_id}` | Unmatched | Get a user migration status |
| `GitHubRestClient.migrationsGetStatusForOrg` | `GET` | `/orgs/{org}/migrations/{migration_id}` | Unmatched | Get an organization migration status |
| `GitHubRestClient.migrationsListForAuthenticatedUser` | `GET` | `/user/migrations` | Unmatched | List user migrations |
| `GitHubRestClient.migrationsListForOrg` | `GET` | `/orgs/{org}/migrations` | Unmatched | List organization migrations |
| `GitHubRestClient.migrationsListReposForAuthenticatedUser` | `GET` | `/user/migrations/{migration_id}/repositories` | Unmatched | List repositories for a user migration |
| `GitHubRestClient.migrationsListReposForOrg` | `GET` | `/orgs/{org}/migrations/{migration_id}/repositories` | Unmatched | List repositories in an organization migration |
| `GitHubRestClient.migrationsMapCommitAuthor` | `PATCH` | `/repos/{owner}/{repo}/import/authors/{author_id}` | Unmatched | [Deprecated] Map a commit author |
| `GitHubRestClient.migrationsSetLfsPreference` | `PATCH` | `/repos/{owner}/{repo}/import/lfs` | Unmatched | [Deprecated] Update Git LFS preference |
| `GitHubRestClient.migrationsStartForAuthenticatedUser` | `POST` | `/user/migrations` | Unmatched | Start a user migration |
| `GitHubRestClient.migrationsStartForOrg` | `POST` | `/orgs/{org}/migrations` | Unmatched | Start an organization migration |
| `GitHubRestClient.migrationsStartImport` | `PUT` | `/repos/{owner}/{repo}/import` | Unmatched | [Deprecated] Start an import |
| `GitHubRestClient.migrationsUnlockRepoForAuthenticatedUser` | `DELETE` | `/user/migrations/{migration_id}/repos/{repo_name}/lock` | Unmatched | Unlock a user repository |
| `GitHubRestClient.migrationsUnlockRepoForOrg` | `DELETE` | `/orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock` | Unmatched | Unlock an organization repository |
| `GitHubRestClient.migrationsUpdateImport` | `PATCH` | `/repos/{owner}/{repo}/import` | Unmatched | [Deprecated] Update an import |

</details>

<details>
<summary><strong>oidc</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.oidcCreateOidcCustomPropertyInclusionForEnterprise` | `POST` | `/enterprises/{enterprise}/actions/oidc/customization/properties/repo` | Unmatched | Create an OIDC custom property inclusion for an enterprise |
| `GitHubRestClient.oidcCreateOidcCustomPropertyInclusionForOrg` | `POST` | `/orgs/{org}/actions/oidc/customization/properties/repo` | Unmatched | Create an OIDC custom property inclusion for an organization |
| `GitHubRestClient.oidcDeleteOidcCustomPropertyInclusionForEnterprise` | `DELETE` | `/enterprises/{enterprise}/actions/oidc/customization/properties/repo/{custom_property_name}` | Unmatched | Delete an OIDC custom property inclusion for an enterprise |
| `GitHubRestClient.oidcDeleteOidcCustomPropertyInclusionForOrg` | `DELETE` | `/orgs/{org}/actions/oidc/customization/properties/repo/{custom_property_name}` | Unmatched | Delete an OIDC custom property inclusion for an organization |
| `GitHubRestClient.oidcGetOidcCustomSubTemplateForOrg` | `GET` | `/orgs/{org}/actions/oidc/customization/sub` | Unmatched | Get the customization template for an OIDC subject claim for an organization |
| `GitHubRestClient.oidcListOidcCustomPropertyInclusionsForEnterprise` | `GET` | `/enterprises/{enterprise}/actions/oidc/customization/properties/repo` | Unmatched | List OIDC custom property inclusions for an enterprise |
| `GitHubRestClient.oidcListOidcCustomPropertyInclusionsForOrg` | `GET` | `/orgs/{org}/actions/oidc/customization/properties/repo` | Unmatched | List OIDC custom property inclusions for an organization |
| `GitHubRestClient.oidcUpdateOidcCustomSubTemplateForOrg` | `PUT` | `/orgs/{org}/actions/oidc/customization/sub` | Unmatched | Set the customization template for an OIDC subject claim for an organization |

</details>

<details>
<summary><strong>orgs</strong> (110)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.apiInsightsGetRouteStatsByActor` | `GET` | `/orgs/{org}/insights/api/route-stats/{actor_type}/{actor_id}` | Unmatched | Get route stats by actor |
| `GitHubRestClient.apiInsightsGetSubjectStats` | `GET` | `/orgs/{org}/insights/api/subject-stats` | Unmatched | Get subject stats |
| `GitHubRestClient.apiInsightsGetSummaryStats` | `GET` | `/orgs/{org}/insights/api/summary-stats` | Unmatched | Get summary stats |
| `GitHubRestClient.apiInsightsGetSummaryStatsByActor` | `GET` | `/orgs/{org}/insights/api/summary-stats/{actor_type}/{actor_id}` | Unmatched | Get summary stats by actor |
| `GitHubRestClient.apiInsightsGetSummaryStatsByUser` | `GET` | `/orgs/{org}/insights/api/summary-stats/users/{user_id}` | Unmatched | Get summary stats by user |
| `GitHubRestClient.apiInsightsGetTimeStats` | `GET` | `/orgs/{org}/insights/api/time-stats` | Unmatched | Get time stats |
| `GitHubRestClient.apiInsightsGetTimeStatsByActor` | `GET` | `/orgs/{org}/insights/api/time-stats/{actor_type}/{actor_id}` | Unmatched | Get time stats by actor |
| `GitHubRestClient.apiInsightsGetTimeStatsByUser` | `GET` | `/orgs/{org}/insights/api/time-stats/users/{user_id}` | Unmatched | Get time stats by user |
| `GitHubRestClient.apiInsightsGetUserStats` | `GET` | `/orgs/{org}/insights/api/user-stats/{user_id}` | Unmatched | Get user stats |
| `GitHubRestClient.orgsAddSecurityManagerTeam` | `PUT` | `/orgs/{org}/security-managers/teams/{team_slug}` | Unmatched | [Deprecated] Add a security manager team |
| `GitHubRestClient.orgsAssignTeamToOrgRole` | `PUT` | `/orgs/{org}/organization-roles/teams/{team_slug}/{role_id}` | Unmatched | Assign an organization role to a team |
| `GitHubRestClient.orgsAssignUserToOrgRole` | `PUT` | `/orgs/{org}/organization-roles/users/{username}/{role_id}` | Unmatched | Assign an organization role to a user |
| `GitHubRestClient.orgsBlockUser` | `PUT` | `/orgs/{org}/blocks/{username}` | Unmatched | Block a user from an organization |
| `GitHubRestClient.orgsCancelInvitation` | `DELETE` | `/orgs/{org}/invitations/{invitation_id}` | Unmatched | Cancel an organization invitation |
| `GitHubRestClient.orgsCheckBlockedUser` | `GET` | `/orgs/{org}/blocks/{username}` | Unmatched | Check if a user is blocked by an organization |
| `GitHubRestClient.orgsCheckMembershipForUser` | `GET` | `/orgs/{org}/members/{username}` | Unmatched | Check organization membership for a user |
| `GitHubRestClient.orgsCheckPublicMembershipForUser` | `GET` | `/orgs/{org}/public_members/{username}` | Unmatched | Check public organization membership for a user |
| `GitHubRestClient.orgsConvertMemberToOutsideCollaborator` | `PUT` | `/orgs/{org}/outside_collaborators/{username}` | Unmatched | Convert an organization member to outside collaborator |
| `GitHubRestClient.orgsCreateArtifactDeploymentRecord` | `POST` | `/orgs/{org}/artifacts/metadata/deployment-record` | Unmatched | Create an artifact deployment record |
| `GitHubRestClient.orgsCreateArtifactStorageRecord` | `POST` | `/orgs/{org}/artifacts/metadata/storage-record` | Unmatched | Create artifact metadata storage record |
| `GitHubRestClient.orgsCreateClusterDeploymentRecordsJob` | `POST` | `/orgs/{org}/artifacts/metadata/deployment-record/cluster/{cluster}/jobs` | Unmatched | Create a cluster deployment records job |
| `GitHubRestClient.orgsCreateInvitation` | `POST` | `/orgs/{org}/invitations` | Unmatched | Create an organization invitation |
| `GitHubRestClient.orgsCreateIssueField` | `POST` | `/orgs/{org}/issue-fields` | Unmatched | Create issue field for an organization |
| `GitHubRestClient.orgsCreateIssueType` | `POST` | `/orgs/{org}/issue-types` | Unmatched | Create issue type for an organization |
| `GitHubRestClient.orgsCreateWebhook` | `POST` | `/orgs/{org}/hooks` | Unmatched | Create an organization webhook |
| `GitHubRestClient.orgsCustomPropertiesForReposCreateOrUpdateOrganizationDefinition` | `PUT` | `/orgs/{org}/properties/schema/{custom_property_name}` | Unmatched | Create or update a custom property for an organization |
| `GitHubRestClient.orgsCustomPropertiesForReposCreateOrUpdateOrganizationDefinitions` | `PATCH` | `/orgs/{org}/properties/schema` | Unmatched | Create or update custom properties for an organization |
| `GitHubRestClient.orgsCustomPropertiesForReposCreateOrUpdateOrganizationValues` | `PATCH` | `/orgs/{org}/properties/values` | Unmatched | Create or update custom property values for organization repositories |
| `GitHubRestClient.orgsCustomPropertiesForReposDeleteOrganizationDefinition` | `DELETE` | `/orgs/{org}/properties/schema/{custom_property_name}` | Unmatched | Remove a custom property for an organization |
| `GitHubRestClient.orgsCustomPropertiesForReposGetOrganizationDefinition` | `GET` | `/orgs/{org}/properties/schema/{custom_property_name}` | Unmatched | Get a custom property for an organization |
| `GitHubRestClient.orgsCustomPropertiesForReposGetOrganizationDefinitions` | `GET` | `/orgs/{org}/properties/schema` | Unmatched | Get all custom properties for an organization |
| `GitHubRestClient.orgsCustomPropertiesForReposGetOrganizationValues` | `GET` | `/orgs/{org}/properties/values` | Unmatched | List custom property values for organization repositories |
| `GitHubRestClient.orgsDelete` | `DELETE` | `/orgs/{org}` | Unmatched | Delete an organization |
| `GitHubRestClient.orgsDeleteAttestationsBulk` | `POST` | `/orgs/{org}/attestations/delete-request` | Unmatched | Delete attestations in bulk |
| `GitHubRestClient.orgsDeleteAttestationsById` | `DELETE` | `/orgs/{org}/attestations/{attestation_id}` | Unmatched | Delete attestations by ID |
| `GitHubRestClient.orgsDeleteAttestationsBySubjectDigest` | `DELETE` | `/orgs/{org}/attestations/digest/{subject_digest}` | Unmatched | Delete attestations by subject digest |
| `GitHubRestClient.orgsDeleteIssueField` | `DELETE` | `/orgs/{org}/issue-fields/{issue_field_id}` | Unmatched | Delete issue field for an organization |
| `GitHubRestClient.orgsDeleteIssueType` | `DELETE` | `/orgs/{org}/issue-types/{issue_type_id}` | Unmatched | Delete issue type for an organization |
| `GitHubRestClient.orgsDeleteWebhook` | `DELETE` | `/orgs/{org}/hooks/{hook_id}` | Unmatched | Delete an organization webhook |
| `GitHubRestClient.orgsDisableSelectedRepositoryImmutableReleasesOrganization` | `DELETE` | `/orgs/{org}/settings/immutable-releases/repositories/{repository_id}` | Unmatched | Disable a selected repository for immutable releases in an organization |
| `GitHubRestClient.orgsEnableOrDisableSecurityProductOnAllOrgRepos` | `POST` | `/orgs/{org}/{security_product}/{enablement}` | Unmatched | [Deprecated] Enable or disable a security feature for an organization |
| `GitHubRestClient.orgsEnableSelectedRepositoryImmutableReleasesOrganization` | `PUT` | `/orgs/{org}/settings/immutable-releases/repositories/{repository_id}` | Unmatched | Enable a selected repository for immutable releases in an organization |
| `GitHubRestClient.orgsGet` | `GET` | `/orgs/{org}` | `E:namespace.read.v1` | Get an organization |
| `GitHubRestClient.orgsGetClusterDeploymentRecordsJob` | `GET` | `/orgs/{org}/artifacts/metadata/deployment-record/cluster/{cluster}/jobs/{job_id}` | Unmatched | Get cluster deployment records job status |
| `GitHubRestClient.orgsGetImmutableReleasesSettings` | `GET` | `/orgs/{org}/settings/immutable-releases` | Unmatched | Get immutable releases settings for an organization |
| `GitHubRestClient.orgsGetImmutableReleasesSettingsRepositories` | `GET` | `/orgs/{org}/settings/immutable-releases/repositories` | Unmatched | List selected repositories for immutable releases enforcement |
| `GitHubRestClient.orgsGetMembershipForAuthenticatedUser` | `GET` | `/user/memberships/orgs/{org}` | Unmatched | Get an organization membership for the authenticated user |
| `GitHubRestClient.orgsGetMembershipForUser` | `GET` | `/orgs/{org}/memberships/{username}` | Unmatched | Get organization membership for a user |
| `GitHubRestClient.orgsGetOrgRole` | `GET` | `/orgs/{org}/organization-roles/{role_id}` | Unmatched | Get an organization role |
| `GitHubRestClient.orgsGetOrgRulesetHistory` | `GET` | `/orgs/{org}/rulesets/{ruleset_id}/history` | Unmatched | Get organization ruleset history |
| `GitHubRestClient.orgsGetOrgRulesetVersion` | `GET` | `/orgs/{org}/rulesets/{ruleset_id}/history/{version_id}` | Unmatched | Get organization ruleset version |
| `GitHubRestClient.orgsGetWebhook` | `GET` | `/orgs/{org}/hooks/{hook_id}` | Unmatched | Get an organization webhook |
| `GitHubRestClient.orgsGetWebhookConfigForOrg` | `GET` | `/orgs/{org}/hooks/{hook_id}/config` | Unmatched | Get a webhook configuration for an organization |
| `GitHubRestClient.orgsGetWebhookDelivery` | `GET` | `/orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}` | Unmatched | Get a webhook delivery for an organization webhook |
| `GitHubRestClient.orgsList` | `GET` | `/organizations` | `E:namespace.read.v1` | List organizations |
| `GitHubRestClient.orgsListAppInstallations` | `GET` | `/orgs/{org}/installations` | Unmatched | List app installations for an organization |
| `GitHubRestClient.orgsListArtifactDeploymentRecords` | `GET` | `/orgs/{org}/artifacts/{subject_digest}/metadata/deployment-records` | Unmatched | List artifact deployment records |
| `GitHubRestClient.orgsListArtifactStorageRecords` | `GET` | `/orgs/{org}/artifacts/{subject_digest}/metadata/storage-records` | Unmatched | List artifact storage records |
| `GitHubRestClient.orgsListAttestationRepositories` | `GET` | `/orgs/{org}/attestations/repositories` | Unmatched | List attestation repositories |
| `GitHubRestClient.orgsListAttestations` | `GET` | `/orgs/{org}/attestations/{subject_digest}` | Unmatched | List attestations |
| `GitHubRestClient.orgsListAttestationsBulk` | `POST` | `/orgs/{org}/attestations/bulk-list` | Unmatched | List attestations by bulk subject digests |
| `GitHubRestClient.orgsListBlockedUsers` | `GET` | `/orgs/{org}/blocks` | Unmatched | List users blocked by an organization |
| `GitHubRestClient.orgsListFailedInvitations` | `GET` | `/orgs/{org}/failed_invitations` | Unmatched | List failed organization invitations |
| `GitHubRestClient.orgsListForAuthenticatedUser` | `GET` | `/user/orgs` | Unmatched | List organizations for the authenticated user |
| `GitHubRestClient.orgsListForUser` | `GET` | `/users/{username}/orgs` | Unmatched | List organizations for a user |
| `GitHubRestClient.orgsListInvitationTeams` | `GET` | `/orgs/{org}/invitations/{invitation_id}/teams` | Unmatched | List organization invitation teams |
| `GitHubRestClient.orgsListIssueFields` | `GET` | `/orgs/{org}/issue-fields` | Unmatched | List issue fields for an organization |
| `GitHubRestClient.orgsListIssueTypes` | `GET` | `/orgs/{org}/issue-types` | Unmatched | List issue types for an organization |
| `GitHubRestClient.orgsListMembers` | `GET` | `/orgs/{org}/members` | `E:namespace.members.read.v1` | List organization members |
| `GitHubRestClient.orgsListMembershipsForAuthenticatedUser` | `GET` | `/user/memberships/orgs` | Unmatched | List organization memberships for the authenticated user |
| `GitHubRestClient.orgsListOrgRoleTeams` | `GET` | `/orgs/{org}/organization-roles/{role_id}/teams` | Unmatched | List teams that are assigned to an organization role |
| `GitHubRestClient.orgsListOrgRoleUsers` | `GET` | `/orgs/{org}/organization-roles/{role_id}/users` | Unmatched | List users that are assigned to an organization role |
| `GitHubRestClient.orgsListOrgRoles` | `GET` | `/orgs/{org}/organization-roles` | Unmatched | Get all organization roles for an organization |
| `GitHubRestClient.orgsListOutsideCollaborators` | `GET` | `/orgs/{org}/outside_collaborators` | `E:namespace.members.read.v1` | List outside collaborators for an organization |
| `GitHubRestClient.orgsListPatGrantRepositories` | `GET` | `/orgs/{org}/personal-access-tokens/{pat_id}/repositories` | Unmatched | List repositories a fine-grained personal access token has access to |
| `GitHubRestClient.orgsListPatGrantRequestRepositories` | `GET` | `/orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories` | Unmatched | List repositories requested to be accessed by a fine-grained personal access token |
| `GitHubRestClient.orgsListPatGrantRequests` | `GET` | `/orgs/{org}/personal-access-token-requests` | Unmatched | List requests to access organization resources with fine-grained personal access tokens |
| `GitHubRestClient.orgsListPatGrants` | `GET` | `/orgs/{org}/personal-access-tokens` | Unmatched | List fine-grained personal access tokens with access to organization resources |
| `GitHubRestClient.orgsListPendingInvitations` | `GET` | `/orgs/{org}/invitations` | Unmatched | List pending organization invitations |
| `GitHubRestClient.orgsListPublicMembers` | `GET` | `/orgs/{org}/public_members` | Unmatched | List public organization members |
| `GitHubRestClient.orgsListSecurityManagerTeams` | `GET` | `/orgs/{org}/security-managers` | Unmatched | [Deprecated] List security manager teams |
| `GitHubRestClient.orgsListWebhookDeliveries` | `GET` | `/orgs/{org}/hooks/{hook_id}/deliveries` | Unmatched | List deliveries for an organization webhook |
| `GitHubRestClient.orgsListWebhooks` | `GET` | `/orgs/{org}/hooks` | Unmatched | List organization webhooks |
| `GitHubRestClient.orgsPingWebhook` | `POST` | `/orgs/{org}/hooks/{hook_id}/pings` | Unmatched | Ping an organization webhook |
| `GitHubRestClient.orgsRedeliverWebhookDelivery` | `POST` | `/orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts` | Unmatched | Redeliver a delivery for an organization webhook |
| `GitHubRestClient.orgsRemoveMember` | `DELETE` | `/orgs/{org}/members/{username}` | Unmatched | Remove an organization member |
| `GitHubRestClient.orgsRemoveMembershipForUser` | `DELETE` | `/orgs/{org}/memberships/{username}` | Unmatched | Remove organization membership for a user |
| `GitHubRestClient.orgsRemoveOutsideCollaborator` | `DELETE` | `/orgs/{org}/outside_collaborators/{username}` | Unmatched | Remove outside collaborator from an organization |
| `GitHubRestClient.orgsRemovePublicMembershipForAuthenticatedUser` | `DELETE` | `/orgs/{org}/public_members/{username}` | Unmatched | Remove public organization membership for the authenticated user |
| `GitHubRestClient.orgsRemoveSecurityManagerTeam` | `DELETE` | `/orgs/{org}/security-managers/teams/{team_slug}` | Unmatched | [Deprecated] Remove a security manager team |
| `GitHubRestClient.orgsReviewPatGrantRequest` | `POST` | `/orgs/{org}/personal-access-token-requests/{pat_request_id}` | Unmatched | Review a request to access organization resources with a fine-grained personal access token |
| `GitHubRestClient.orgsReviewPatGrantRequestsInBulk` | `POST` | `/orgs/{org}/personal-access-token-requests` | Unmatched | Review requests to access organization resources with fine-grained personal access tokens |
| `GitHubRestClient.orgsRevokeAllOrgRolesTeam` | `DELETE` | `/orgs/{org}/organization-roles/teams/{team_slug}` | Unmatched | Remove all organization roles for a team |
| `GitHubRestClient.orgsRevokeAllOrgRolesUser` | `DELETE` | `/orgs/{org}/organization-roles/users/{username}` | Unmatched | Remove all organization roles for a user |
| `GitHubRestClient.orgsRevokeOrgRoleTeam` | `DELETE` | `/orgs/{org}/organization-roles/teams/{team_slug}/{role_id}` | Unmatched | Remove an organization role from a team |
| `GitHubRestClient.orgsRevokeOrgRoleUser` | `DELETE` | `/orgs/{org}/organization-roles/users/{username}/{role_id}` | Unmatched | Remove an organization role from a user |
| `GitHubRestClient.orgsSetClusterDeploymentRecords` | `POST` | `/orgs/{org}/artifacts/metadata/deployment-record/cluster/{cluster}` | Unmatched | Set cluster deployment records |
| `GitHubRestClient.orgsSetImmutableReleasesSettings` | `PUT` | `/orgs/{org}/settings/immutable-releases` | Unmatched | Set immutable releases settings for an organization |
| `GitHubRestClient.orgsSetImmutableReleasesSettingsRepositories` | `PUT` | `/orgs/{org}/settings/immutable-releases/repositories` | Unmatched | Set selected repositories for immutable releases enforcement |
| `GitHubRestClient.orgsSetMembershipForUser` | `PUT` | `/orgs/{org}/memberships/{username}` | Unmatched | Set organization membership for a user |
| `GitHubRestClient.orgsSetPublicMembershipForAuthenticatedUser` | `PUT` | `/orgs/{org}/public_members/{username}` | Unmatched | Set public organization membership for the authenticated user |
| `GitHubRestClient.orgsUnblockUser` | `DELETE` | `/orgs/{org}/blocks/{username}` | Unmatched | Unblock a user from an organization |
| `GitHubRestClient.orgsUpdate` | `PATCH` | `/orgs/{org}` | Unmatched | Update an organization |
| `GitHubRestClient.orgsUpdateIssueField` | `PATCH` | `/orgs/{org}/issue-fields/{issue_field_id}` | Unmatched | Update issue field for an organization |
| `GitHubRestClient.orgsUpdateIssueType` | `PUT` | `/orgs/{org}/issue-types/{issue_type_id}` | Unmatched | Update issue type for an organization |
| `GitHubRestClient.orgsUpdateMembershipForAuthenticatedUser` | `PATCH` | `/user/memberships/orgs/{org}` | Unmatched | Update an organization membership for the authenticated user |
| `GitHubRestClient.orgsUpdatePatAccess` | `POST` | `/orgs/{org}/personal-access-tokens/{pat_id}` | Unmatched | Update the access a fine-grained personal access token has to organization resources |
| `GitHubRestClient.orgsUpdatePatAccesses` | `POST` | `/orgs/{org}/personal-access-tokens` | Unmatched | Update the access to organization resources via fine-grained personal access tokens |
| `GitHubRestClient.orgsUpdateWebhook` | `PATCH` | `/orgs/{org}/hooks/{hook_id}` | Unmatched | Update an organization webhook |
| `GitHubRestClient.orgsUpdateWebhookConfigForOrg` | `PATCH` | `/orgs/{org}/hooks/{hook_id}/config` | Unmatched | Update a webhook configuration for an organization |

</details>

<details>
<summary><strong>packages</strong> (27)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.packagesDeletePackageForAuthenticatedUser` | `DELETE` | `/user/packages/{package_type}/{package_name}` | Unmatched | Delete a package for the authenticated user |
| `GitHubRestClient.packagesDeletePackageForOrg` | `DELETE` | `/orgs/{org}/packages/{package_type}/{package_name}` | Unmatched | Delete a package for an organization |
| `GitHubRestClient.packagesDeletePackageForUser` | `DELETE` | `/users/{username}/packages/{package_type}/{package_name}` | Unmatched | Delete a package for a user |
| `GitHubRestClient.packagesDeletePackageVersionForAuthenticatedUser` | `DELETE` | `/user/packages/{package_type}/{package_name}/versions/{package_version_id}` | Unmatched | Delete a package version for the authenticated user |
| `GitHubRestClient.packagesDeletePackageVersionForOrg` | `DELETE` | `/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}` | `P:packages.metadata.v1` | Delete package version for an organization |
| `GitHubRestClient.packagesDeletePackageVersionForUser` | `DELETE` | `/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}` | Unmatched | Delete package version for a user |
| `GitHubRestClient.packagesGetAllPackageVersionsForPackageOwnedByAuthenticatedUser` | `GET` | `/user/packages/{package_type}/{package_name}/versions` | Unmatched | List package versions for a package owned by the authenticated user |
| `GitHubRestClient.packagesGetAllPackageVersionsForPackageOwnedByOrg` | `GET` | `/orgs/{org}/packages/{package_type}/{package_name}/versions` | `P:packages.metadata.v1` | List package versions for a package owned by an organization |
| `GitHubRestClient.packagesGetAllPackageVersionsForPackageOwnedByUser` | `GET` | `/users/{username}/packages/{package_type}/{package_name}/versions` | Unmatched | List package versions for a package owned by a user |
| `GitHubRestClient.packagesGetPackageForAuthenticatedUser` | `GET` | `/user/packages/{package_type}/{package_name}` | Unmatched | Get a package for the authenticated user |
| `GitHubRestClient.packagesGetPackageForOrganization` | `GET` | `/orgs/{org}/packages/{package_type}/{package_name}` | Unmatched | Get a package for an organization |
| `GitHubRestClient.packagesGetPackageForUser` | `GET` | `/users/{username}/packages/{package_type}/{package_name}` | Unmatched | Get a package for a user |
| `GitHubRestClient.packagesGetPackageVersionForAuthenticatedUser` | `GET` | `/user/packages/{package_type}/{package_name}/versions/{package_version_id}` | Unmatched | Get a package version for the authenticated user |
| `GitHubRestClient.packagesGetPackageVersionForOrganization` | `GET` | `/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}` | Unmatched | Get a package version for an organization |
| `GitHubRestClient.packagesGetPackageVersionForUser` | `GET` | `/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}` | Unmatched | Get a package version for a user |
| `GitHubRestClient.packagesListDockerMigrationConflictingPackagesForAuthenticatedUser` | `GET` | `/user/docker/conflicts` | Unmatched | Get list of conflicting packages during Docker migration for authenticated-user |
| `GitHubRestClient.packagesListDockerMigrationConflictingPackagesForOrganization` | `GET` | `/orgs/{org}/docker/conflicts` | Unmatched | Get list of conflicting packages during Docker migration for organization |
| `GitHubRestClient.packagesListDockerMigrationConflictingPackagesForUser` | `GET` | `/users/{username}/docker/conflicts` | Unmatched | Get list of conflicting packages during Docker migration for user |
| `GitHubRestClient.packagesListPackagesForAuthenticatedUser` | `GET` | `/user/packages` | Unmatched | List packages for the authenticated user's namespace |
| `GitHubRestClient.packagesListPackagesForOrganization` | `GET` | `/orgs/{org}/packages` | `P:packages.metadata.v1` | List packages for an organization |
| `GitHubRestClient.packagesListPackagesForUser` | `GET` | `/users/{username}/packages` | Unmatched | List packages for a user |
| `GitHubRestClient.packagesRestorePackageForAuthenticatedUser` | `POST` | `/user/packages/{package_type}/{package_name}/restore` | Unmatched | Restore a package for the authenticated user |
| `GitHubRestClient.packagesRestorePackageForOrg` | `POST` | `/orgs/{org}/packages/{package_type}/{package_name}/restore` | Unmatched | Restore a package for an organization |
| `GitHubRestClient.packagesRestorePackageForUser` | `POST` | `/users/{username}/packages/{package_type}/{package_name}/restore` | Unmatched | Restore a package for a user |
| `GitHubRestClient.packagesRestorePackageVersionForAuthenticatedUser` | `POST` | `/user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore` | Unmatched | Restore a package version for the authenticated user |
| `GitHubRestClient.packagesRestorePackageVersionForOrg` | `POST` | `/orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore` | `P:packages.metadata.v1` | Restore package version for an organization |
| `GitHubRestClient.packagesRestorePackageVersionForUser` | `POST` | `/users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore` | Unmatched | Restore package version for a user |

</details>

<details>
<summary><strong>private-registries</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.privateRegistriesCreateOrgPrivateRegistry` | `POST` | `/orgs/{org}/private-registries` | Unmatched | Create a private registry for an organization |
| `GitHubRestClient.privateRegistriesDeleteOrgPrivateRegistry` | `DELETE` | `/orgs/{org}/private-registries/{secret_name}` | Unmatched | Delete a private registry for an organization |
| `GitHubRestClient.privateRegistriesGetOrgPrivateRegistry` | `GET` | `/orgs/{org}/private-registries/{secret_name}` | Unmatched | Get a private registry for an organization |
| `GitHubRestClient.privateRegistriesGetOrgPublicKey` | `GET` | `/orgs/{org}/private-registries/public-key` | Unmatched | Get private registries public key for an organization |
| `GitHubRestClient.privateRegistriesListOrgPrivateRegistries` | `GET` | `/orgs/{org}/private-registries` | Unmatched | List private registries for an organization |
| `GitHubRestClient.privateRegistriesUpdateOrgPrivateRegistry` | `PATCH` | `/orgs/{org}/private-registries/{secret_name}` | Unmatched | Update a private registry for an organization |

</details>

<details>
<summary><strong>projects</strong> (26)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.projectsAddFieldForOrg` | `POST` | `/orgs/{org}/projectsV2/{project_number}/fields` | Unmatched | Add a field to an organization-owned project. |
| `GitHubRestClient.projectsAddFieldForUser` | `POST` | `/users/{username}/projectsV2/{project_number}/fields` | Unmatched | Add field to user owned project |
| `GitHubRestClient.projectsAddItemForOrg` | `POST` | `/orgs/{org}/projectsV2/{project_number}/items` | Unmatched | Add item to organization owned project |
| `GitHubRestClient.projectsAddItemForUser` | `POST` | `/users/{username}/projectsV2/{project_number}/items` | Unmatched | Add item to user owned project |
| `GitHubRestClient.projectsCreateDraftItemForAuthenticatedUser` | `POST` | `/user/{user_id}/projectsV2/{project_number}/drafts` | Unmatched | Create draft item for user owned project |
| `GitHubRestClient.projectsCreateDraftItemForOrg` | `POST` | `/orgs/{org}/projectsV2/{project_number}/drafts` | Unmatched | Create draft item for organization owned project |
| `GitHubRestClient.projectsCreateViewForOrg` | `POST` | `/orgs/{org}/projectsV2/{project_number}/views` | Unmatched | Create a view for an organization-owned project |
| `GitHubRestClient.projectsCreateViewForUser` | `POST` | `/users/{user_id}/projectsV2/{project_number}/views` | Unmatched | Create a view for a user-owned project |
| `GitHubRestClient.projectsDeleteItemForOrg` | `DELETE` | `/orgs/{org}/projectsV2/{project_number}/items/{item_id}` | Unmatched | Delete project item for organization |
| `GitHubRestClient.projectsDeleteItemForUser` | `DELETE` | `/users/{username}/projectsV2/{project_number}/items/{item_id}` | Unmatched | Delete project item for user |
| `GitHubRestClient.projectsGetFieldForOrg` | `GET` | `/orgs/{org}/projectsV2/{project_number}/fields/{field_id}` | Unmatched | Get project field for organization |
| `GitHubRestClient.projectsGetFieldForUser` | `GET` | `/users/{username}/projectsV2/{project_number}/fields/{field_id}` | Unmatched | Get project field for user |
| `GitHubRestClient.projectsGetForOrg` | `GET` | `/orgs/{org}/projectsV2/{project_number}` | Unmatched | Get project for organization |
| `GitHubRestClient.projectsGetForUser` | `GET` | `/users/{username}/projectsV2/{project_number}` | Unmatched | Get project for user |
| `GitHubRestClient.projectsGetOrgItem` | `GET` | `/orgs/{org}/projectsV2/{project_number}/items/{item_id}` | Unmatched | Get an item for an organization owned project |
| `GitHubRestClient.projectsGetUserItem` | `GET` | `/users/{username}/projectsV2/{project_number}/items/{item_id}` | Unmatched | Get an item for a user owned project |
| `GitHubRestClient.projectsListFieldsForOrg` | `GET` | `/orgs/{org}/projectsV2/{project_number}/fields` | Unmatched | List project fields for organization |
| `GitHubRestClient.projectsListFieldsForUser` | `GET` | `/users/{username}/projectsV2/{project_number}/fields` | Unmatched | List project fields for user |
| `GitHubRestClient.projectsListForOrg` | `GET` | `/orgs/{org}/projectsV2` | Unmatched | List projects for organization |
| `GitHubRestClient.projectsListForUser` | `GET` | `/users/{username}/projectsV2` | Unmatched | List projects for user |
| `GitHubRestClient.projectsListItemsForOrg` | `GET` | `/orgs/{org}/projectsV2/{project_number}/items` | Unmatched | List items for an organization owned project |
| `GitHubRestClient.projectsListItemsForUser` | `GET` | `/users/{username}/projectsV2/{project_number}/items` | Unmatched | List items for a user owned project |
| `GitHubRestClient.projectsListViewItemsForOrg` | `GET` | `/orgs/{org}/projectsV2/{project_number}/views/{view_number}/items` | Unmatched | List items for an organization project view |
| `GitHubRestClient.projectsListViewItemsForUser` | `GET` | `/users/{username}/projectsV2/{project_number}/views/{view_number}/items` | Unmatched | List items for a user project view |
| `GitHubRestClient.projectsUpdateItemForOrg` | `PATCH` | `/orgs/{org}/projectsV2/{project_number}/items/{item_id}` | Unmatched | Update project item for organization |
| `GitHubRestClient.projectsUpdateItemForUser` | `PATCH` | `/users/{username}/projectsV2/{project_number}/items/{item_id}` | Unmatched | Update project item for user |

</details>

<details>
<summary><strong>pulls</strong> (34)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.pullRequestStacksAdd` | `POST` | `/repos/{owner}/{repo}/stacks/{stack_number}/add` | Unmatched | Add pull requests to a pull request stack |
| `GitHubRestClient.pullRequestStacksCreate` | `POST` | `/repos/{owner}/{repo}/stacks` | Unmatched | Create a pull request stack |
| `GitHubRestClient.pullRequestStacksGet` | `GET` | `/repos/{owner}/{repo}/stacks/{stack_number}` | Unmatched | Get a pull request stack |
| `GitHubRestClient.pullRequestStacksList` | `GET` | `/repos/{owner}/{repo}/stacks` | Unmatched | List pull request stacks |
| `GitHubRestClient.pullRequestStacksUnstack` | `POST` | `/repos/{owner}/{repo}/stacks/{stack_number}/unstack` | Unmatched | Remove pull requests from a pull request stack |
| `GitHubRestClient.pullsCheckIfMerged` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/merge` | Unmatched | Check if a pull request has been merged |
| `GitHubRestClient.pullsCreate` | `POST` | `/repos/{owner}/{repo}/pulls` | `E:pull-request.core.v1` | Create a pull request |
| `GitHubRestClient.pullsCreateReplyForReviewComment` | `POST` | `/repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies` | Unmatched | Create a reply for a review comment |
| `GitHubRestClient.pullsCreateReview` | `POST` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews` | `E:pull-request.review.v1` | Create a review for a pull request |
| `GitHubRestClient.pullsCreateReviewComment` | `POST` | `/repos/{owner}/{repo}/pulls/{pull_number}/comments` | `P:pull-request.comments.v1` | Create a review comment for a pull request |
| `GitHubRestClient.pullsDeletePendingReview` | `DELETE` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}` | Unmatched | Delete a pending review for a pull request |
| `GitHubRestClient.pullsDeleteReviewComment` | `DELETE` | `/repos/{owner}/{repo}/pulls/comments/{comment_id}` | Unmatched | Delete a review comment for a pull request |
| `GitHubRestClient.pullsDismissReview` | `PUT` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals` | `E:pull-request.review.v1` | Dismiss a review for a pull request |
| `GitHubRestClient.pullsGet` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}` | `E:pull-request.core.v1` | Get a pull request |
| `GitHubRestClient.pullsGetMergeAsyncResult` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/merge-async/{uuid}` | Unmatched | Get the result of an asynchronous merge |
| `GitHubRestClient.pullsGetReview` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}` | `E:pull-request.review.v1` | Get a review for a pull request |
| `GitHubRestClient.pullsGetReviewComment` | `GET` | `/repos/{owner}/{repo}/pulls/comments/{comment_id}` | Unmatched | Get a review comment for a pull request |
| `GitHubRestClient.pullsList` | `GET` | `/repos/{owner}/{repo}/pulls` | `E:pull-request.core.v1` | List pull requests |
| `GitHubRestClient.pullsListCommentsForReview` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments` | Unmatched | List comments for a pull request review |
| `GitHubRestClient.pullsListCommits` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/commits` | `E:pull-request.changes.v1` | List commits on a pull request |
| `GitHubRestClient.pullsListFiles` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/files` | `E:pull-request.changes.v1` | List pull requests files |
| `GitHubRestClient.pullsListRequestedReviewers` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers` | `E:pull-request.reviewers.v1` | Get all requested reviewers for a pull request |
| `GitHubRestClient.pullsListReviewComments` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/comments` | `P:pull-request.comments.v1` | List review comments on a pull request |
| `GitHubRestClient.pullsListReviewCommentsForRepo` | `GET` | `/repos/{owner}/{repo}/pulls/comments` | Unmatched | List review comments in a repository |
| `GitHubRestClient.pullsListReviews` | `GET` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews` | `E:pull-request.review.v1` | List reviews for a pull request |
| `GitHubRestClient.pullsMerge` | `PUT` | `/repos/{owner}/{repo}/pulls/{pull_number}/merge` | `E:pull-request.merge.v1` | Merge a pull request |
| `GitHubRestClient.pullsMergeAsync` | `PUT` | `/repos/{owner}/{repo}/pulls/{pull_number}/merge-async` | `E:pull-request.merge.v1` | Merge a pull request asynchronously |
| `GitHubRestClient.pullsRemoveRequestedReviewers` | `DELETE` | `/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers` | `E:pull-request.reviewers.v1` | Remove requested reviewers from a pull request |
| `GitHubRestClient.pullsRequestReviewers` | `POST` | `/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers` | `E:pull-request.reviewers.v1` | Request reviewers for a pull request |
| `GitHubRestClient.pullsSubmitReview` | `POST` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events` | `E:pull-request.review.v1` | Submit a review for a pull request |
| `GitHubRestClient.pullsUpdate` | `PATCH` | `/repos/{owner}/{repo}/pulls/{pull_number}` | `E:pull-request.core.v1` | Update a pull request |
| `GitHubRestClient.pullsUpdateBranch` | `PUT` | `/repos/{owner}/{repo}/pulls/{pull_number}/update-branch` | Unmatched | Update a pull request branch |
| `GitHubRestClient.pullsUpdateReview` | `PUT` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}` | Unmatched | Update a review for a pull request |
| `GitHubRestClient.pullsUpdateReviewComment` | `PATCH` | `/repos/{owner}/{repo}/pulls/comments/{comment_id}` | Unmatched | Update a review comment for a pull request |

</details>

<details>
<summary><strong>rate-limit</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.rateLimitGet` | `GET` | `/rate_limit` | Unmatched | Get rate limit status for the authenticated user |

</details>

<details>
<summary><strong>reactions</strong> (15)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.reactionsCreateForCommitComment` | `POST` | `/repos/{owner}/{repo}/comments/{comment_id}/reactions` | Unmatched | Create reaction for a commit comment |
| `GitHubRestClient.reactionsCreateForIssue` | `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/reactions` | Unmatched | Create reaction for an issue |
| `GitHubRestClient.reactionsCreateForIssueComment` | `POST` | `/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions` | Unmatched | Create reaction for an issue comment |
| `GitHubRestClient.reactionsCreateForPullRequestReviewComment` | `POST` | `/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions` | Unmatched | Create reaction for a pull request review comment |
| `GitHubRestClient.reactionsCreateForRelease` | `POST` | `/repos/{owner}/{repo}/releases/{release_id}/reactions` | Unmatched | Create reaction for a release |
| `GitHubRestClient.reactionsDeleteForCommitComment` | `DELETE` | `/repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}` | Unmatched | Delete a commit comment reaction |
| `GitHubRestClient.reactionsDeleteForIssue` | `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}` | Unmatched | Delete an issue reaction |
| `GitHubRestClient.reactionsDeleteForIssueComment` | `DELETE` | `/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}` | Unmatched | Delete an issue comment reaction |
| `GitHubRestClient.reactionsDeleteForPullRequestComment` | `DELETE` | `/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}` | Unmatched | Delete a pull request comment reaction |
| `GitHubRestClient.reactionsDeleteForRelease` | `DELETE` | `/repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}` | Unmatched | Delete a release reaction |
| `GitHubRestClient.reactionsListForCommitComment` | `GET` | `/repos/{owner}/{repo}/comments/{comment_id}/reactions` | Unmatched | List reactions for a commit comment |
| `GitHubRestClient.reactionsListForIssue` | `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/reactions` | Unmatched | List reactions for an issue |
| `GitHubRestClient.reactionsListForIssueComment` | `GET` | `/repos/{owner}/{repo}/issues/comments/{comment_id}/reactions` | Unmatched | List reactions for an issue comment |
| `GitHubRestClient.reactionsListForPullRequestReviewComment` | `GET` | `/repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions` | Unmatched | List reactions for a pull request review comment |
| `GitHubRestClient.reactionsListForRelease` | `GET` | `/repos/{owner}/{repo}/releases/{release_id}/reactions` | Unmatched | List reactions for a release |

</details>

<details>
<summary><strong>repos</strong> (203)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.reposAcceptInvitationForAuthenticatedUser` | `PATCH` | `/user/repository_invitations/{invitation_id}` | Unmatched | Accept a repository invitation |
| `GitHubRestClient.reposAddAppAccessRestrictions` | `POST` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps` | Unmatched | Add app access restrictions |
| `GitHubRestClient.reposAddCollaborator` | `PUT` | `/repos/{owner}/{repo}/collaborators/{username}` | Unmatched | Add a repository collaborator |
| `GitHubRestClient.reposAddStatusCheckContexts` | `POST` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts` | Unmatched | Add status check contexts |
| `GitHubRestClient.reposAddTeamAccessRestrictions` | `POST` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams` | Unmatched | Add team access restrictions |
| `GitHubRestClient.reposAddUserAccessRestrictions` | `POST` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users` | Unmatched | Add user access restrictions |
| `GitHubRestClient.reposCancelPagesDeployment` | `POST` | `/repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel` | Unmatched | Cancel a GitHub Pages deployment |
| `GitHubRestClient.reposCheckAutomatedSecurityFixes` | `GET` | `/repos/{owner}/{repo}/automated-security-fixes` | Unmatched | Check if Dependabot security updates are enabled for a repository |
| `GitHubRestClient.reposCheckCollaborator` | `GET` | `/repos/{owner}/{repo}/collaborators/{username}` | `E:collaborator.read.v1` | Check if a user is a repository collaborator |
| `GitHubRestClient.reposCheckImmutableReleases` | `GET` | `/repos/{owner}/{repo}/immutable-releases` | Unmatched | Check if immutable releases are enabled for a repository |
| `GitHubRestClient.reposCheckPrivateVulnerabilityReporting` | `GET` | `/repos/{owner}/{repo}/private-vulnerability-reporting` | Unmatched | Check if private vulnerability reporting is enabled for a repository |
| `GitHubRestClient.reposCheckVulnerabilityAlerts` | `GET` | `/repos/{owner}/{repo}/vulnerability-alerts` | Unmatched | Check if vulnerability alerts are enabled for a repository |
| `GitHubRestClient.reposCodeownersErrors` | `GET` | `/repos/{owner}/{repo}/codeowners/errors` | Unmatched | List CODEOWNERS errors |
| `GitHubRestClient.reposCompareCommits` | `GET` | `/repos/{owner}/{repo}/compare/{basehead}` | `E:commit.compare.v1` | Compare two commits |
| `GitHubRestClient.reposCreateAttestation` | `POST` | `/repos/{owner}/{repo}/attestations` | Unmatched | Create an attestation |
| `GitHubRestClient.reposCreateAutolink` | `POST` | `/repos/{owner}/{repo}/autolinks` | Unmatched | Create an autolink reference for a repository |
| `GitHubRestClient.reposCreateCommitComment` | `POST` | `/repos/{owner}/{repo}/commits/{commit_sha}/comments` | Unmatched | Create a commit comment |
| `GitHubRestClient.reposCreateCommitSignatureProtection` | `POST` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures` | Unmatched | Create commit signature protection |
| `GitHubRestClient.reposCreateCommitStatus` | `POST` | `/repos/{owner}/{repo}/statuses/{sha}` | `E:commit-status.v1` | Create a commit status |
| `GitHubRestClient.reposCreateDeployKey` | `POST` | `/repos/{owner}/{repo}/keys` | `E:deploy-key.crud.v1` | Create a deploy key |
| `GitHubRestClient.reposCreateDeployment` | `POST` | `/repos/{owner}/{repo}/deployments` | `P:deployment.environment.v1` | Create a deployment |
| `GitHubRestClient.reposCreateDeploymentBranchPolicy` | `POST` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies` | Unmatched | Create a deployment branch policy |
| `GitHubRestClient.reposCreateDeploymentProtectionRule` | `POST` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules` | Unmatched | Create a custom deployment protection rule on an environment |
| `GitHubRestClient.reposCreateDeploymentStatus` | `POST` | `/repos/{owner}/{repo}/deployments/{deployment_id}/statuses` | `P:deployment.environment.v1` | Create a deployment status |
| `GitHubRestClient.reposCreateDispatchEvent` | `POST` | `/repos/{owner}/{repo}/dispatches` | Unmatched | Create a repository dispatch event |
| `GitHubRestClient.reposCreateForAuthenticatedUser` | `POST` | `/user/repos` | `E:repository.create.v1` | Create a repository for the authenticated user |
| `GitHubRestClient.reposCreateFork` | `POST` | `/repos/{owner}/{repo}/forks` | `E:repository.fork.create.v1` | Create a fork |
| `GitHubRestClient.reposCreateInOrg` | `POST` | `/orgs/{org}/repos` | `E:repository.create.v1` | Create an organization repository |
| `GitHubRestClient.reposCreateOrUpdateEnvironment` | `PUT` | `/repos/{owner}/{repo}/environments/{environment_name}` | `P:deployment.environment.v1` | Create or update an environment |
| `GitHubRestClient.reposCreateOrUpdateFileContents` | `PUT` | `/repos/{owner}/{repo}/contents/{path}` | `P:content.write.v1` | Create or update file contents |
| `GitHubRestClient.reposCreateOrgRuleset` | `POST` | `/orgs/{org}/rulesets` | Unmatched | Create an organization repository ruleset |
| `GitHubRestClient.reposCreatePagesDeployment` | `POST` | `/repos/{owner}/{repo}/pages/deployments` | Unmatched | Create a GitHub Pages deployment |
| `GitHubRestClient.reposCreatePagesSite` | `POST` | `/repos/{owner}/{repo}/pages` | Unmatched | Create a GitHub Pages site |
| `GitHubRestClient.reposCreateRelease` | `POST` | `/repos/{owner}/{repo}/releases` | `E:release.crud.v1` | Create a release |
| `GitHubRestClient.reposCreateRepoRuleset` | `POST` | `/repos/{owner}/{repo}/rulesets` | `P:branch.protection.write.v1` | Create a repository ruleset |
| `GitHubRestClient.reposCreateUsingTemplate` | `POST` | `/repos/{template_owner}/{template_repo}/generate` | Unmatched | Create a repository using a template |
| `GitHubRestClient.reposCreateWebhook` | `POST` | `/repos/{owner}/{repo}/hooks` | `E:webhook.crud.v1` | Create a repository webhook |
| `GitHubRestClient.reposCustomPropertiesForReposCreateOrUpdateRepositoryValues` | `PATCH` | `/repos/{owner}/{repo}/properties/values` | Unmatched | Create or update custom property values for a repository |
| `GitHubRestClient.reposCustomPropertiesForReposGetRepositoryValues` | `GET` | `/repos/{owner}/{repo}/properties/values` | Unmatched | Get all custom property values for a repository |
| `GitHubRestClient.reposDeclineInvitationForAuthenticatedUser` | `DELETE` | `/user/repository_invitations/{invitation_id}` | Unmatched | Decline a repository invitation |
| `GitHubRestClient.reposDelete` | `DELETE` | `/repos/{owner}/{repo}` | `E:repository.delete.v1` | Delete a repository |
| `GitHubRestClient.reposDeleteAccessRestrictions` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions` | Unmatched | Delete access restrictions |
| `GitHubRestClient.reposDeleteAdminBranchProtection` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins` | Unmatched | Delete admin branch protection |
| `GitHubRestClient.reposDeleteAnEnvironment` | `DELETE` | `/repos/{owner}/{repo}/environments/{environment_name}` | Unmatched | Delete an environment |
| `GitHubRestClient.reposDeleteAutolink` | `DELETE` | `/repos/{owner}/{repo}/autolinks/{autolink_id}` | Unmatched | Delete an autolink reference from a repository |
| `GitHubRestClient.reposDeleteBranchProtection` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection` | `P:branch.protection.write.v1` | Delete branch protection |
| `GitHubRestClient.reposDeleteCommitComment` | `DELETE` | `/repos/{owner}/{repo}/comments/{comment_id}` | Unmatched | Delete a commit comment |
| `GitHubRestClient.reposDeleteCommitSignatureProtection` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures` | Unmatched | Delete commit signature protection |
| `GitHubRestClient.reposDeleteDeployKey` | `DELETE` | `/repos/{owner}/{repo}/keys/{key_id}` | `E:deploy-key.crud.v1` | Delete a deploy key |
| `GitHubRestClient.reposDeleteDeployment` | `DELETE` | `/repos/{owner}/{repo}/deployments/{deployment_id}` | Unmatched | Delete a deployment |
| `GitHubRestClient.reposDeleteDeploymentBranchPolicy` | `DELETE` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}` | Unmatched | Delete a deployment branch policy |
| `GitHubRestClient.reposDeleteFile` | `DELETE` | `/repos/{owner}/{repo}/contents/{path}` | `P:content.write.v1` | Delete a file |
| `GitHubRestClient.reposDeleteInvitation` | `DELETE` | `/repos/{owner}/{repo}/invitations/{invitation_id}` | Unmatched | Delete a repository invitation |
| `GitHubRestClient.reposDeleteOrgRuleset` | `DELETE` | `/orgs/{org}/rulesets/{ruleset_id}` | Unmatched | Delete an organization repository ruleset |
| `GitHubRestClient.reposDeletePagesSite` | `DELETE` | `/repos/{owner}/{repo}/pages` | Unmatched | Delete a GitHub Pages site |
| `GitHubRestClient.reposDeletePullRequestReviewProtection` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews` | Unmatched | Delete pull request review protection |
| `GitHubRestClient.reposDeleteRelease` | `DELETE` | `/repos/{owner}/{repo}/releases/{release_id}` | `E:release.crud.v1` | Delete a release |
| `GitHubRestClient.reposDeleteReleaseAsset` | `DELETE` | `/repos/{owner}/{repo}/releases/assets/{asset_id}` | Unmatched | Delete a release asset |
| `GitHubRestClient.reposDeleteRepoRuleset` | `DELETE` | `/repos/{owner}/{repo}/rulesets/{ruleset_id}` | `P:branch.protection.write.v1` | Delete a repository ruleset |
| `GitHubRestClient.reposDeleteWebhook` | `DELETE` | `/repos/{owner}/{repo}/hooks/{hook_id}` | `E:webhook.crud.v1` | Delete a repository webhook |
| `GitHubRestClient.reposDisableAutomatedSecurityFixes` | `DELETE` | `/repos/{owner}/{repo}/automated-security-fixes` | Unmatched | Disable Dependabot security updates |
| `GitHubRestClient.reposDisableDeploymentProtectionRule` | `DELETE` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}` | Unmatched | Disable a custom protection rule for an environment |
| `GitHubRestClient.reposDisableImmutableReleases` | `DELETE` | `/repos/{owner}/{repo}/immutable-releases` | Unmatched | Disable immutable releases |
| `GitHubRestClient.reposDisablePrivateVulnerabilityReporting` | `DELETE` | `/repos/{owner}/{repo}/private-vulnerability-reporting` | Unmatched | Disable private vulnerability reporting for a repository |
| `GitHubRestClient.reposDisableVulnerabilityAlerts` | `DELETE` | `/repos/{owner}/{repo}/vulnerability-alerts` | Unmatched | Disable vulnerability alerts |
| `GitHubRestClient.reposDownloadTarballArchive` | `GET` | `/repos/{owner}/{repo}/tarball/{ref}` | Unmatched | Download a repository archive (tar) |
| `GitHubRestClient.reposDownloadZipballArchive` | `GET` | `/repos/{owner}/{repo}/zipball/{ref}` | Unmatched | Download a repository archive (zip) |
| `GitHubRestClient.reposEnableAutomatedSecurityFixes` | `PUT` | `/repos/{owner}/{repo}/automated-security-fixes` | Unmatched | Enable Dependabot security updates |
| `GitHubRestClient.reposEnableImmutableReleases` | `PUT` | `/repos/{owner}/{repo}/immutable-releases` | Unmatched | Enable immutable releases |
| `GitHubRestClient.reposEnablePrivateVulnerabilityReporting` | `PUT` | `/repos/{owner}/{repo}/private-vulnerability-reporting` | Unmatched | Enable private vulnerability reporting for a repository |
| `GitHubRestClient.reposEnableVulnerabilityAlerts` | `PUT` | `/repos/{owner}/{repo}/vulnerability-alerts` | Unmatched | Enable vulnerability alerts |
| `GitHubRestClient.reposGenerateReleaseNotes` | `POST` | `/repos/{owner}/{repo}/releases/generate-notes` | Unmatched | Generate release notes content for a release |
| `GitHubRestClient.reposGet` | `GET` | `/repos/{owner}/{repo}` | `E:repository.get.v1` | Get a repository |
| `GitHubRestClient.reposGetAccessRestrictions` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions` | Unmatched | Get access restrictions |
| `GitHubRestClient.reposGetAdminBranchProtection` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins` | Unmatched | Get admin branch protection |
| `GitHubRestClient.reposGetAllDeploymentProtectionRules` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules` | Unmatched | Get all deployment protection rules for an environment |
| `GitHubRestClient.reposGetAllEnvironments` | `GET` | `/repos/{owner}/{repo}/environments` | `P:deployment.environment.v1` | List environments |
| `GitHubRestClient.reposGetAllStatusCheckContexts` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts` | Unmatched | Get all status check contexts |
| `GitHubRestClient.reposGetAllTopics` | `GET` | `/repos/{owner}/{repo}/topics` | Unmatched | Get all repository topics |
| `GitHubRestClient.reposGetAppsWithAccessToProtectedBranch` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps` | Unmatched | Get apps with access to the protected branch |
| `GitHubRestClient.reposGetAutolink` | `GET` | `/repos/{owner}/{repo}/autolinks/{autolink_id}` | Unmatched | Get an autolink reference of a repository |
| `GitHubRestClient.reposGetBranch` | `GET` | `/repos/{owner}/{repo}/branches/{branch}` | `E:branch.get.v1` | Get a branch |
| `GitHubRestClient.reposGetBranchProtection` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection` | `P:branch.protection.read.v1` | Get branch protection |
| `GitHubRestClient.reposGetBranchRules` | `GET` | `/repos/{owner}/{repo}/rules/branches/{branch}` | Unmatched | Get rules for a branch |
| `GitHubRestClient.reposGetClones` | `GET` | `/repos/{owner}/{repo}/traffic/clones` | Unmatched | Get repository clones |
| `GitHubRestClient.reposGetCodeFrequencyStats` | `GET` | `/repos/{owner}/{repo}/stats/code_frequency` | Unmatched | Get the weekly commit activity |
| `GitHubRestClient.reposGetCollaboratorPermissionLevel` | `GET` | `/repos/{owner}/{repo}/collaborators/{username}/permission` | `E:collaborator.read.v1` | Get repository permissions for a user |
| `GitHubRestClient.reposGetCombinedStatusForRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/status` | Unmatched | Get the combined status for a specific reference |
| `GitHubRestClient.reposGetCommit` | `GET` | `/repos/{owner}/{repo}/commits/{ref}` | `E:commit.get.v1` | Get a commit |
| `GitHubRestClient.reposGetCommitActivityStats` | `GET` | `/repos/{owner}/{repo}/stats/commit_activity` | Unmatched | Get the last year of commit activity |
| `GitHubRestClient.reposGetCommitComment` | `GET` | `/repos/{owner}/{repo}/comments/{comment_id}` | Unmatched | Get a commit comment |
| `GitHubRestClient.reposGetCommitSignatureProtection` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_signatures` | Unmatched | Get commit signature protection |
| `GitHubRestClient.reposGetCommunityProfileMetrics` | `GET` | `/repos/{owner}/{repo}/community/profile` | Unmatched | Get community profile metrics |
| `GitHubRestClient.reposGetContent` | `GET` | `/repos/{owner}/{repo}/contents/{path}` | `P:content.read.v1` | Get repository content |
| `GitHubRestClient.reposGetContributorsStats` | `GET` | `/repos/{owner}/{repo}/stats/contributors` | Unmatched | Get all contributor commit activity |
| `GitHubRestClient.reposGetCustomDeploymentProtectionRule` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}` | Unmatched | Get a custom deployment protection rule |
| `GitHubRestClient.reposGetDeployKey` | `GET` | `/repos/{owner}/{repo}/keys/{key_id}` | `E:deploy-key.crud.v1` | Get a deploy key |
| `GitHubRestClient.reposGetDeployment` | `GET` | `/repos/{owner}/{repo}/deployments/{deployment_id}` | Unmatched | Get a deployment |
| `GitHubRestClient.reposGetDeploymentBranchPolicy` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}` | Unmatched | Get a deployment branch policy |
| `GitHubRestClient.reposGetDeploymentStatus` | `GET` | `/repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}` | Unmatched | Get a deployment status |
| `GitHubRestClient.reposGetEnvironment` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}` | Unmatched | Get an environment |
| `GitHubRestClient.reposGetHashAlgorithm` | `GET` | `/repos/{owner}/{repo}/hash-algorithm` | Unmatched | Get the hash algorithm for a repository |
| `GitHubRestClient.reposGetLatestPagesBuild` | `GET` | `/repos/{owner}/{repo}/pages/builds/latest` | Unmatched | Get latest Pages build |
| `GitHubRestClient.reposGetLatestRelease` | `GET` | `/repos/{owner}/{repo}/releases/latest` | Unmatched | Get the latest release |
| `GitHubRestClient.reposGetOrgRuleSuite` | `GET` | `/orgs/{org}/rulesets/rule-suites/{rule_suite_id}` | Unmatched | Get an organization rule suite |
| `GitHubRestClient.reposGetOrgRuleSuites` | `GET` | `/orgs/{org}/rulesets/rule-suites` | Unmatched | List organization rule suites |
| `GitHubRestClient.reposGetOrgRuleset` | `GET` | `/orgs/{org}/rulesets/{ruleset_id}` | Unmatched | Get an organization repository ruleset |
| `GitHubRestClient.reposGetOrgRulesets` | `GET` | `/orgs/{org}/rulesets` | Unmatched | Get all organization repository rulesets |
| `GitHubRestClient.reposGetPages` | `GET` | `/repos/{owner}/{repo}/pages` | Unmatched | Get a GitHub Pages site |
| `GitHubRestClient.reposGetPagesBuild` | `GET` | `/repos/{owner}/{repo}/pages/builds/{build_id}` | Unmatched | Get GitHub Pages build |
| `GitHubRestClient.reposGetPagesDeployment` | `GET` | `/repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}` | Unmatched | Get the status of a GitHub Pages deployment |
| `GitHubRestClient.reposGetPagesHealthCheck` | `GET` | `/repos/{owner}/{repo}/pages/health` | Unmatched | Get a DNS health check for GitHub Pages |
| `GitHubRestClient.reposGetParticipationStats` | `GET` | `/repos/{owner}/{repo}/stats/participation` | Unmatched | Get the weekly commit count |
| `GitHubRestClient.reposGetPullRequestReviewProtection` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews` | Unmatched | Get pull request review protection |
| `GitHubRestClient.reposGetPunchCardStats` | `GET` | `/repos/{owner}/{repo}/stats/punch_card` | Unmatched | Get the hourly commit count for each day |
| `GitHubRestClient.reposGetReadme` | `GET` | `/repos/{owner}/{repo}/readme` | Unmatched | Get a repository README |
| `GitHubRestClient.reposGetReadmeInDirectory` | `GET` | `/repos/{owner}/{repo}/readme/{dir}` | Unmatched | Get a repository README for a directory |
| `GitHubRestClient.reposGetRelease` | `GET` | `/repos/{owner}/{repo}/releases/{release_id}` | `E:release.crud.v1` | Get a release |
| `GitHubRestClient.reposGetReleaseAsset` | `GET` | `/repos/{owner}/{repo}/releases/assets/{asset_id}` | Unmatched | Get a release asset |
| `GitHubRestClient.reposGetReleaseByTag` | `GET` | `/repos/{owner}/{repo}/releases/tags/{tag}` | `E:release.crud.v1` | Get a release by tag name |
| `GitHubRestClient.reposGetRepoRuleSuite` | `GET` | `/repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}` | Unmatched | Get a repository rule suite |
| `GitHubRestClient.reposGetRepoRuleSuites` | `GET` | `/repos/{owner}/{repo}/rulesets/rule-suites` | Unmatched | List repository rule suites |
| `GitHubRestClient.reposGetRepoRuleset` | `GET` | `/repos/{owner}/{repo}/rulesets/{ruleset_id}` | `P:branch.protection.read.v1` | Get a repository ruleset |
| `GitHubRestClient.reposGetRepoRulesetHistory` | `GET` | `/repos/{owner}/{repo}/rulesets/{ruleset_id}/history` | Unmatched | Get repository ruleset history |
| `GitHubRestClient.reposGetRepoRulesetVersion` | `GET` | `/repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}` | Unmatched | Get repository ruleset version |
| `GitHubRestClient.reposGetRepoRulesets` | `GET` | `/repos/{owner}/{repo}/rulesets` | `P:branch.protection.read.v1` | Get all repository rulesets |
| `GitHubRestClient.reposGetStatusChecksProtection` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks` | Unmatched | Get status checks protection |
| `GitHubRestClient.reposGetTeamsWithAccessToProtectedBranch` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams` | Unmatched | Get teams with access to the protected branch |
| `GitHubRestClient.reposGetTopPaths` | `GET` | `/repos/{owner}/{repo}/traffic/popular/paths` | Unmatched | Get top referral paths |
| `GitHubRestClient.reposGetTopReferrers` | `GET` | `/repos/{owner}/{repo}/traffic/popular/referrers` | Unmatched | Get top referral sources |
| `GitHubRestClient.reposGetUsersWithAccessToProtectedBranch` | `GET` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users` | Unmatched | Get users with access to the protected branch |
| `GitHubRestClient.reposGetViews` | `GET` | `/repos/{owner}/{repo}/traffic/views` | Unmatched | Get page views |
| `GitHubRestClient.reposGetWebhook` | `GET` | `/repos/{owner}/{repo}/hooks/{hook_id}` | `E:webhook.crud.v1` | Get a repository webhook |
| `GitHubRestClient.reposGetWebhookConfigForRepo` | `GET` | `/repos/{owner}/{repo}/hooks/{hook_id}/config` | Unmatched | Get a webhook configuration for a repository |
| `GitHubRestClient.reposGetWebhookDelivery` | `GET` | `/repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}` | Unmatched | Get a delivery for a repository webhook |
| `GitHubRestClient.reposListActivities` | `GET` | `/repos/{owner}/{repo}/activity` | Unmatched | List repository activities |
| `GitHubRestClient.reposListAttestations` | `GET` | `/repos/{owner}/{repo}/attestations/{subject_digest}` | Unmatched | List attestations |
| `GitHubRestClient.reposListAutolinks` | `GET` | `/repos/{owner}/{repo}/autolinks` | Unmatched | Get all autolinks of a repository |
| `GitHubRestClient.reposListBranches` | `GET` | `/repos/{owner}/{repo}/branches` | `E:branch.list.v1` | List branches |
| `GitHubRestClient.reposListBranchesForHeadCommit` | `GET` | `/repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head` | Unmatched | List branches for HEAD commit |
| `GitHubRestClient.reposListCollaborators` | `GET` | `/repos/{owner}/{repo}/collaborators` | `E:collaborator.read.v1` | List repository collaborators |
| `GitHubRestClient.reposListCommentsForCommit` | `GET` | `/repos/{owner}/{repo}/commits/{commit_sha}/comments` | Unmatched | List commit comments |
| `GitHubRestClient.reposListCommitCommentsForRepo` | `GET` | `/repos/{owner}/{repo}/comments` | Unmatched | List commit comments for a repository |
| `GitHubRestClient.reposListCommitStatusesForRef` | `GET` | `/repos/{owner}/{repo}/commits/{ref}/statuses` | `E:commit-status.v1` | List commit statuses for a reference |
| `GitHubRestClient.reposListCommits` | `GET` | `/repos/{owner}/{repo}/commits` | `E:commit.list.v1` | List commits |
| `GitHubRestClient.reposListContributors` | `GET` | `/repos/{owner}/{repo}/contributors` | Unmatched | List repository contributors |
| `GitHubRestClient.reposListCustomDeploymentRuleIntegrations` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps` | Unmatched | List custom deployment rule integrations available for an environment |
| `GitHubRestClient.reposListDeployKeys` | `GET` | `/repos/{owner}/{repo}/keys` | `E:deploy-key.crud.v1` | List deploy keys |
| `GitHubRestClient.reposListDeploymentBranchPolicies` | `GET` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies` | Unmatched | List deployment branch policies |
| `GitHubRestClient.reposListDeploymentStatuses` | `GET` | `/repos/{owner}/{repo}/deployments/{deployment_id}/statuses` | Unmatched | List deployment statuses |
| `GitHubRestClient.reposListDeployments` | `GET` | `/repos/{owner}/{repo}/deployments` | Unmatched | List deployments |
| `GitHubRestClient.reposListForAuthenticatedUser` | `GET` | `/user/repos` | `E:repository.list.v1` | List repositories for the authenticated user |
| `GitHubRestClient.reposListForOrg` | `GET` | `/orgs/{org}/repos` | `E:repository.list.v1` | List organization repositories |
| `GitHubRestClient.reposListForUser` | `GET` | `/users/{username}/repos` | `E:repository.list.v1` | List repositories for a user |
| `GitHubRestClient.reposListForks` | `GET` | `/repos/{owner}/{repo}/forks` | `E:repository.fork.list.v1` | List forks |
| `GitHubRestClient.reposListInvitations` | `GET` | `/repos/{owner}/{repo}/invitations` | Unmatched | List repository invitations |
| `GitHubRestClient.reposListInvitationsForAuthenticatedUser` | `GET` | `/user/repository_invitations` | Unmatched | List repository invitations for the authenticated user |
| `GitHubRestClient.reposListIssueTypes` | `GET` | `/repos/{owner}/{repo}/issue-types` | Unmatched | List issue types for a repository |
| `GitHubRestClient.reposListLanguages` | `GET` | `/repos/{owner}/{repo}/languages` | Unmatched | List repository languages |
| `GitHubRestClient.reposListPagesBuilds` | `GET` | `/repos/{owner}/{repo}/pages/builds` | Unmatched | List GitHub Pages builds |
| `GitHubRestClient.reposListPublic` | `GET` | `/repositories` | Unmatched | List public repositories |
| `GitHubRestClient.reposListPullRequestsAssociatedWithCommit` | `GET` | `/repos/{owner}/{repo}/commits/{commit_sha}/pulls` | Unmatched | List pull requests associated with a commit |
| `GitHubRestClient.reposListReleaseAssets` | `GET` | `/repos/{owner}/{repo}/releases/{release_id}/assets` | Unmatched | List release assets |
| `GitHubRestClient.reposListReleases` | `GET` | `/repos/{owner}/{repo}/releases` | `E:release.crud.v1` | List releases |
| `GitHubRestClient.reposListTags` | `GET` | `/repos/{owner}/{repo}/tags` | `P:tag.list-get.v1` | List repository tags |
| `GitHubRestClient.reposListTeams` | `GET` | `/repos/{owner}/{repo}/teams` | Unmatched | List repository teams |
| `GitHubRestClient.reposListWebhookDeliveries` | `GET` | `/repos/{owner}/{repo}/hooks/{hook_id}/deliveries` | Unmatched | List deliveries for a repository webhook |
| `GitHubRestClient.reposListWebhooks` | `GET` | `/repos/{owner}/{repo}/hooks` | `E:webhook.crud.v1` | List repository webhooks |
| `GitHubRestClient.reposMerge` | `POST` | `/repos/{owner}/{repo}/merges` | Unmatched | Merge a branch |
| `GitHubRestClient.reposMergeUpstream` | `POST` | `/repos/{owner}/{repo}/merge-upstream` | Unmatched | Sync a fork branch with the upstream repository |
| `GitHubRestClient.reposPingWebhook` | `POST` | `/repos/{owner}/{repo}/hooks/{hook_id}/pings` | `E:webhook.crud.v1` | Ping a repository webhook |
| `GitHubRestClient.reposRedeliverWebhookDelivery` | `POST` | `/repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts` | Unmatched | Redeliver a delivery for a repository webhook |
| `GitHubRestClient.reposRemoveAppAccessRestrictions` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps` | Unmatched | Remove app access restrictions |
| `GitHubRestClient.reposRemoveCollaborator` | `DELETE` | `/repos/{owner}/{repo}/collaborators/{username}` | Unmatched | Remove a repository collaborator |
| `GitHubRestClient.reposRemoveStatusCheckContexts` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts` | Unmatched | Remove status check contexts |
| `GitHubRestClient.reposRemoveStatusCheckProtection` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks` | Unmatched | Remove status check protection |
| `GitHubRestClient.reposRemoveTeamAccessRestrictions` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams` | Unmatched | Remove team access restrictions |
| `GitHubRestClient.reposRemoveUserAccessRestrictions` | `DELETE` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users` | Unmatched | Remove user access restrictions |
| `GitHubRestClient.reposRenameBranch` | `POST` | `/repos/{owner}/{repo}/branches/{branch}/rename` | Unmatched | Rename a branch |
| `GitHubRestClient.reposReplaceAllTopics` | `PUT` | `/repos/{owner}/{repo}/topics` | Unmatched | Replace all repository topics |
| `GitHubRestClient.reposRequestPagesBuild` | `POST` | `/repos/{owner}/{repo}/pages/builds` | Unmatched | Request a GitHub Pages build |
| `GitHubRestClient.reposSetAdminBranchProtection` | `POST` | `/repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins` | Unmatched | Set admin branch protection |
| `GitHubRestClient.reposSetAppAccessRestrictions` | `PUT` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps` | Unmatched | Set app access restrictions |
| `GitHubRestClient.reposSetStatusCheckContexts` | `PUT` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts` | Unmatched | Set status check contexts |
| `GitHubRestClient.reposSetTeamAccessRestrictions` | `PUT` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams` | Unmatched | Set team access restrictions |
| `GitHubRestClient.reposSetUserAccessRestrictions` | `PUT` | `/repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users` | Unmatched | Set user access restrictions |
| `GitHubRestClient.reposTestPushWebhook` | `POST` | `/repos/{owner}/{repo}/hooks/{hook_id}/tests` | `E:webhook.crud.v1` | Test the push repository webhook |
| `GitHubRestClient.reposTransfer` | `POST` | `/repos/{owner}/{repo}/transfer` | Unmatched | Transfer a repository |
| `GitHubRestClient.reposUpdate` | `PATCH` | `/repos/{owner}/{repo}` | `P:repository.archive.v1`<br>`E:repository.update.v1` | Update a repository |
| `GitHubRestClient.reposUpdateBranchProtection` | `PUT` | `/repos/{owner}/{repo}/branches/{branch}/protection` | `P:branch.protection.write.v1` | Update branch protection |
| `GitHubRestClient.reposUpdateCommitComment` | `PATCH` | `/repos/{owner}/{repo}/comments/{comment_id}` | Unmatched | Update a commit comment |
| `GitHubRestClient.reposUpdateDeploymentBranchPolicy` | `PUT` | `/repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}` | Unmatched | Update a deployment branch policy |
| `GitHubRestClient.reposUpdateInformationAboutPagesSite` | `PUT` | `/repos/{owner}/{repo}/pages` | Unmatched | Update information about a GitHub Pages site |
| `GitHubRestClient.reposUpdateInvitation` | `PATCH` | `/repos/{owner}/{repo}/invitations/{invitation_id}` | Unmatched | Update a repository invitation |
| `GitHubRestClient.reposUpdateOrgRuleset` | `PUT` | `/orgs/{org}/rulesets/{ruleset_id}` | Unmatched | Update an organization repository ruleset |
| `GitHubRestClient.reposUpdatePullRequestReviewProtection` | `PATCH` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews` | Unmatched | Update pull request review protection |
| `GitHubRestClient.reposUpdateRelease` | `PATCH` | `/repos/{owner}/{repo}/releases/{release_id}` | `E:release.crud.v1` | Update a release |
| `GitHubRestClient.reposUpdateReleaseAsset` | `PATCH` | `/repos/{owner}/{repo}/releases/assets/{asset_id}` | Unmatched | Update a release asset |
| `GitHubRestClient.reposUpdateRepoRuleset` | `PUT` | `/repos/{owner}/{repo}/rulesets/{ruleset_id}` | `P:branch.protection.write.v1` | Update a repository ruleset |
| `GitHubRestClient.reposUpdateStatusCheckProtection` | `PATCH` | `/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks` | Unmatched | Update status check protection |
| `GitHubRestClient.reposUpdateWebhook` | `PATCH` | `/repos/{owner}/{repo}/hooks/{hook_id}` | `E:webhook.crud.v1` | Update a repository webhook |
| `GitHubRestClient.reposUpdateWebhookConfigForRepo` | `PATCH` | `/repos/{owner}/{repo}/hooks/{hook_id}/config` | Unmatched | Update a webhook configuration for a repository |
| `GitHubRestClient.reposUploadReleaseAsset` | `POST` | `/repos/{owner}/{repo}/releases/{release_id}/assets` | Unmatched | Upload a release asset |

</details>

<details>
<summary><strong>search</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.searchCode` | `GET` | `/search/code` | `E:search.code.v1` | Search code |
| `GitHubRestClient.searchCommits` | `GET` | `/search/commits` | Unmatched | Search commits |
| `GitHubRestClient.searchIssuesAndPullRequests` | `GET` | `/search/issues` | Unmatched | Search issues and pull requests |
| `GitHubRestClient.searchLabels` | `GET` | `/search/labels` | Unmatched | Search labels |
| `GitHubRestClient.searchRepos` | `GET` | `/search/repositories` | Unmatched | Search repositories |
| `GitHubRestClient.searchTopics` | `GET` | `/search/topics` | Unmatched | Search topics |
| `GitHubRestClient.searchUsers` | `GET` | `/search/users` | `E:user.search.v1` | Search users |

</details>

<details>
<summary><strong>secret-scanning</strong> (17)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.secretScanningBulkCreateOrgCustomPatterns` | `POST` | `/orgs/{org}/secret-scanning/custom-patterns` | Unmatched | Bulk create organization custom patterns |
| `GitHubRestClient.secretScanningBulkCreateRepoCustomPatterns` | `POST` | `/repos/{owner}/{repo}/secret-scanning/custom-patterns` | Unmatched | Bulk create repository custom patterns |
| `GitHubRestClient.secretScanningBulkDeleteOrgCustomPatterns` | `DELETE` | `/orgs/{org}/secret-scanning/custom-patterns` | Unmatched | Bulk delete organization custom patterns |
| `GitHubRestClient.secretScanningBulkDeleteRepoCustomPatterns` | `DELETE` | `/repos/{owner}/{repo}/secret-scanning/custom-patterns` | Unmatched | Bulk delete repository custom patterns |
| `GitHubRestClient.secretScanningCreatePushProtectionBypass` | `POST` | `/repos/{owner}/{repo}/secret-scanning/push-protection-bypasses` | Unmatched | Create a push protection bypass |
| `GitHubRestClient.secretScanningGetAlert` | `GET` | `/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}` | Unmatched | Get a secret scanning alert |
| `GitHubRestClient.secretScanningGetScanHistory` | `GET` | `/repos/{owner}/{repo}/secret-scanning/scan-history` | Unmatched | Get secret scanning scan history for a repository |
| `GitHubRestClient.secretScanningListAlertsForOrg` | `GET` | `/orgs/{org}/secret-scanning/alerts` | Unmatched | List secret scanning alerts for an organization |
| `GitHubRestClient.secretScanningListAlertsForRepo` | `GET` | `/repos/{owner}/{repo}/secret-scanning/alerts` | `U:github.security` | List secret scanning alerts for a repository |
| `GitHubRestClient.secretScanningListLocationsForAlert` | `GET` | `/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations` | Unmatched | List locations for a secret scanning alert |
| `GitHubRestClient.secretScanningListOrgCustomPatterns` | `GET` | `/orgs/{org}/secret-scanning/custom-patterns` | Unmatched | List organization custom patterns |
| `GitHubRestClient.secretScanningListOrgPatternConfigs` | `GET` | `/orgs/{org}/secret-scanning/pattern-configurations` | Unmatched | List organization pattern configurations |
| `GitHubRestClient.secretScanningListRepoCustomPatterns` | `GET` | `/repos/{owner}/{repo}/secret-scanning/custom-patterns` | Unmatched | List repository custom patterns |
| `GitHubRestClient.secretScanningUpdateAlert` | `PATCH` | `/repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}` | Unmatched | Update a secret scanning alert |
| `GitHubRestClient.secretScanningUpdateOrgCustomPattern` | `PATCH` | `/orgs/{org}/secret-scanning/custom-patterns/{pattern_id}` | Unmatched | Update an organization custom pattern |
| `GitHubRestClient.secretScanningUpdateOrgPatternConfigs` | `PATCH` | `/orgs/{org}/secret-scanning/pattern-configurations` | Unmatched | Update organization pattern configurations |
| `GitHubRestClient.secretScanningUpdateRepoCustomPattern` | `PATCH` | `/repos/{owner}/{repo}/secret-scanning/custom-patterns/{pattern_id}` | Unmatched | Update a repository custom pattern |

</details>

<details>
<summary><strong>security-advisories</strong> (10)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.securityAdvisoriesCreateFork` | `POST` | `/repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks` | Unmatched | Create a temporary private fork |
| `GitHubRestClient.securityAdvisoriesCreatePrivateVulnerabilityReport` | `POST` | `/repos/{owner}/{repo}/security-advisories/reports` | Unmatched | Privately report a security vulnerability |
| `GitHubRestClient.securityAdvisoriesCreateRepositoryAdvisory` | `POST` | `/repos/{owner}/{repo}/security-advisories` | `U:github.security` | Create a repository security advisory |
| `GitHubRestClient.securityAdvisoriesCreateRepositoryAdvisoryCveRequest` | `POST` | `/repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve` | Unmatched | Request a CVE for a repository security advisory |
| `GitHubRestClient.securityAdvisoriesGetGlobalAdvisory` | `GET` | `/advisories/{ghsa_id}` | Unmatched | Get a global security advisory |
| `GitHubRestClient.securityAdvisoriesGetRepositoryAdvisory` | `GET` | `/repos/{owner}/{repo}/security-advisories/{ghsa_id}` | Unmatched | Get a repository security advisory |
| `GitHubRestClient.securityAdvisoriesListGlobalAdvisories` | `GET` | `/advisories` | Unmatched | List global security advisories |
| `GitHubRestClient.securityAdvisoriesListOrgRepositoryAdvisories` | `GET` | `/orgs/{org}/security-advisories` | Unmatched | List repository security advisories for an organization |
| `GitHubRestClient.securityAdvisoriesListRepositoryAdvisories` | `GET` | `/repos/{owner}/{repo}/security-advisories` | Unmatched | List repository security advisories |
| `GitHubRestClient.securityAdvisoriesUpdateRepositoryAdvisory` | `PATCH` | `/repos/{owner}/{repo}/security-advisories/{ghsa_id}` | Unmatched | Update a repository security advisory |

</details>

<details>
<summary><strong>teams</strong> (32)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.teamsAddMemberLegacy` | `PUT` | `/teams/{team_id}/members/{username}` | Unmatched | [Deprecated] Add team member (Legacy) |
| `GitHubRestClient.teamsAddOrUpdateMembershipForUserInOrg` | `PUT` | `/orgs/{org}/teams/{team_slug}/memberships/{username}` | `E:team.crud.v1` | Add or update team membership for a user |
| `GitHubRestClient.teamsAddOrUpdateMembershipForUserLegacy` | `PUT` | `/teams/{team_id}/memberships/{username}` | Unmatched | [Deprecated] Add or update team membership for a user (Legacy) |
| `GitHubRestClient.teamsAddOrUpdateRepoPermissionsInOrg` | `PUT` | `/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}` | Unmatched | Add or update team repository permissions |
| `GitHubRestClient.teamsAddOrUpdateRepoPermissionsLegacy` | `PUT` | `/teams/{team_id}/repos/{owner}/{repo}` | Unmatched | [Deprecated] Add or update team repository permissions (Legacy) |
| `GitHubRestClient.teamsCheckPermissionsForRepoInOrg` | `GET` | `/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}` | Unmatched | Check team permissions for a repository |
| `GitHubRestClient.teamsCheckPermissionsForRepoLegacy` | `GET` | `/teams/{team_id}/repos/{owner}/{repo}` | Unmatched | [Deprecated] Check team permissions for a repository (Legacy) |
| `GitHubRestClient.teamsCreate` | `POST` | `/orgs/{org}/teams` | `E:team.crud.v1` | Create a team |
| `GitHubRestClient.teamsDeleteInOrg` | `DELETE` | `/orgs/{org}/teams/{team_slug}` | `E:team.crud.v1` | Delete a team |
| `GitHubRestClient.teamsDeleteLegacy` | `DELETE` | `/teams/{team_id}` | Unmatched | [Deprecated] Delete a team (Legacy) |
| `GitHubRestClient.teamsGetByName` | `GET` | `/orgs/{org}/teams/{team_slug}` | `E:team.crud.v1` | Get a team by name |
| `GitHubRestClient.teamsGetLegacy` | `GET` | `/teams/{team_id}` | Unmatched | [Deprecated] Get a team (Legacy) |
| `GitHubRestClient.teamsGetMemberLegacy` | `GET` | `/teams/{team_id}/members/{username}` | Unmatched | [Deprecated] Get team member (Legacy) |
| `GitHubRestClient.teamsGetMembershipForUserInOrg` | `GET` | `/orgs/{org}/teams/{team_slug}/memberships/{username}` | Unmatched | Get team membership for a user |
| `GitHubRestClient.teamsGetMembershipForUserLegacy` | `GET` | `/teams/{team_id}/memberships/{username}` | Unmatched | [Deprecated] Get team membership for a user (Legacy) |
| `GitHubRestClient.teamsList` | `GET` | `/orgs/{org}/teams` | `E:team.crud.v1` | List teams |
| `GitHubRestClient.teamsListChildInOrg` | `GET` | `/orgs/{org}/teams/{team_slug}/teams` | Unmatched | List child teams |
| `GitHubRestClient.teamsListChildLegacy` | `GET` | `/teams/{team_id}/teams` | Unmatched | [Deprecated] List child teams (Legacy) |
| `GitHubRestClient.teamsListForAuthenticatedUser` | `GET` | `/user/teams` | Unmatched | List teams for the authenticated user |
| `GitHubRestClient.teamsListMembersInOrg` | `GET` | `/orgs/{org}/teams/{team_slug}/members` | `E:team.crud.v1` | List team members |
| `GitHubRestClient.teamsListMembersLegacy` | `GET` | `/teams/{team_id}/members` | Unmatched | [Deprecated] List team members (Legacy) |
| `GitHubRestClient.teamsListPendingInvitationsInOrg` | `GET` | `/orgs/{org}/teams/{team_slug}/invitations` | Unmatched | List pending team invitations |
| `GitHubRestClient.teamsListPendingInvitationsLegacy` | `GET` | `/teams/{team_id}/invitations` | Unmatched | [Deprecated] List pending team invitations (Legacy) |
| `GitHubRestClient.teamsListReposInOrg` | `GET` | `/orgs/{org}/teams/{team_slug}/repos` | Unmatched | List team repositories |
| `GitHubRestClient.teamsListReposLegacy` | `GET` | `/teams/{team_id}/repos` | Unmatched | [Deprecated] List team repositories (Legacy) |
| `GitHubRestClient.teamsRemoveMemberLegacy` | `DELETE` | `/teams/{team_id}/members/{username}` | Unmatched | [Deprecated] Remove team member (Legacy) |
| `GitHubRestClient.teamsRemoveMembershipForUserInOrg` | `DELETE` | `/orgs/{org}/teams/{team_slug}/memberships/{username}` | `E:team.crud.v1` | Remove team membership for a user |
| `GitHubRestClient.teamsRemoveMembershipForUserLegacy` | `DELETE` | `/teams/{team_id}/memberships/{username}` | Unmatched | [Deprecated] Remove team membership for a user (Legacy) |
| `GitHubRestClient.teamsRemoveRepoInOrg` | `DELETE` | `/orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}` | Unmatched | Remove a repository from a team |
| `GitHubRestClient.teamsRemoveRepoLegacy` | `DELETE` | `/teams/{team_id}/repos/{owner}/{repo}` | Unmatched | [Deprecated] Remove a repository from a team (Legacy) |
| `GitHubRestClient.teamsUpdateInOrg` | `PATCH` | `/orgs/{org}/teams/{team_slug}` | `E:team.crud.v1` | Update a team |
| `GitHubRestClient.teamsUpdateLegacy` | `PATCH` | `/teams/{team_id}` | Unmatched | [Deprecated] Update a team (Legacy) |

</details>

<details>
<summary><strong>users</strong> (47)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitHubRestClient.usersAddEmailForAuthenticatedUser` | `POST` | `/user/emails` | Unmatched | Add an email address for the authenticated user |
| `GitHubRestClient.usersAddSocialAccountForAuthenticatedUser` | `POST` | `/user/social_accounts` | Unmatched | Add social accounts for the authenticated user |
| `GitHubRestClient.usersBlock` | `PUT` | `/user/blocks/{username}` | Unmatched | Block a user |
| `GitHubRestClient.usersCheckBlocked` | `GET` | `/user/blocks/{username}` | Unmatched | Check if a user is blocked by the authenticated user |
| `GitHubRestClient.usersCheckFollowingForUser` | `GET` | `/users/{username}/following/{target_user}` | Unmatched | Check if a user follows another user |
| `GitHubRestClient.usersCheckPersonIsFollowedByAuthenticated` | `GET` | `/user/following/{username}` | Unmatched | Check if a person is followed by the authenticated user |
| `GitHubRestClient.usersCreateGpgKeyForAuthenticatedUser` | `POST` | `/user/gpg_keys` | Unmatched | Create a GPG key for the authenticated user |
| `GitHubRestClient.usersCreatePublicSshKeyForAuthenticatedUser` | `POST` | `/user/keys` | Unmatched | Create a public SSH key for the authenticated user |
| `GitHubRestClient.usersCreateSshSigningKeyForAuthenticatedUser` | `POST` | `/user/ssh_signing_keys` | Unmatched | Create a SSH signing key for the authenticated user |
| `GitHubRestClient.usersDeleteAttestationsBulk` | `POST` | `/users/{username}/attestations/delete-request` | Unmatched | Delete attestations in bulk |
| `GitHubRestClient.usersDeleteAttestationsById` | `DELETE` | `/users/{username}/attestations/{attestation_id}` | Unmatched | Delete attestations by ID |
| `GitHubRestClient.usersDeleteAttestationsBySubjectDigest` | `DELETE` | `/users/{username}/attestations/digest/{subject_digest}` | Unmatched | Delete attestations by subject digest |
| `GitHubRestClient.usersDeleteEmailForAuthenticatedUser` | `DELETE` | `/user/emails` | Unmatched | Delete an email address for the authenticated user |
| `GitHubRestClient.usersDeleteGpgKeyForAuthenticatedUser` | `DELETE` | `/user/gpg_keys/{gpg_key_id}` | Unmatched | Delete a GPG key for the authenticated user |
| `GitHubRestClient.usersDeletePublicSshKeyForAuthenticatedUser` | `DELETE` | `/user/keys/{key_id}` | Unmatched | Delete a public SSH key for the authenticated user |
| `GitHubRestClient.usersDeleteSocialAccountForAuthenticatedUser` | `DELETE` | `/user/social_accounts` | Unmatched | Delete social accounts for the authenticated user |
| `GitHubRestClient.usersDeleteSshSigningKeyForAuthenticatedUser` | `DELETE` | `/user/ssh_signing_keys/{ssh_signing_key_id}` | Unmatched | Delete an SSH signing key for the authenticated user |
| `GitHubRestClient.usersFollow` | `PUT` | `/user/following/{username}` | Unmatched | Follow a user |
| `GitHubRestClient.usersGetAuthenticated` | `GET` | `/user` | `E:user.current.read.v1` | Get the authenticated user |
| `GitHubRestClient.usersGetById` | `GET` | `/user/{account_id}` | `E:user.named.read.v1` | Get a user using their ID |
| `GitHubRestClient.usersGetByUsername` | `GET` | `/users/{username}` | `E:user.named.read.v1` | Get a user |
| `GitHubRestClient.usersGetContextForUser` | `GET` | `/users/{username}/hovercard` | Unmatched | Get contextual information for a user |
| `GitHubRestClient.usersGetGpgKeyForAuthenticatedUser` | `GET` | `/user/gpg_keys/{gpg_key_id}` | Unmatched | Get a GPG key for the authenticated user |
| `GitHubRestClient.usersGetPublicSshKeyForAuthenticatedUser` | `GET` | `/user/keys/{key_id}` | Unmatched | Get a public SSH key for the authenticated user |
| `GitHubRestClient.usersGetSshSigningKeyForAuthenticatedUser` | `GET` | `/user/ssh_signing_keys/{ssh_signing_key_id}` | Unmatched | Get an SSH signing key for the authenticated user |
| `GitHubRestClient.usersList` | `GET` | `/users` | Unmatched | List users |
| `GitHubRestClient.usersListAttestations` | `GET` | `/users/{username}/attestations/{subject_digest}` | Unmatched | List attestations |
| `GitHubRestClient.usersListAttestationsBulk` | `POST` | `/users/{username}/attestations/bulk-list` | Unmatched | List attestations by bulk subject digests |
| `GitHubRestClient.usersListBlockedByAuthenticatedUser` | `GET` | `/user/blocks` | Unmatched | List users blocked by the authenticated user |
| `GitHubRestClient.usersListEmailsForAuthenticatedUser` | `GET` | `/user/emails` | Unmatched | List email addresses for the authenticated user |
| `GitHubRestClient.usersListFollowedByAuthenticatedUser` | `GET` | `/user/following` | Unmatched | List the people the authenticated user follows |
| `GitHubRestClient.usersListFollowersForAuthenticatedUser` | `GET` | `/user/followers` | Unmatched | List followers of the authenticated user |
| `GitHubRestClient.usersListFollowersForUser` | `GET` | `/users/{username}/followers` | Unmatched | List followers of a user |
| `GitHubRestClient.usersListFollowingForUser` | `GET` | `/users/{username}/following` | Unmatched | List the people a user follows |
| `GitHubRestClient.usersListGpgKeysForAuthenticatedUser` | `GET` | `/user/gpg_keys` | Unmatched | List GPG keys for the authenticated user |
| `GitHubRestClient.usersListGpgKeysForUser` | `GET` | `/users/{username}/gpg_keys` | Unmatched | List GPG keys for a user |
| `GitHubRestClient.usersListPublicEmailsForAuthenticatedUser` | `GET` | `/user/public_emails` | Unmatched | List public email addresses for the authenticated user |
| `GitHubRestClient.usersListPublicKeysForUser` | `GET` | `/users/{username}/keys` | Unmatched | List public keys for a user |
| `GitHubRestClient.usersListPublicSshKeysForAuthenticatedUser` | `GET` | `/user/keys` | Unmatched | List public SSH keys for the authenticated user |
| `GitHubRestClient.usersListSocialAccountsForAuthenticatedUser` | `GET` | `/user/social_accounts` | Unmatched | List social accounts for the authenticated user |
| `GitHubRestClient.usersListSocialAccountsForUser` | `GET` | `/users/{username}/social_accounts` | Unmatched | List social accounts for a user |
| `GitHubRestClient.usersListSshSigningKeysForAuthenticatedUser` | `GET` | `/user/ssh_signing_keys` | Unmatched | List SSH signing keys for the authenticated user |
| `GitHubRestClient.usersListSshSigningKeysForUser` | `GET` | `/users/{username}/ssh_signing_keys` | Unmatched | List SSH signing keys for a user |
| `GitHubRestClient.usersSetPrimaryEmailVisibilityForAuthenticatedUser` | `PATCH` | `/user/email/visibility` | Unmatched | Set primary email visibility for the authenticated user |
| `GitHubRestClient.usersUnblock` | `DELETE` | `/user/blocks/{username}` | Unmatched | Unblock a user |
| `GitHubRestClient.usersUnfollow` | `DELETE` | `/user/following/{username}` | Unmatched | Unfollow a user |
| `GitHubRestClient.usersUpdateAuthenticated` | `PATCH` | `/user` | Unmatched | Update the authenticated user |

</details>

### GitLab: 1149 methods

<details>
<summary><strong>access_requests</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdAccessRequestsUserId` | `DELETE` | `/api/v4/groups/{id}/access_requests/{user_id}` | Unmatched | Deny an access request |
| `GitLabRestClient.deleteApiV4ProjectsIdAccessRequestsUserId` | `DELETE` | `/api/v4/projects/{id}/access_requests/{user_id}` | Unmatched | Deny an access request |
| `GitLabRestClient.getApiV4GroupsIdAccessRequests` | `GET` | `/api/v4/groups/{id}/access_requests` | Unmatched | List all access requests for a group |
| `GitLabRestClient.getApiV4ProjectsIdAccessRequests` | `GET` | `/api/v4/projects/{id}/access_requests` | Unmatched | List all access requests for a project |
| `GitLabRestClient.postApiV4GroupsIdAccessRequests` | `POST` | `/api/v4/groups/{id}/access_requests` | Unmatched | Request access to a group |
| `GitLabRestClient.postApiV4ProjectsIdAccessRequests` | `POST` | `/api/v4/projects/{id}/access_requests` | Unmatched | Request access to a project |
| `GitLabRestClient.putApiV4GroupsIdAccessRequestsUserIdApprove` | `PUT` | `/api/v4/groups/{id}/access_requests/{user_id}/approve` | Unmatched | Approve an access request |
| `GitLabRestClient.putApiV4ProjectsIdAccessRequestsUserIdApprove` | `PUT` | `/api/v4/projects/{id}/access_requests/{user_id}/approve` | Unmatched | Approve an access request |

</details>

<details>
<summary><strong>access_tokens</strong> (10)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4PersonalAccessTokensId` | `DELETE` | `/api/v4/personal_access_tokens/{id}` | Unmatched | Revoke a personal access token |
| `GitLabRestClient.deleteApiV4PersonalAccessTokensSelf` | `DELETE` | `/api/v4/personal_access_tokens/self` | Unmatched | Revoke a personal access token |
| `GitLabRestClient.getApiV4PersonalAccessTokens` | `GET` | `/api/v4/personal_access_tokens` | Unmatched | List all personal access tokens |
| `GitLabRestClient.getApiV4PersonalAccessTokensId` | `GET` | `/api/v4/personal_access_tokens/{id}` | Unmatched | Retrieve a personal access token |
| `GitLabRestClient.getApiV4PersonalAccessTokensSelf` | `GET` | `/api/v4/personal_access_tokens/self` | Unmatched | Retrieve a personal access token |
| `GitLabRestClient.getApiV4PersonalAccessTokensSelfAssociations` | `GET` | `/api/v4/personal_access_tokens/self/associations` | Unmatched | List all token associations |
| `GitLabRestClient.postApiV4GroupsIdAccessTokensSelfRotate` | `POST` | `/api/v4/groups/{id}/access_tokens/self/rotate` | Unmatched | Rotate a group access token |
| `GitLabRestClient.postApiV4PersonalAccessTokensIdRotate` | `POST` | `/api/v4/personal_access_tokens/{id}/rotate` | Unmatched | Rotate a personal access token |
| `GitLabRestClient.postApiV4PersonalAccessTokensSelfRotate` | `POST` | `/api/v4/personal_access_tokens/self/rotate` | Unmatched | Rotate a personal access token |
| `GitLabRestClient.postApiV4ProjectsIdAccessTokensSelfRotate` | `POST` | `/api/v4/projects/{id}/access_tokens/self/rotate` | Unmatched | Rotate a project access token |

</details>

<details>
<summary><strong>agents</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4JobAllowedAgents` | `GET` | `/api/v4/job/allowed_agents` | Unmatched | List all GitLab agents for Kubernetes by job token |

</details>

<details>
<summary><strong>alert_management</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdAlertManagementAlertsAlertIidMetricImagesMetricImageId` | `DELETE` | `/api/v4/projects/{id}/alert_management_alerts/{alert_iid}/metric_images/{metric_image_id}` | Unmatched | Delete a metric image |
| `GitLabRestClient.getApiV4ProjectsIdAlertManagementAlertsAlertIidMetricImages` | `GET` | `/api/v4/projects/{id}/alert_management_alerts/{alert_iid}/metric_images` | Unmatched | List all metric images |
| `GitLabRestClient.postApiV4ProjectsIdAlertManagementAlertsAlertIidMetricImages` | `POST` | `/api/v4/projects/{id}/alert_management_alerts/{alert_iid}/metric_images` | Unmatched | Upload a metric image |
| `GitLabRestClient.postApiV4ProjectsIdAlertManagementAlertsAlertIidMetricImagesAuthorize` | `POST` | `/api/v4/projects/{id}/alert_management_alerts/{alert_iid}/metric_images/authorize` | Unmatched | Workhorse authorize metric image file upload |
| `GitLabRestClient.putApiV4ProjectsIdAlertManagementAlertsAlertIidMetricImagesMetricImageId` | `PUT` | `/api/v4/projects/{id}/alert_management_alerts/{alert_iid}/metric_images/{metric_image_id}` | Unmatched | Update a metric image |

</details>

<details>
<summary><strong>applications</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ApplicationsId` | `DELETE` | `/api/v4/applications/{id}` | Unmatched | Delete an application |
| `GitLabRestClient.getApiV4Applications` | `GET` | `/api/v4/applications` | Unmatched | Get applications |
| `GitLabRestClient.postApiV4Applications` | `POST` | `/api/v4/applications` | Unmatched | Create a new application |
| `GitLabRestClient.postApiV4ApplicationsIdRenewSecret` | `POST` | `/api/v4/applications/{id}/renew-secret` | Unmatched | Renew an application secret |

</details>

<details>
<summary><strong>attestations</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdAttestationsAttestationIidDownload` | `GET` | `/api/v4/projects/{id}/attestations/{attestation_iid}/download` | Unmatched | Retrieve an attestation bundle |
| `GitLabRestClient.getApiV4ProjectsIdAttestationsSubjectDigest` | `GET` | `/api/v4/projects/{id}/attestations/{subject_digest}` | Unmatched | List all attestations for a project |

</details>

<details>
<summary><strong>audit_events</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4GroupsIdAuditEvents` | `GET` | `/api/v4/groups/{id}/audit_events` | Unmatched | List all group audit events |

</details>

<details>
<summary><strong>avatars</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4Avatar` | `GET` | `/api/v4/avatar` | Unmatched | Return avatar url for a user |
| `GitLabRestClient.getApiV4GroupsIdAvatar` | `GET` | `/api/v4/groups/{id}/avatar` | Unmatched | Download a group avatar |
| `GitLabRestClient.getApiV4ProjectsIdAvatar` | `GET` | `/api/v4/projects/{id}/avatar` | Unmatched | Download a project avatar |

</details>

<details>
<summary><strong>award_emoji</strong> (32)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdEpicsEpicIidAwardEmojiAwardId` | `DELETE` | `/api/v4/groups/{id}/epics/{epic_iid}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from an epic |
| `GitLabRestClient.deleteApiV4GroupsIdEpicsEpicIidNotesNoteIdAwardEmojiAwardId` | `DELETE` | `/api/v4/groups/{id}/epics/{epic_iid}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from an epic comment |
| `GitLabRestClient.deleteApiV4ProjectsIdIssuesIssueIidAwardEmojiAwardId` | `DELETE` | `/api/v4/projects/{id}/issues/{issue_iid}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from an issue |
| `GitLabRestClient.deleteApiV4ProjectsIdIssuesIssueIidNotesNoteIdAwardEmojiAwardId` | `DELETE` | `/api/v4/projects/{id}/issues/{issue_iid}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from an issue comment |
| `GitLabRestClient.deleteApiV4ProjectsIdMergeRequestsMergeRequestIidAwardEmojiAwardId` | `DELETE` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from a merge request |
| `GitLabRestClient.deleteApiV4ProjectsIdMergeRequestsMergeRequestIidNotesNoteIdAwardEmojiAwardId` | `DELETE` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from a merge request comment |
| `GitLabRestClient.deleteApiV4ProjectsIdSnippetsSnippetIdAwardEmojiAwardId` | `DELETE` | `/api/v4/projects/{id}/snippets/{snippet_id}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from a snippet |
| `GitLabRestClient.deleteApiV4ProjectsIdSnippetsSnippetIdNotesNoteIdAwardEmojiAwardId` | `DELETE` | `/api/v4/projects/{id}/snippets/{snippet_id}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Delete an emoji reaction from a snippet comment |
| `GitLabRestClient.getApiV4GroupsIdEpicsEpicIidAwardEmoji` | `GET` | `/api/v4/groups/{id}/epics/{epic_iid}/award_emoji` | Unmatched | List all emoji reactions for an epic |
| `GitLabRestClient.getApiV4GroupsIdEpicsEpicIidAwardEmojiAwardId` | `GET` | `/api/v4/groups/{id}/epics/{epic_iid}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from an epic |
| `GitLabRestClient.getApiV4GroupsIdEpicsEpicIidNotesNoteIdAwardEmoji` | `GET` | `/api/v4/groups/{id}/epics/{epic_iid}/notes/{note_id}/award_emoji` | Unmatched | List all emoji reactions for an epic comment |
| `GitLabRestClient.getApiV4GroupsIdEpicsEpicIidNotesNoteIdAwardEmojiAwardId` | `GET` | `/api/v4/groups/{id}/epics/{epic_iid}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from an epic comment |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidAwardEmoji` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/award_emoji` | Unmatched | List all emoji reactions for an issue |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidAwardEmojiAwardId` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from an issue |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidNotesNoteIdAwardEmoji` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/notes/{note_id}/award_emoji` | Unmatched | List all emoji reactions for an issue comment |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidNotesNoteIdAwardEmojiAwardId` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from an issue comment |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidAwardEmoji` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/award_emoji` | Unmatched | List all emoji reactions for a merge request |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidAwardEmojiAwardId` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from a merge request |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidNotesNoteIdAwardEmoji` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/notes/{note_id}/award_emoji` | Unmatched | List all emoji reactions for a merge request comment |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidNotesNoteIdAwardEmojiAwardId` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from a merge request comment |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetIdAwardEmoji` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}/award_emoji` | Unmatched | List all emoji reactions for a snippet |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetIdAwardEmojiAwardId` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from a snippet |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetIdNotesNoteIdAwardEmoji` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}/notes/{note_id}/award_emoji` | Unmatched | List all emoji reactions for a snippet comment |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetIdNotesNoteIdAwardEmojiAwardId` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}/notes/{note_id}/award_emoji/{award_id}` | Unmatched | Retrieve an emoji reaction from a snippet comment |
| `GitLabRestClient.postApiV4GroupsIdEpicsEpicIidAwardEmoji` | `POST` | `/api/v4/groups/{id}/epics/{epic_iid}/award_emoji` | Unmatched | Add an emoji reaction to an epic |
| `GitLabRestClient.postApiV4GroupsIdEpicsEpicIidNotesNoteIdAwardEmoji` | `POST` | `/api/v4/groups/{id}/epics/{epic_iid}/notes/{note_id}/award_emoji` | Unmatched | Add an emoji reaction to an epic comment |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidAwardEmoji` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/award_emoji` | Unmatched | Add an emoji reaction to an issue |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidNotesNoteIdAwardEmoji` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/notes/{note_id}/award_emoji` | Unmatched | Add an emoji reaction to an issue comment |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidAwardEmoji` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/award_emoji` | Unmatched | Add an emoji reaction to a merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidNotesNoteIdAwardEmoji` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/notes/{note_id}/award_emoji` | Unmatched | Add an emoji reaction to a merge request comment |
| `GitLabRestClient.postApiV4ProjectsIdSnippetsSnippetIdAwardEmoji` | `POST` | `/api/v4/projects/{id}/snippets/{snippet_id}/award_emoji` | Unmatched | Add an emoji reaction to a snippet |
| `GitLabRestClient.postApiV4ProjectsIdSnippetsSnippetIdNotesNoteIdAwardEmoji` | `POST` | `/api/v4/projects/{id}/snippets/{snippet_id}/notes/{note_id}/award_emoji` | Unmatched | Add an emoji reaction to a snippet comment |

</details>

<details>
<summary><strong>badges</strong> (12)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdBadgesBadgeId` | `DELETE` | `/api/v4/groups/{id}/badges/{badge_id}` | Unmatched | Delete a badge from a group |
| `GitLabRestClient.deleteApiV4ProjectsIdBadgesBadgeId` | `DELETE` | `/api/v4/projects/{id}/badges/{badge_id}` | Unmatched | Delete a badge from a project |
| `GitLabRestClient.getApiV4GroupsIdBadges` | `GET` | `/api/v4/groups/{id}/badges` | Unmatched | List all badges for a group |
| `GitLabRestClient.getApiV4GroupsIdBadgesBadgeId` | `GET` | `/api/v4/groups/{id}/badges/{badge_id}` | Unmatched | Retrieve a badge for a group |
| `GitLabRestClient.getApiV4GroupsIdBadgesRender` | `GET` | `/api/v4/groups/{id}/badges/render` | Unmatched | Retrieve a badge preview for a group |
| `GitLabRestClient.getApiV4ProjectsIdBadges` | `GET` | `/api/v4/projects/{id}/badges` | Unmatched | List all badges for a project |
| `GitLabRestClient.getApiV4ProjectsIdBadgesBadgeId` | `GET` | `/api/v4/projects/{id}/badges/{badge_id}` | Unmatched | Retrieve a badge for a project |
| `GitLabRestClient.getApiV4ProjectsIdBadgesRender` | `GET` | `/api/v4/projects/{id}/badges/render` | Unmatched | Retrieve a badge preview for a project |
| `GitLabRestClient.postApiV4GroupsIdBadges` | `POST` | `/api/v4/groups/{id}/badges` | Unmatched | Create a badge for a group |
| `GitLabRestClient.postApiV4ProjectsIdBadges` | `POST` | `/api/v4/projects/{id}/badges` | Unmatched | Create a badge for a project |
| `GitLabRestClient.putApiV4GroupsIdBadgesBadgeId` | `PUT` | `/api/v4/groups/{id}/badges/{badge_id}` | Unmatched | Update a badge for a group |
| `GitLabRestClient.putApiV4ProjectsIdBadgesBadgeId` | `PUT` | `/api/v4/projects/{id}/badges/{badge_id}` | Unmatched | Update a badge for a project |

</details>

<details>
<summary><strong>batched_background_migrations</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4AdminBatchedBackgroundMigrations` | `GET` | `/api/v4/admin/batched_background_migrations` | `U:gitlab.geo-admin` | Get the list of batched background migrations |
| `GitLabRestClient.getApiV4AdminBatchedBackgroundMigrationsId` | `GET` | `/api/v4/admin/batched_background_migrations/{id}` | Unmatched | Retrieve a batched background migration |
| `GitLabRestClient.putApiV4AdminBatchedBackgroundMigrationsIdPause` | `PUT` | `/api/v4/admin/batched_background_migrations/{id}/pause` | `U:gitlab.geo-admin` | Pause a batched background migration |
| `GitLabRestClient.putApiV4AdminBatchedBackgroundMigrationsIdResume` | `PUT` | `/api/v4/admin/batched_background_migrations/{id}/resume` | Unmatched | Resume a batched background migration |

</details>

<details>
<summary><strong>batched_background_operations</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4AdminBatchedBackgroundOperations` | `GET` | `/api/v4/admin/batched_background_operations` | Unmatched | Get the list of batched background operations |
| `GitLabRestClient.getApiV4AdminBatchedBackgroundOperationsId` | `GET` | `/api/v4/admin/batched_background_operations/{id}` | Unmatched | Retrieve a batched background operation |
| `GitLabRestClient.putApiV4AdminBatchedBackgroundOperationsIdRestart` | `PUT` | `/api/v4/admin/batched_background_operations/{id}/restart` | Unmatched | Restart a batched background operation |
| `GitLabRestClient.putApiV4AdminBatchedBackgroundOperationsIdStop` | `PUT` | `/api/v4/admin/batched_background_operations/{id}/stop` | Unmatched | Stop a batched background operation |

</details>

<details>
<summary><strong>branches</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdRepositoryBranchesBranch` | `DELETE` | `/api/v4/projects/{id}/repository/branches/{branch}` | `E:branch.delete.v1` | Delete a repository branch |
| `GitLabRestClient.deleteApiV4ProjectsIdRepositoryMergedBranches` | `DELETE` | `/api/v4/projects/{id}/repository/merged_branches` | Unmatched | Delete all merged branches |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryBranches` | `GET` | `/api/v4/projects/{id}/repository/branches` | `E:branch.list.v1` | List all repository branches |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryBranchesBranch` | `GET` | `/api/v4/projects/{id}/repository/branches/{branch}` | `E:branch.get.v1` | Retrieve a repository branch |
| `GitLabRestClient.headApiV4ProjectsIdRepositoryBranchesBranch` | `HEAD` | `/api/v4/projects/{id}/repository/branches/{branch}` | Unmatched | Check if a branch exists |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryBranches` | `POST` | `/api/v4/projects/{id}/repository/branches` | `E:branch.create.v1` | Create a repository branch |
| `GitLabRestClient.putApiV4ProjectsIdRepositoryBranchesBranchProtect` | `PUT` | `/api/v4/projects/{id}/repository/branches/{branch}/protect` | Unmatched | Protect a single branch |
| `GitLabRestClient.putApiV4ProjectsIdRepositoryBranchesBranchUnprotect` | `PUT` | `/api/v4/projects/{id}/repository/branches/{branch}/unprotect` | Unmatched | Unprotect a single branch |

</details>

<details>
<summary><strong>broadcast_messages</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4BroadcastMessagesId` | `DELETE` | `/api/v4/broadcast_messages/{id}` | Unmatched | Delete a broadcast message |
| `GitLabRestClient.getApiV4BroadcastMessages` | `GET` | `/api/v4/broadcast_messages` | Unmatched | List all broadcast messages |
| `GitLabRestClient.getApiV4BroadcastMessagesId` | `GET` | `/api/v4/broadcast_messages/{id}` | Unmatched | Retrieve a broadcast message |
| `GitLabRestClient.postApiV4BroadcastMessages` | `POST` | `/api/v4/broadcast_messages` | Unmatched | Create a broadcast message |
| `GitLabRestClient.putApiV4BroadcastMessagesId` | `PUT` | `/api/v4/broadcast_messages/{id}` | Unmatched | Update a broadcast message |

</details>

<details>
<summary><strong>ci_catalog</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.postApiV4ProjectsIdCatalogPublish` | `POST` | `/api/v4/projects/{id}/catalog/publish` | Unmatched | Publish a new component project release as version to the CI/CD catalog |

</details>

<details>
<summary><strong>ci_jobs</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4Job` | `GET` | `/api/v4/job` | Unmatched | Retrieve a job by job token |
| `GitLabRestClient.getApiV4ProjectsIdJobs` | `GET` | `/api/v4/projects/{id}/jobs` | Unmatched | List all jobs for a project |
| `GitLabRestClient.getApiV4ProjectsIdJobsJobId` | `GET` | `/api/v4/projects/{id}/jobs/{job_id}` | `P:ci.jobs-logs.v1` | Retrieve a job |
| `GitLabRestClient.getApiV4ProjectsIdJobsJobIdTrace` | `GET` | `/api/v4/projects/{id}/jobs/{job_id}/trace` | `P:ci.jobs-logs.v1` | Get a trace of a specific job of a project |
| `GitLabRestClient.postApiV4ProjectsIdJobsJobIdCancel` | `POST` | `/api/v4/projects/{id}/jobs/{job_id}/cancel` | Unmatched | Cancel a job |
| `GitLabRestClient.postApiV4ProjectsIdJobsJobIdErase` | `POST` | `/api/v4/projects/{id}/jobs/{job_id}/erase` | Unmatched | Erase a job |
| `GitLabRestClient.postApiV4ProjectsIdJobsJobIdPlay` | `POST` | `/api/v4/projects/{id}/jobs/{job_id}/play` | Unmatched | Run a job |
| `GitLabRestClient.postApiV4ProjectsIdJobsJobIdRetry` | `POST` | `/api/v4/projects/{id}/jobs/{job_id}/retry` | Unmatched | Retry a job |

</details>

<details>
<summary><strong>ci_lint</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdCiLint` | `GET` | `/api/v4/projects/{id}/ci/lint` | Unmatched | Validate existing CI/CD configuration |
| `GitLabRestClient.postApiV4ProjectsIdCiLint` | `POST` | `/api/v4/projects/{id}/ci/lint` | Unmatched | Validate a CI/CD configuration |

</details>

<details>
<summary><strong>ci_resource_groups</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdResourceGroups` | `GET` | `/api/v4/projects/{id}/resource_groups` | Unmatched | List all resource groups |
| `GitLabRestClient.getApiV4ProjectsIdResourceGroupsKey` | `GET` | `/api/v4/projects/{id}/resource_groups/{key}` | Unmatched | Retrieve a resource group |
| `GitLabRestClient.getApiV4ProjectsIdResourceGroupsKeyCurrentJob` | `GET` | `/api/v4/projects/{id}/resource_groups/{key}/current_job` | Unmatched | Retrieve current job for a resource group |
| `GitLabRestClient.getApiV4ProjectsIdResourceGroupsKeyUpcomingJobs` | `GET` | `/api/v4/projects/{id}/resource_groups/{key}/upcoming_jobs` | Unmatched | List all upcoming jobs for a resource group |
| `GitLabRestClient.putApiV4ProjectsIdResourceGroupsKey` | `PUT` | `/api/v4/projects/{id}/resource_groups/{key}` | Unmatched | Update a resource group |

</details>

<details>
<summary><strong>ci_runners</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4Runners` | `DELETE` | `/api/v4/runners` | Unmatched | Delete a runner by authentication token |
| `GitLabRestClient.deleteApiV4RunnersManagers` | `DELETE` | `/api/v4/runners/managers` | Unmatched | Internal endpoint that deletes a runner manager by authentication token and system ID. |
| `GitLabRestClient.getApiV4RunnersRouterDiscovery` | `GET` | `/api/v4/runners/router/discovery` | Unmatched | Discover Job Router information |
| `GitLabRestClient.postApiV4Runners` | `POST` | `/api/v4/runners` | Unmatched | Create a runner |
| `GitLabRestClient.postApiV4RunnersResetAuthenticationToken` | `POST` | `/api/v4/runners/reset_authentication_token` | Unmatched | Reset a runner authentication token with the current token |
| `GitLabRestClient.postApiV4RunnersVerify` | `POST` | `/api/v4/runners/verify` | Unmatched | Verify authentication for a registered runner |

</details>

<details>
<summary><strong>ci_triggers</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdTriggersTriggerId` | `DELETE` | `/api/v4/projects/{id}/triggers/{trigger_id}` | Unmatched | Delete a pipeline trigger token |
| `GitLabRestClient.getApiV4ProjectsIdTriggers` | `GET` | `/api/v4/projects/{id}/triggers` | Unmatched | List all project trigger tokens |
| `GitLabRestClient.getApiV4ProjectsIdTriggersTriggerId` | `GET` | `/api/v4/projects/{id}/triggers/{trigger_id}` | Unmatched | Retrieve trigger token details |
| `GitLabRestClient.postApiV4ProjectsIdRefRefTriggerPipeline` | `POST` | `/api/v4/projects/{id}/ref/{ref}/trigger/pipeline` | Unmatched | Trigger a pipeline with a token |
| `GitLabRestClient.postApiV4ProjectsIdTriggers` | `POST` | `/api/v4/projects/{id}/triggers` | Unmatched | Create a trigger token |
| `GitLabRestClient.putApiV4ProjectsIdTriggersTriggerId` | `PUT` | `/api/v4/projects/{id}/triggers/{trigger_id}` | Unmatched | Update a pipeline trigger token |

</details>

<details>
<summary><strong>ci_variables</strong> (15)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4AdminCiVariablesKey` | `DELETE` | `/api/v4/admin/ci/variables/{key}` | Unmatched | Delete instance variable |
| `GitLabRestClient.deleteApiV4GroupsIdVariablesKey` | `DELETE` | `/api/v4/groups/{id}/variables/{key}` | Unmatched | Delete a group variable |
| `GitLabRestClient.deleteApiV4ProjectsIdVariablesKey` | `DELETE` | `/api/v4/projects/{id}/variables/{key}` | Unmatched | Delete a variable |
| `GitLabRestClient.getApiV4AdminCiVariables` | `GET` | `/api/v4/admin/ci/variables` | Unmatched | List all instance variables |
| `GitLabRestClient.getApiV4AdminCiVariablesKey` | `GET` | `/api/v4/admin/ci/variables/{key}` | Unmatched | Retrieve instance variable details |
| `GitLabRestClient.getApiV4GroupsIdVariables` | `GET` | `/api/v4/groups/{id}/variables` | Unmatched | List all group variables |
| `GitLabRestClient.getApiV4GroupsIdVariablesKey` | `GET` | `/api/v4/groups/{id}/variables/{key}` | Unmatched | Retrieve details of a group variable |
| `GitLabRestClient.getApiV4ProjectsIdVariables` | `GET` | `/api/v4/projects/{id}/variables` | Unmatched | List all project variables |
| `GitLabRestClient.getApiV4ProjectsIdVariablesKey` | `GET` | `/api/v4/projects/{id}/variables/{key}` | Unmatched | Retrieve a single variable |
| `GitLabRestClient.postApiV4AdminCiVariables` | `POST` | `/api/v4/admin/ci/variables` | Unmatched | Create instance variable |
| `GitLabRestClient.postApiV4GroupsIdVariables` | `POST` | `/api/v4/groups/{id}/variables` | Unmatched | Create a group variable |
| `GitLabRestClient.postApiV4ProjectsIdVariables` | `POST` | `/api/v4/projects/{id}/variables` | Unmatched | Create a variable |
| `GitLabRestClient.putApiV4AdminCiVariablesKey` | `PUT` | `/api/v4/admin/ci/variables/{key}` | Unmatched | Update an instance variable |
| `GitLabRestClient.putApiV4GroupsIdVariablesKey` | `PUT` | `/api/v4/groups/{id}/variables/{key}` | Unmatched | Update a group variable |
| `GitLabRestClient.putApiV4ProjectsIdVariablesKey` | `PUT` | `/api/v4/projects/{id}/variables/{key}` | Unmatched | Update a variable |

</details>

<details>
<summary><strong>cluster_agents</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdClusterAgentsAgentId` | `DELETE` | `/api/v4/projects/{id}/cluster_agents/{agent_id}` | Unmatched | Delete an agent |
| `GitLabRestClient.deleteApiV4ProjectsIdClusterAgentsAgentIdTokensTokenId` | `DELETE` | `/api/v4/projects/{id}/cluster_agents/{agent_id}/tokens/{token_id}` | Unmatched | Revoke an agent token |
| `GitLabRestClient.getApiV4ProjectsIdClusterAgents` | `GET` | `/api/v4/projects/{id}/cluster_agents` | `U:gitlab.terraform-kubernetes` | List all agents |
| `GitLabRestClient.getApiV4ProjectsIdClusterAgentsAgentId` | `GET` | `/api/v4/projects/{id}/cluster_agents/{agent_id}` | Unmatched | Retrieve details on an agent |
| `GitLabRestClient.getApiV4ProjectsIdClusterAgentsAgentIdTokens` | `GET` | `/api/v4/projects/{id}/cluster_agents/{agent_id}/tokens` | Unmatched | List all agent tokens |
| `GitLabRestClient.getApiV4ProjectsIdClusterAgentsAgentIdTokensTokenId` | `GET` | `/api/v4/projects/{id}/cluster_agents/{agent_id}/tokens/{token_id}` | Unmatched | Retrieve an agent token |
| `GitLabRestClient.postApiV4ProjectsIdClusterAgents` | `POST` | `/api/v4/projects/{id}/cluster_agents` | `U:gitlab.terraform-kubernetes` | Create an agent |
| `GitLabRestClient.postApiV4ProjectsIdClusterAgentsAgentIdTokens` | `POST` | `/api/v4/projects/{id}/cluster_agents/{agent_id}/tokens` | Unmatched | Create an agent token |

</details>

<details>
<summary><strong>clusters</strong> (16)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4AdminClustersClusterId` | `DELETE` | `/api/v4/admin/clusters/{cluster_id}` | Unmatched | Delete instance cluster |
| `GitLabRestClient.deleteApiV4GroupsIdClustersClusterId` | `DELETE` | `/api/v4/groups/{id}/clusters/{cluster_id}` | Unmatched | Delete a group cluster |
| `GitLabRestClient.deleteApiV4ProjectsIdClustersClusterId` | `DELETE` | `/api/v4/projects/{id}/clusters/{cluster_id}` | Unmatched | Delete cluster from a project |
| `GitLabRestClient.getApiV4AdminClusters` | `GET` | `/api/v4/admin/clusters` | Unmatched | List all instance clusters |
| `GitLabRestClient.getApiV4AdminClustersClusterId` | `GET` | `/api/v4/admin/clusters/{cluster_id}` | Unmatched | Retrieve a single instance cluster |
| `GitLabRestClient.getApiV4DiscoverCertBasedClusters` | `GET` | `/api/v4/discover-cert-based-clusters` | Unmatched | List all certificate-based clusters |
| `GitLabRestClient.getApiV4GroupsIdClusters` | `GET` | `/api/v4/groups/{id}/clusters` | Unmatched | List all group clusters |
| `GitLabRestClient.getApiV4GroupsIdClustersClusterId` | `GET` | `/api/v4/groups/{id}/clusters/{cluster_id}` | Unmatched | Retrieve a group cluster |
| `GitLabRestClient.getApiV4ProjectsIdClusters` | `GET` | `/api/v4/projects/{id}/clusters` | Unmatched | List all clusters in a project |
| `GitLabRestClient.getApiV4ProjectsIdClustersClusterId` | `GET` | `/api/v4/projects/{id}/clusters/{cluster_id}` | Unmatched | Retrieve a cluster from a project |
| `GitLabRestClient.postApiV4AdminClustersAdd` | `POST` | `/api/v4/admin/clusters/add` | Unmatched | Create an instance cluster |
| `GitLabRestClient.postApiV4GroupsIdClustersUser` | `POST` | `/api/v4/groups/{id}/clusters/user` | Unmatched | Create a group cluster |
| `GitLabRestClient.postApiV4ProjectsIdClustersUser` | `POST` | `/api/v4/projects/{id}/clusters/user` | Unmatched | Add a cluster to a project |
| `GitLabRestClient.putApiV4AdminClustersClusterId` | `PUT` | `/api/v4/admin/clusters/{cluster_id}` | Unmatched | Update an instance cluster |
| `GitLabRestClient.putApiV4GroupsIdClustersClusterId` | `PUT` | `/api/v4/groups/{id}/clusters/{cluster_id}` | Unmatched | Update a group cluster |
| `GitLabRestClient.putApiV4ProjectsIdClustersClusterId` | `PUT` | `/api/v4/projects/{id}/clusters/{cluster_id}` | Unmatched | Update a cluster in a project |

</details>

<details>
<summary><strong>commit_statuses</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaStatuses` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}/statuses` | `E:commit-status.v1` | List all commit statuses |
| `GitLabRestClient.postApiV4ProjectsIdStatusesSha` | `POST` | `/api/v4/projects/{id}/statuses/{sha}` | `E:commit-status.v1` | Create or update a commit pipeline status |

</details>

<details>
<summary><strong>commits</strong> (12)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommits` | `GET` | `/api/v4/projects/{id}/repository/commits` | `E:commit.list.v1` | List all repository commits |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsSha` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}` | `E:commit.get.v1` | Retrieve a commit |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaComments` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}/comments` | Unmatched | List all commit comments |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaDiff` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}/diff` | Unmatched | Retrieve a commit diff |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaMergeRequests` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}/merge_requests` | Unmatched | List all merge requests associated with a commit |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaRefs` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}/refs` | Unmatched | List all references a commit is pushed to |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaSequence` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}/sequence` | Unmatched | Retrieve a commit sequence |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCommitsShaSignature` | `GET` | `/api/v4/projects/{id}/repository/commits/{sha}/signature` | Unmatched | Retrieve a commit signature |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryCommits` | `POST` | `/api/v4/projects/{id}/repository/commits` | `P:content.write.v1` | Create a commit |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryCommitsShaCherryPick` | `POST` | `/api/v4/projects/{id}/repository/commits/{sha}/cherry_pick` | Unmatched | Cherry-pick a commit |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryCommitsShaComments` | `POST` | `/api/v4/projects/{id}/repository/commits/{sha}/comments` | Unmatched | Create a comment on a commit |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryCommitsShaRevert` | `POST` | `/api/v4/projects/{id}/repository/commits/{sha}/revert` | Unmatched | Revert a commit |

</details>

<details>
<summary><strong>container_registry</strong> (9)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdRegistryRepositoriesRepositoryId` | `DELETE` | `/api/v4/projects/{id}/registry/repositories/{repository_id}` | Unmatched | Delete registry repository |
| `GitLabRestClient.deleteApiV4ProjectsIdRegistryRepositoriesRepositoryIdTags` | `DELETE` | `/api/v4/projects/{id}/registry/repositories/{repository_id}/tags` | Unmatched | Delete multiple registry repository tags |
| `GitLabRestClient.deleteApiV4ProjectsIdRegistryRepositoriesRepositoryIdTagsTagName` | `DELETE` | `/api/v4/projects/{id}/registry/repositories/{repository_id}/tags/{tag_name}` | Unmatched | Delete a registry repository tag |
| `GitLabRestClient.getApiV4GroupsIdRegistryRepositories` | `GET` | `/api/v4/groups/{id}/registry/repositories` | Unmatched | List all registry repositories for a group |
| `GitLabRestClient.getApiV4ProjectsIdRegistryRepositories` | `GET` | `/api/v4/projects/{id}/registry/repositories` | Unmatched | List all registry repositories for a project |
| `GitLabRestClient.getApiV4ProjectsIdRegistryRepositoriesRepositoryIdTags` | `GET` | `/api/v4/projects/{id}/registry/repositories/{repository_id}/tags` | Unmatched | List all registry repository tags for a project |
| `GitLabRestClient.getApiV4ProjectsIdRegistryRepositoriesRepositoryIdTagsTagName` | `GET` | `/api/v4/projects/{id}/registry/repositories/{repository_id}/tags/{tag_name}` | Unmatched | Retrieve details of a registry repository tag |
| `GitLabRestClient.getApiV4RegistryRepositoriesId` | `GET` | `/api/v4/registry/repositories/{id}` | Unmatched | Retrieve details of a container registry repository |
| `GitLabRestClient.postApiV4ContainerRegistryEventEvents` | `POST` | `/api/v4/container_registry_event/events` | Unmatched | Receives notifications from the container registry when an operation occurs |

</details>

<details>
<summary><strong>custom_attributes</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdCustomAttributesKey` | `DELETE` | `/api/v4/groups/{id}/custom_attributes/{key}` | Unmatched | Delete a custom attribute for a group |
| `GitLabRestClient.deleteApiV4ProjectsIdCustomAttributesKey` | `DELETE` | `/api/v4/projects/{id}/custom_attributes/{key}` | Unmatched | Delete a custom attribute for a project |
| `GitLabRestClient.getApiV4GroupsIdCustomAttributes` | `GET` | `/api/v4/groups/{id}/custom_attributes` | Unmatched | List all custom attributes for a group |
| `GitLabRestClient.getApiV4GroupsIdCustomAttributesKey` | `GET` | `/api/v4/groups/{id}/custom_attributes/{key}` | Unmatched | Retrieve a custom attribute for a group |
| `GitLabRestClient.getApiV4ProjectsIdCustomAttributes` | `GET` | `/api/v4/projects/{id}/custom_attributes` | Unmatched | List all custom attributes for a project |
| `GitLabRestClient.getApiV4ProjectsIdCustomAttributesKey` | `GET` | `/api/v4/projects/{id}/custom_attributes/{key}` | Unmatched | Retrieve a custom attribute for a project |
| `GitLabRestClient.putApiV4GroupsIdCustomAttributesKey` | `PUT` | `/api/v4/groups/{id}/custom_attributes/{key}` | Unmatched | Creates or updates a custom attribute for a group |
| `GitLabRestClient.putApiV4ProjectsIdCustomAttributesKey` | `PUT` | `/api/v4/projects/{id}/custom_attributes/{key}` | Unmatched | Creates or updates a custom attribute for a project |

</details>

<details>
<summary><strong>database_dictionary</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4AdminDatabasesDatabaseNameDictionaryTablesTableName` | `GET` | `/api/v4/admin/databases/{database_name}/dictionary/tables/{table_name}` | `U:gitlab.geo-admin` | Retrieve dictionary details |
| `GitLabRestClient.getApiV4DatabasesDatabaseNameDictionaryTables` | `GET` | `/api/v4/databases/{database_name}/dictionary/tables` | Unmatched | List dictionary tables |

</details>

<details>
<summary><strong>dependency_proxy</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdDependencyProxyCache` | `DELETE` | `/api/v4/groups/{id}/dependency_proxy/cache` | Unmatched | Purge the dependency proxy for a group |

</details>

<details>
<summary><strong>deploy_resources</strong> (24)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdDeployTokensTokenId` | `DELETE` | `/api/v4/groups/{id}/deploy_tokens/{token_id}` | Unmatched | Delete a group deploy token |
| `GitLabRestClient.deleteApiV4ProjectsIdDeployKeysKeyId` | `DELETE` | `/api/v4/projects/{id}/deploy_keys/{key_id}` | `E:deploy-key.crud.v1` | Delete a deploy key |
| `GitLabRestClient.deleteApiV4ProjectsIdDeployTokensTokenId` | `DELETE` | `/api/v4/projects/{id}/deploy_tokens/{token_id}` | Unmatched | Delete a project deploy token |
| `GitLabRestClient.deleteApiV4ProjectsIdDeploymentsDeploymentId` | `DELETE` | `/api/v4/projects/{id}/deployments/{deployment_id}` | Unmatched | Delete a deployment |
| `GitLabRestClient.getApiV4DeployKeys` | `GET` | `/api/v4/deploy_keys` | Unmatched | List all deploy keys |
| `GitLabRestClient.getApiV4DeployTokens` | `GET` | `/api/v4/deploy_tokens` | Unmatched | List all deploy tokens |
| `GitLabRestClient.getApiV4GroupsIdDeployTokens` | `GET` | `/api/v4/groups/{id}/deploy_tokens` | Unmatched | List all group deploy tokens |
| `GitLabRestClient.getApiV4GroupsIdDeployTokensTokenId` | `GET` | `/api/v4/groups/{id}/deploy_tokens/{token_id}` | Unmatched | Retrieve a group deploy token |
| `GitLabRestClient.getApiV4ProjectsIdDeployKeys` | `GET` | `/api/v4/projects/{id}/deploy_keys` | `E:deploy-key.crud.v1` | List all deploy keys for project |
| `GitLabRestClient.getApiV4ProjectsIdDeployKeysKeyId` | `GET` | `/api/v4/projects/{id}/deploy_keys/{key_id}` | `E:deploy-key.crud.v1` | Retrieve a deploy key |
| `GitLabRestClient.getApiV4ProjectsIdDeployTokens` | `GET` | `/api/v4/projects/{id}/deploy_tokens` | Unmatched | List all project deploy tokens |
| `GitLabRestClient.getApiV4ProjectsIdDeployTokensTokenId` | `GET` | `/api/v4/projects/{id}/deploy_tokens/{token_id}` | Unmatched | Retrieve a project deploy token |
| `GitLabRestClient.getApiV4ProjectsIdDeployments` | `GET` | `/api/v4/projects/{id}/deployments` | `P:deployment.environment.v1` | List all project deployments |
| `GitLabRestClient.getApiV4ProjectsIdDeploymentsDeploymentId` | `GET` | `/api/v4/projects/{id}/deployments/{deployment_id}` | Unmatched | Retrieve a deployment |
| `GitLabRestClient.getApiV4ProjectsIdDeploymentsDeploymentIdMergeRequests` | `GET` | `/api/v4/projects/{id}/deployments/{deployment_id}/merge_requests` | Unmatched | List all merge requests associated with a deployment |
| `GitLabRestClient.postApiV4DeployKeys` | `POST` | `/api/v4/deploy_keys` | Unmatched | Create a deploy key |
| `GitLabRestClient.postApiV4GroupsIdDeployTokens` | `POST` | `/api/v4/groups/{id}/deploy_tokens` | Unmatched | Create a group deploy token |
| `GitLabRestClient.postApiV4ProjectsIdDeployKeys` | `POST` | `/api/v4/projects/{id}/deploy_keys` | `E:deploy-key.crud.v1` | Add a deploy key for a project |
| `GitLabRestClient.postApiV4ProjectsIdDeployKeysKeyIdEnable` | `POST` | `/api/v4/projects/{id}/deploy_keys/{key_id}/enable` | Unmatched | Enable a deploy key |
| `GitLabRestClient.postApiV4ProjectsIdDeployTokens` | `POST` | `/api/v4/projects/{id}/deploy_tokens` | Unmatched | Create a project deploy token |
| `GitLabRestClient.postApiV4ProjectsIdDeployments` | `POST` | `/api/v4/projects/{id}/deployments` | `P:deployment.environment.v1` | Create a deployment |
| `GitLabRestClient.postApiV4ProjectsIdDeploymentsDeploymentIdApproval` | `POST` | `/api/v4/projects/{id}/deployments/{deployment_id}/approval` | Unmatched | Approve or reject a deployment |
| `GitLabRestClient.putApiV4ProjectsIdDeployKeysKeyId` | `PUT` | `/api/v4/projects/{id}/deploy_keys/{key_id}` | `E:deploy-key.crud.v1` | Update a deploy key |
| `GitLabRestClient.putApiV4ProjectsIdDeploymentsDeploymentId` | `PUT` | `/api/v4/projects/{id}/deployments/{deployment_id}` | `P:deployment.environment.v1` | Update a deployment |

</details>

<details>
<summary><strong>draft_notes</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteId` | `DELETE` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/draft_notes/{draft_note_id}` | Unmatched | Delete a draft note |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/draft_notes` | `P:pull-request.comments.v1` | List all merge request draft notes |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteId` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/draft_notes/{draft_note_id}` | Unmatched | Retrieve a draft note |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/draft_notes` | `P:pull-request.comments.v1` | Create a draft note |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesBulkPublish` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/draft_notes/bulk_publish` | `P:pull-request.comments.v1` | Publish all pending draft notes |
| `GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteId` | `PUT` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/draft_notes/{draft_note_id}` | Unmatched | Update a draft note |
| `GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesDraftNoteIdPublish` | `PUT` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/draft_notes/{draft_note_id}/publish` | Unmatched | Publish a draft note |

</details>

<details>
<summary><strong>environments</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdEnvironmentsEnvironmentId` | `DELETE` | `/api/v4/projects/{id}/environments/{environment_id}` | Unmatched | Delete an environment |
| `GitLabRestClient.deleteApiV4ProjectsIdEnvironmentsReviewApps` | `DELETE` | `/api/v4/projects/{id}/environments/review_apps` | Unmatched | Schedule multiple stopped review apps for deletion |
| `GitLabRestClient.getApiV4ProjectsIdEnvironments` | `GET` | `/api/v4/projects/{id}/environments` | Unmatched | List all environments |
| `GitLabRestClient.getApiV4ProjectsIdEnvironmentsEnvironmentId` | `GET` | `/api/v4/projects/{id}/environments/{environment_id}` | Unmatched | Retrieve an environment |
| `GitLabRestClient.postApiV4ProjectsIdEnvironments` | `POST` | `/api/v4/projects/{id}/environments` | `P:deployment.environment.v1` | Create an environment |
| `GitLabRestClient.postApiV4ProjectsIdEnvironmentsEnvironmentIdStop` | `POST` | `/api/v4/projects/{id}/environments/{environment_id}/stop` | `P:deployment.environment.v1` | Stop an environment |
| `GitLabRestClient.postApiV4ProjectsIdEnvironmentsStopStale` | `POST` | `/api/v4/projects/{id}/environments/stop_stale` | Unmatched | Stop stale environments |
| `GitLabRestClient.putApiV4ProjectsIdEnvironmentsEnvironmentId` | `PUT` | `/api/v4/projects/{id}/environments/{environment_id}` | Unmatched | Update an existing environment |

</details>

<details>
<summary><strong>error_tracking</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdErrorTrackingClientKeysKeyId` | `DELETE` | `/api/v4/projects/{id}/error_tracking/client_keys/{key_id}` | Unmatched | Delete a client key |
| `GitLabRestClient.getApiV4ProjectsIdErrorTrackingClientKeys` | `GET` | `/api/v4/projects/{id}/error_tracking/client_keys` | Unmatched | List all project client keys |
| `GitLabRestClient.getApiV4ProjectsIdErrorTrackingSettings` | `GET` | `/api/v4/projects/{id}/error_tracking/settings` | Unmatched | Retrieve Error Tracking settings for a project |
| `GitLabRestClient.patchApiV4ProjectsIdErrorTrackingSettings` | `PATCH` | `/api/v4/projects/{id}/error_tracking/settings` | Unmatched | Update Error Tracking settings for a project |
| `GitLabRestClient.postApiV4ProjectsIdErrorTrackingClientKeys` | `POST` | `/api/v4/projects/{id}/error_tracking/client_keys` | Unmatched | Create a client key |
| `GitLabRestClient.putApiV4ProjectsIdErrorTrackingSettings` | `PUT` | `/api/v4/projects/{id}/error_tracking/settings` | Unmatched | Create Error Tracking settings for a project |

</details>

<details>
<summary><strong>events</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4Events` | `GET` | `/api/v4/events` | Unmatched | List all events |
| `GitLabRestClient.getApiV4ProjectsIdEvents` | `GET` | `/api/v4/projects/{id}/events` | Unmatched | List all visible events for a project |
| `GitLabRestClient.getApiV4UsersIdEvents` | `GET` | `/api/v4/users/{id}/events` | Unmatched | Retrieve contribution events for a user |

</details>

<details>
<summary><strong>feature_flags</strong> (10)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdFeatureFlagsFeatureFlagName` | `DELETE` | `/api/v4/projects/{id}/feature_flags/{feature_flag_name}` | Unmatched | Delete a feature flag |
| `GitLabRestClient.deleteApiV4ProjectsIdFeatureFlagsUserListsIid` | `DELETE` | `/api/v4/projects/{id}/feature_flags_user_lists/{iid}` | Unmatched | Delete feature flag user list |
| `GitLabRestClient.getApiV4ProjectsIdFeatureFlags` | `GET` | `/api/v4/projects/{id}/feature_flags` | `U:gitlab.feature-flags` | List all feature flags for a project |
| `GitLabRestClient.getApiV4ProjectsIdFeatureFlagsFeatureFlagName` | `GET` | `/api/v4/projects/{id}/feature_flags/{feature_flag_name}` | Unmatched | Retrieve a feature flag |
| `GitLabRestClient.getApiV4ProjectsIdFeatureFlagsUserLists` | `GET` | `/api/v4/projects/{id}/feature_flags_user_lists` | Unmatched | List all feature flag user lists for a project |
| `GitLabRestClient.getApiV4ProjectsIdFeatureFlagsUserListsIid` | `GET` | `/api/v4/projects/{id}/feature_flags_user_lists/{iid}` | Unmatched | Retrieve a feature flag user list |
| `GitLabRestClient.postApiV4ProjectsIdFeatureFlags` | `POST` | `/api/v4/projects/{id}/feature_flags` | `U:gitlab.feature-flags` | Create a feature flag |
| `GitLabRestClient.postApiV4ProjectsIdFeatureFlagsUserLists` | `POST` | `/api/v4/projects/{id}/feature_flags_user_lists` | Unmatched | Create a feature flag user list |
| `GitLabRestClient.putApiV4ProjectsIdFeatureFlagsFeatureFlagName` | `PUT` | `/api/v4/projects/{id}/feature_flags/{feature_flag_name}` | Unmatched | Update a feature flag |
| `GitLabRestClient.putApiV4ProjectsIdFeatureFlagsUserListsIid` | `PUT` | `/api/v4/projects/{id}/feature_flags_user_lists/{iid}` | Unmatched | Update a feature flag user list |

</details>

<details>
<summary><strong>features</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4FeaturesName` | `DELETE` | `/api/v4/features/{name}` | Unmatched | Delete a feature |
| `GitLabRestClient.getApiV4Features` | `GET` | `/api/v4/features` | `U:gitlab.feature-flags` | List all feature flags |
| `GitLabRestClient.getApiV4FeaturesDefinitions` | `GET` | `/api/v4/features/definitions` | Unmatched | List all feature flag definitions |
| `GitLabRestClient.postApiV4FeaturesName` | `POST` | `/api/v4/features/{name}` | `U:gitlab.feature-flags` | Create or update a feature flag |

</details>

<details>
<summary><strong>files</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdRepositoryFilesFilePath` | `DELETE` | `/api/v4/projects/{id}/repository/files/{file_path}` | `P:content.write.v1` | Delete a file in a repository |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryFilesFilePath` | `GET` | `/api/v4/projects/{id}/repository/files/{file_path}` | `P:content.read.v1` | Retrieve a file from a repository |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryFilesFilePathBlame` | `GET` | `/api/v4/projects/{id}/repository/files/{file_path}/blame` | Unmatched | Retrieve file blame history from a repository |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryFilesFilePathRaw` | `GET` | `/api/v4/projects/{id}/repository/files/{file_path}/raw` | `P:content.read.v1` | Retrieve a raw file from a repository |
| `GitLabRestClient.headApiV4ProjectsIdRepositoryFilesFilePath` | `HEAD` | `/api/v4/projects/{id}/repository/files/{file_path}` | Unmatched | Retrieve file metadata |
| `GitLabRestClient.headApiV4ProjectsIdRepositoryFilesFilePathBlame` | `HEAD` | `/api/v4/projects/{id}/repository/files/{file_path}/blame` | Unmatched | Retrieve file blame metadata |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryFilesFilePath` | `POST` | `/api/v4/projects/{id}/repository/files/{file_path}` | `P:content.write.v1` | Create a file in a repository |
| `GitLabRestClient.putApiV4ProjectsIdRepositoryFilesFilePath` | `PUT` | `/api/v4/projects/{id}/repository/files/{file_path}` | `P:content.write.v1` | Update a file in a repository |

</details>

<details>
<summary><strong>freeze_periods</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdFreezePeriodsFreezePeriodId` | `DELETE` | `/api/v4/projects/{id}/freeze_periods/{freeze_period_id}` | Unmatched | Delete a freeze period |
| `GitLabRestClient.getApiV4ProjectsIdFreezePeriods` | `GET` | `/api/v4/projects/{id}/freeze_periods` | Unmatched | List all freeze periods |
| `GitLabRestClient.getApiV4ProjectsIdFreezePeriodsFreezePeriodId` | `GET` | `/api/v4/projects/{id}/freeze_periods/{freeze_period_id}` | Unmatched | Retrieve a freeze period |
| `GitLabRestClient.postApiV4ProjectsIdFreezePeriods` | `POST` | `/api/v4/projects/{id}/freeze_periods` | Unmatched | Create a freeze period |
| `GitLabRestClient.putApiV4ProjectsIdFreezePeriodsFreezePeriodId` | `PUT` | `/api/v4/projects/{id}/freeze_periods/{freeze_period_id}` | Unmatched | Update a freeze period |

</details>

<details>
<summary><strong>geo</strong> (10)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4GeoProxy` | `GET` | `/api/v4/geo/proxy` | Unmatched | Determine if a Geo site should proxy requests |
| `GitLabRestClient.getApiV4GeoRepositoriesGlRepositoryPipelineRefs` | `GET` | `/api/v4/geo/repositories/{gl_repository}/pipeline_refs` | Unmatched | Used by secondary runners to verify the secondary instance has the very latest version |
| `GitLabRestClient.getApiV4GeoRetrieveReplicableNameReplicableId` | `GET` | `/api/v4/geo/retrieve/{replicable_name}/{replicable_id}` | Unmatched | Internal endpoint that returns a replicable file |
| `GitLabRestClient.postApiV4GeoFailures` | `POST` | `/api/v4/geo/failures` | Unmatched | Internal endpoint that reports persistent verification failures to the primary |
| `GitLabRestClient.postApiV4GeoNodeProxyIdGraphql` | `POST` | `/api/v4/geo/node_proxy/{id}/graphql` | Unmatched | Query the GraphQL endpoint of an existing Geo node |
| `GitLabRestClient.postApiV4GeoProxyGitSshInfoRefsReceivePack` | `POST` | `/api/v4/geo/proxy_git_ssh/info_refs_receive_pack` | Unmatched | Internal endpoint that returns git-received-pack output for git push |
| `GitLabRestClient.postApiV4GeoProxyGitSshInfoRefsUploadPack` | `POST` | `/api/v4/geo/proxy_git_ssh/info_refs_upload_pack` | Unmatched | Internal endpoint that returns info refs upload pack for clone or pull operations |
| `GitLabRestClient.postApiV4GeoProxyGitSshReceivePack` | `POST` | `/api/v4/geo/proxy_git_ssh/receive_pack` | Unmatched | Internal endpoint that posts git-receive-pack for git push |
| `GitLabRestClient.postApiV4GeoProxyGitSshUploadPack` | `POST` | `/api/v4/geo/proxy_git_ssh/upload_pack` | Unmatched | Internal endpoint that posts git-upload-pack for clone or pull operations |
| `GitLabRestClient.postApiV4GeoStatus` | `POST` | `/api/v4/geo/status` | `U:gitlab.geo-admin` | Internal endpoint that posts the current node status |

</details>

<details>
<summary><strong>gitlab_pages</strong> (10)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdPages` | `DELETE` | `/api/v4/projects/{id}/pages` | Unmatched | Unpublish Pages |
| `GitLabRestClient.deleteApiV4ProjectsIdPagesDomainsDomain` | `DELETE` | `/api/v4/projects/{id}/pages/domains/{domain}` | Unmatched | Delete Pages domain |
| `GitLabRestClient.getApiV4PagesDomains` | `GET` | `/api/v4/pages/domains` | Unmatched | List all Pages domains |
| `GitLabRestClient.getApiV4ProjectsIdPages` | `GET` | `/api/v4/projects/{id}/pages` | Unmatched | Retrieve Pages settings for a project |
| `GitLabRestClient.getApiV4ProjectsIdPagesDomains` | `GET` | `/api/v4/projects/{id}/pages/domains` | Unmatched | List all Pages domains in a project |
| `GitLabRestClient.getApiV4ProjectsIdPagesDomainsDomain` | `GET` | `/api/v4/projects/{id}/pages/domains/{domain}` | Unmatched | Retrieve a Pages domain |
| `GitLabRestClient.patchApiV4ProjectsIdPages` | `PATCH` | `/api/v4/projects/{id}/pages` | Unmatched | Update Pages settings for a project |
| `GitLabRestClient.postApiV4ProjectsIdPagesDomains` | `POST` | `/api/v4/projects/{id}/pages/domains` | Unmatched | Create Pages domain |
| `GitLabRestClient.putApiV4ProjectsIdPagesDomainsDomain` | `PUT` | `/api/v4/projects/{id}/pages/domains/{domain}` | Unmatched | Update Pages domain |
| `GitLabRestClient.putApiV4ProjectsIdPagesDomainsDomainVerify` | `PUT` | `/api/v4/projects/{id}/pages/domains/{domain}/verify` | Unmatched | Verify Pages domain |

</details>

<details>
<summary><strong>glql</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.postApiV4Glql` | `POST` | `/api/v4/glql` | Unmatched | Execute a GLQL query |

</details>

<details>
<summary><strong>group_import_and_export</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4GroupsIdExportDownload` | `GET` | `/api/v4/groups/{id}/export/download` | Unmatched | Retrieve a group export download |
| `GitLabRestClient.getApiV4GroupsIdExportRelationsDownload` | `GET` | `/api/v4/groups/{id}/export_relations/download` | Unmatched | Download a relations export for a group |
| `GitLabRestClient.getApiV4GroupsIdExportRelationsStatus` | `GET` | `/api/v4/groups/{id}/export_relations/status` | Unmatched | Retrieve the status of an relations export for a group |
| `GitLabRestClient.postApiV4GroupsIdExport` | `POST` | `/api/v4/groups/{id}/export` | Unmatched | Create a group export |
| `GitLabRestClient.postApiV4GroupsIdExportRelations` | `POST` | `/api/v4/groups/{id}/export_relations` | Unmatched | Schedule a relations export for a group |
| `GitLabRestClient.postApiV4GroupsImport` | `POST` | `/api/v4/groups/import` | Unmatched | Create a group import |
| `GitLabRestClient.postApiV4GroupsImportAuthorize` | `POST` | `/api/v4/groups/import/authorize` | Unmatched | Workhorse authorize the group import upload |

</details>

<details>
<summary><strong>groups</strong> (41)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsId` | `DELETE` | `/api/v4/groups/{id}` | Unmatched | Schedule a group for deletion |
| `GitLabRestClient.deleteApiV4GroupsIdShareGroupId` | `DELETE` | `/api/v4/groups/{id}/share/{group_id}` | Unmatched | Remove a group from a group |
| `GitLabRestClient.deleteApiV4GroupsIdSharedProjectsProjectId` | `DELETE` | `/api/v4/groups/{id}/shared_projects/{project_id}` | Unmatched | Remove a shared project from a group |
| `GitLabRestClient.deleteApiV4GroupsIdUploadsSecretFilename` | `DELETE` | `/api/v4/groups/{id}/uploads/{secret}/{filename}` | Unmatched | Delete an uploaded file by secret and filename |
| `GitLabRestClient.deleteApiV4GroupsIdUploadsUploadId` | `DELETE` | `/api/v4/groups/{id}/uploads/{upload_id}` | Unmatched | Delete an uploaded file by ID |
| `GitLabRestClient.getApiV4Groups` | `GET` | `/api/v4/groups` | `P:namespace.read.v1` | List all groups |
| `GitLabRestClient.getApiV4GroupsId` | `GET` | `/api/v4/groups/{id}` | `P:namespace.read.v1` | Retrieve a group |
| `GitLabRestClient.getApiV4GroupsIdAuditEventsAuditEventId` | `GET` | `/api/v4/groups/{id}/audit_events/{audit_event_id}` | Unmatched | Retrieve a group audit event |
| `GitLabRestClient.getApiV4GroupsIdBillableMembers` | `GET` | `/api/v4/groups/{id}/billable_members` | Unmatched | List all billable group members |
| `GitLabRestClient.getApiV4GroupsIdDescendantGroups` | `GET` | `/api/v4/groups/{id}/descendant_groups` | Unmatched | List all descendant groups |
| `GitLabRestClient.getApiV4GroupsIdGroupsShared` | `GET` | `/api/v4/groups/{id}/groups/shared` | Unmatched | List all shared groups |
| `GitLabRestClient.getApiV4GroupsIdInvitedGroups` | `GET` | `/api/v4/groups/{id}/invited_groups` | Unmatched | List all invited groups |
| `GitLabRestClient.getApiV4GroupsIdIssues` | `GET` | `/api/v4/groups/{id}/issues` | `P:issue.read.v1` | List all issues for a group |
| `GitLabRestClient.getApiV4GroupsIdIssuesStatistics` | `GET` | `/api/v4/groups/{id}/issues_statistics` | Unmatched | Retrieve issues statistics for a group |
| `GitLabRestClient.getApiV4GroupsIdPlaceholderReassignments` | `GET` | `/api/v4/groups/{id}/placeholder_reassignments` | Unmatched | Retrieve pending reassignments |
| `GitLabRestClient.getApiV4GroupsIdProjects` | `GET` | `/api/v4/groups/{id}/projects` | `E:repository.list.v1` | List all projects in a group |
| `GitLabRestClient.getApiV4GroupsIdProjectsShared` | `GET` | `/api/v4/groups/{id}/projects/shared` | Unmatched | List all shared projects |
| `GitLabRestClient.getApiV4GroupsIdProvisionedUsers` | `GET` | `/api/v4/groups/{id}/provisioned_users` | Unmatched | List all provisioned users |
| `GitLabRestClient.getApiV4GroupsIdRunners` | `GET` | `/api/v4/groups/{id}/runners` | `P:ci.runners.v1` | List all runners in a group |
| `GitLabRestClient.getApiV4GroupsIdSamlUsers` | `GET` | `/api/v4/groups/{id}/saml_users` | Unmatched | List all SAML users |
| `GitLabRestClient.getApiV4GroupsIdSubgroups` | `GET` | `/api/v4/groups/{id}/subgroups` | Unmatched | List all subgroups |
| `GitLabRestClient.getApiV4GroupsIdTransferLocations` | `GET` | `/api/v4/groups/{id}/transfer_locations` | Unmatched | List all transfer locations for a group |
| `GitLabRestClient.getApiV4GroupsIdUploads` | `GET` | `/api/v4/groups/{id}/uploads` | Unmatched | List all uploads for a group |
| `GitLabRestClient.getApiV4GroupsIdUploadsSecretFilename` | `GET` | `/api/v4/groups/{id}/uploads/{secret}/{filename}` | Unmatched | Download an uploaded file by secret and filename |
| `GitLabRestClient.getApiV4GroupsIdUploadsUploadId` | `GET` | `/api/v4/groups/{id}/uploads/{upload_id}` | Unmatched | Download an uploaded file by ID |
| `GitLabRestClient.getApiV4ProjectsIdShareLocations` | `GET` | `/api/v4/projects/{id}/share_locations` | Unmatched | List all groups available to invite to a project |
| `GitLabRestClient.postApiV4Groups` | `POST` | `/api/v4/groups` | Unmatched | Create a group |
| `GitLabRestClient.postApiV4GroupsIdArchive` | `POST` | `/api/v4/groups/{id}/archive` | Unmatched | Archive a group |
| `GitLabRestClient.postApiV4GroupsIdPlaceholderReassignments` | `POST` | `/api/v4/groups/{id}/placeholder_reassignments` | Unmatched | Reassign placeholders |
| `GitLabRestClient.postApiV4GroupsIdPlaceholderReassignmentsAuthorize` | `POST` | `/api/v4/groups/{id}/placeholder_reassignments/authorize` | Unmatched | Workhorse authorization for the reassignment CSV file |
| `GitLabRestClient.postApiV4GroupsIdProjectsProjectId` | `POST` | `/api/v4/groups/{id}/projects/{project_id}` | Unmatched | Transfer a project to a group |
| `GitLabRestClient.postApiV4GroupsIdRestore` | `POST` | `/api/v4/groups/{id}/restore` | Unmatched | Restore a group |
| `GitLabRestClient.postApiV4GroupsIdRunnersResetRegistrationToken` | `POST` | `/api/v4/groups/{id}/runners/reset_registration_token` | Unmatched | Reset the runner registration token for a group |
| `GitLabRestClient.postApiV4GroupsIdShare` | `POST` | `/api/v4/groups/{id}/share` | Unmatched | Add a group to a group |
| `GitLabRestClient.postApiV4GroupsIdTransfer` | `POST` | `/api/v4/groups/{id}/transfer` | Unmatched | Transfer a group |
| `GitLabRestClient.postApiV4GroupsIdTransferToOrganization` | `POST` | `/api/v4/groups/{id}/transfer_to_organization` | Unmatched | Transfer a group to an organization |
| `GitLabRestClient.postApiV4GroupsIdUnarchive` | `POST` | `/api/v4/groups/{id}/unarchive` | Unmatched | Unarchive a group |
| `GitLabRestClient.postApiV4GroupsIdUploads` | `POST` | `/api/v4/groups/{id}/uploads` | Unmatched | Upload a file to a group |
| `GitLabRestClient.postApiV4GroupsIdUploadsAuthorize` | `POST` | `/api/v4/groups/{id}/uploads/authorize` | Unmatched | Workhorse authorize the file upload |
| `GitLabRestClient.postApiV4RunnersResetRegistrationToken` | `POST` | `/api/v4/runners/reset_registration_token` | Unmatched | Reset the runner registration token for the instance |
| `GitLabRestClient.putApiV4GroupsId` | `PUT` | `/api/v4/groups/{id}` | Unmatched | Update group attributes |

</details>

<details>
<summary><strong>hooks</strong> (22)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4HooksHookId` | `DELETE` | `/api/v4/hooks/{hook_id}` | Unmatched | Delete a system hook |
| `GitLabRestClient.deleteApiV4HooksHookIdCustomHeadersKey` | `DELETE` | `/api/v4/hooks/{hook_id}/custom_headers/{key}` | Unmatched | Delete a custom header |
| `GitLabRestClient.deleteApiV4HooksHookIdUrlVariablesKey` | `DELETE` | `/api/v4/hooks/{hook_id}/url_variables/{key}` | Unmatched | Delete a URL variable |
| `GitLabRestClient.deleteApiV4ProjectsIdHooksHookId` | `DELETE` | `/api/v4/projects/{id}/hooks/{hook_id}` | `E:webhook.crud.v1` | Delete a project webhook |
| `GitLabRestClient.deleteApiV4ProjectsIdHooksHookIdCustomHeadersKey` | `DELETE` | `/api/v4/projects/{id}/hooks/{hook_id}/custom_headers/{key}` | Unmatched | Delete a custom header |
| `GitLabRestClient.deleteApiV4ProjectsIdHooksHookIdUrlVariablesKey` | `DELETE` | `/api/v4/projects/{id}/hooks/{hook_id}/url_variables/{key}` | Unmatched | Delete a URL variable |
| `GitLabRestClient.getApiV4Hooks` | `GET` | `/api/v4/hooks` | Unmatched | List all system hooks |
| `GitLabRestClient.getApiV4HooksHookId` | `GET` | `/api/v4/hooks/{hook_id}` | Unmatched | Retrieve a system hook |
| `GitLabRestClient.getApiV4ProjectsIdHooks` | `GET` | `/api/v4/projects/{id}/hooks` | `E:webhook.crud.v1` | List all webhooks for a project |
| `GitLabRestClient.getApiV4ProjectsIdHooksHookId` | `GET` | `/api/v4/projects/{id}/hooks/{hook_id}` | `E:webhook.crud.v1` | Retrieve a project webhook |
| `GitLabRestClient.getApiV4ProjectsIdHooksHookIdEvents` | `GET` | `/api/v4/projects/{id}/hooks/{hook_id}/events` | Unmatched | List all events |
| `GitLabRestClient.postApiV4Hooks` | `POST` | `/api/v4/hooks` | Unmatched | Create a system hook |
| `GitLabRestClient.postApiV4HooksHookId` | `POST` | `/api/v4/hooks/{hook_id}` | Unmatched | Create a test run |
| `GitLabRestClient.postApiV4ProjectsIdHooks` | `POST` | `/api/v4/projects/{id}/hooks` | `E:webhook.crud.v1` | Add a webhook to a project |
| `GitLabRestClient.postApiV4ProjectsIdHooksHookIdEventsHookLogIdResend` | `POST` | `/api/v4/projects/{id}/hooks/{hook_id}/events/{hook_log_id}/resend` | Unmatched | Resend a webhook event |
| `GitLabRestClient.postApiV4ProjectsIdHooksHookIdTestTrigger` | `POST` | `/api/v4/projects/{id}/hooks/{hook_id}/test/{trigger}` | `E:webhook.crud.v1` | Trigger a test webhook |
| `GitLabRestClient.putApiV4HooksHookId` | `PUT` | `/api/v4/hooks/{hook_id}` | Unmatched | Update a system hook |
| `GitLabRestClient.putApiV4HooksHookIdCustomHeadersKey` | `PUT` | `/api/v4/hooks/{hook_id}/custom_headers/{key}` | Unmatched | Update a custom header |
| `GitLabRestClient.putApiV4HooksHookIdUrlVariablesKey` | `PUT` | `/api/v4/hooks/{hook_id}/url_variables/{key}` | Unmatched | Update a URL variable |
| `GitLabRestClient.putApiV4ProjectsIdHooksHookId` | `PUT` | `/api/v4/projects/{id}/hooks/{hook_id}` | `E:webhook.crud.v1` | Update a project webhook |
| `GitLabRestClient.putApiV4ProjectsIdHooksHookIdCustomHeadersKey` | `PUT` | `/api/v4/projects/{id}/hooks/{hook_id}/custom_headers/{key}` | Unmatched | Update a custom header |
| `GitLabRestClient.putApiV4ProjectsIdHooksHookIdUrlVariablesKey` | `PUT` | `/api/v4/projects/{id}/hooks/{hook_id}/url_variables/{key}` | Unmatched | Update a URL variable |

</details>

<details>
<summary><strong>imports</strong> (9)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4BulkImports` | `GET` | `/api/v4/bulk_imports` | Unmatched | List all group or project migrations |
| `GitLabRestClient.getApiV4BulkImportsEntities` | `GET` | `/api/v4/bulk_imports/entities` | Unmatched | List all group or project migration entities |
| `GitLabRestClient.getApiV4BulkImportsImportId` | `GET` | `/api/v4/bulk_imports/{import_id}` | Unmatched | Retrieve a group or project migration |
| `GitLabRestClient.getApiV4BulkImportsImportIdEntities` | `GET` | `/api/v4/bulk_imports/{import_id}/entities` | Unmatched | List all group or project migration entities |
| `GitLabRestClient.getApiV4BulkImportsImportIdEntitiesEntityId` | `GET` | `/api/v4/bulk_imports/{import_id}/entities/{entity_id}` | Unmatched | Retrieve a group or project migration entity |
| `GitLabRestClient.getApiV4BulkImportsImportIdEntitiesEntityIdFailures` | `GET` | `/api/v4/bulk_imports/{import_id}/entities/{entity_id}/failures` | Unmatched | List all failed import records for a migration entity |
| `GitLabRestClient.postApiV4BulkImports` | `POST` | `/api/v4/bulk_imports` | Unmatched | Start a group or project migration |
| `GitLabRestClient.postApiV4BulkImportsImportIdCancel` | `POST` | `/api/v4/bulk_imports/{import_id}/cancel` | Unmatched | Cancel a migration |
| `GitLabRestClient.postApiV4ImportGithubGists` | `POST` | `/api/v4/import/github/gists` | Unmatched | Import GitHub gists into GitLab snippets |

</details>

<details>
<summary><strong>instance</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ApplicationAppearance` | `GET` | `/api/v4/application/appearance` | Unmatched | Get the current appearance |
| `GitLabRestClient.getApiV4ApplicationStatistics` | `GET` | `/api/v4/application/statistics` | Unmatched | Retrieve application statistics |
| `GitLabRestClient.putApiV4ApplicationAppearance` | `PUT` | `/api/v4/application/appearance` | Unmatched | Modify appearance |

</details>

<details>
<summary><strong>integrations</strong> (168)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdIntegrationsSlug` | `DELETE` | `/api/v4/groups/{id}/integrations/{slug}` | Unmatched | Disable an integration |
| `GitLabRestClient.deleteApiV4ProjectsIdIntegrationsSlug` | `DELETE` | `/api/v4/projects/{id}/integrations/{slug}` | Unmatched | Disable an integration |
| `GitLabRestClient.deleteApiV4ProjectsIdServicesSlug` | `DELETE` | `/api/v4/projects/{id}/services/{slug}` | Unmatched | Disable an integration |
| `GitLabRestClient.getApiV4GroupsIdIntegrations` | `GET` | `/api/v4/groups/{id}/integrations` | Unmatched | List all active integrations |
| `GitLabRestClient.getApiV4GroupsIdIntegrationsSlug` | `GET` | `/api/v4/groups/{id}/integrations/{slug}` | Unmatched | Retrieve integration settings |
| `GitLabRestClient.getApiV4ProjectsIdIntegrations` | `GET` | `/api/v4/projects/{id}/integrations` | Unmatched | List all active integrations |
| `GitLabRestClient.getApiV4ProjectsIdIntegrationsSlug` | `GET` | `/api/v4/projects/{id}/integrations/{slug}` | Unmatched | Retrieve integration settings |
| `GitLabRestClient.getApiV4ProjectsIdServices` | `GET` | `/api/v4/projects/{id}/services` | Unmatched | List all active integrations |
| `GitLabRestClient.getApiV4ProjectsIdServicesSlug` | `GET` | `/api/v4/projects/{id}/services/{slug}` | Unmatched | Retrieve integration settings |
| `GitLabRestClient.postApiV4IntegrationsSlackEvents` | `POST` | `/api/v4/integrations/slack/events` | Unmatched | Receive Slack events |
| `GitLabRestClient.postApiV4IntegrationsSlackInteractions` | `POST` | `/api/v4/integrations/slack/interactions` | Unmatched | Process Slack interaction events |
| `GitLabRestClient.postApiV4IntegrationsSlackOptions` | `POST` | `/api/v4/integrations/slack/options` | Unmatched | Get Slack interactive component options |
| `GitLabRestClient.postApiV4ProjectsIdIntegrationsMattermostSlashCommandsTrigger` | `POST` | `/api/v4/projects/{id}/integrations/mattermost_slash_commands/trigger` | Unmatched | Trigger a slash command for mattermost-slash-commands |
| `GitLabRestClient.postApiV4ProjectsIdServicesMattermostSlashCommandsTrigger` | `POST` | `/api/v4/projects/{id}/services/mattermost_slash_commands/trigger` | Unmatched | Trigger a slash command for mattermost-slash-commands |
| `GitLabRestClient.postApiV4SlackTrigger` | `POST` | `/api/v4/slack/trigger` | Unmatched | Trigger a global slack command |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsAppleAppStore` | `PUT` | `/api/v4/groups/{id}/integrations/apple-app-store` | Unmatched | Create or update the Apple App Store integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsAsana` | `PUT` | `/api/v4/groups/{id}/integrations/asana` | Unmatched | Create or update the Asana integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsAssembla` | `PUT` | `/api/v4/groups/{id}/integrations/assembla` | Unmatched | Create or update the Assembla integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsBamboo` | `PUT` | `/api/v4/groups/{id}/integrations/bamboo` | Unmatched | Create or update the Bamboo integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsBugzilla` | `PUT` | `/api/v4/groups/{id}/integrations/bugzilla` | Unmatched | Create or update the Bugzilla integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsBuildkite` | `PUT` | `/api/v4/groups/{id}/integrations/buildkite` | Unmatched | Create or update the Buildkite integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsCampfire` | `PUT` | `/api/v4/groups/{id}/integrations/campfire` | Unmatched | Create or update the Campfire integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsClickup` | `PUT` | `/api/v4/groups/{id}/integrations/clickup` | Unmatched | Create or update the Clickup integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsConfluence` | `PUT` | `/api/v4/groups/{id}/integrations/confluence` | Unmatched | Create or update the Confluence integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsCustomIssueTracker` | `PUT` | `/api/v4/groups/{id}/integrations/custom-issue-tracker` | Unmatched | Create or update the Custom Issue Tracker integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsDatadog` | `PUT` | `/api/v4/groups/{id}/integrations/datadog` | Unmatched | Create or update the Datadog integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsDiffblueCover` | `PUT` | `/api/v4/groups/{id}/integrations/diffblue-cover` | Unmatched | Create or update the Diffblue Cover integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsDiscord` | `PUT` | `/api/v4/groups/{id}/integrations/discord` | Unmatched | Create or update the Discord integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsDroneCi` | `PUT` | `/api/v4/groups/{id}/integrations/drone-ci` | Unmatched | Create or update the Drone Ci integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsEmailsOnPush` | `PUT` | `/api/v4/groups/{id}/integrations/emails-on-push` | Unmatched | Create or update the Emails On Push integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsEwm` | `PUT` | `/api/v4/groups/{id}/integrations/ewm` | Unmatched | Create or update the Ewm integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsExternalWiki` | `PUT` | `/api/v4/groups/{id}/integrations/external-wiki` | Unmatched | Create or update the External Wiki integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsGitGuardian` | `PUT` | `/api/v4/groups/{id}/integrations/git-guardian` | Unmatched | Create or update the Git Guardian integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsGithub` | `PUT` | `/api/v4/groups/{id}/integrations/github` | Unmatched | Create or update the Github integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsGitlabSlackApplication` | `PUT` | `/api/v4/groups/{id}/integrations/gitlab-slack-application` | Unmatched | Create or update the Gitlab Slack Application integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsGoogleCloudPlatformArtifactRegistry` | `PUT` | `/api/v4/groups/{id}/integrations/google-cloud-platform-artifact-registry` | Unmatched | Create or update the Google Cloud Platform Artifact Registry integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsGoogleCloudPlatformWorkloadIdentityFederation` | `PUT` | `/api/v4/groups/{id}/integrations/google-cloud-platform-workload-identity-federation` | Unmatched | Create or update the Google Cloud Platform Workload Identity Federation integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsGooglePlay` | `PUT` | `/api/v4/groups/{id}/integrations/google-play` | Unmatched | Create or update the Google Play integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsHangoutsChat` | `PUT` | `/api/v4/groups/{id}/integrations/hangouts-chat` | Unmatched | Create or update the Hangouts Chat integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsHarbor` | `PUT` | `/api/v4/groups/{id}/integrations/harbor` | Unmatched | Create or update the Harbor integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsIrker` | `PUT` | `/api/v4/groups/{id}/integrations/irker` | Unmatched | Create or update the Irker integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsJenkins` | `PUT` | `/api/v4/groups/{id}/integrations/jenkins` | Unmatched | Create or update the Jenkins integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsJira` | `PUT` | `/api/v4/groups/{id}/integrations/jira` | Unmatched | Create or update the Jira integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsJiraCloudApp` | `PUT` | `/api/v4/groups/{id}/integrations/jira-cloud-app` | Unmatched | Create or update the Jira Cloud App integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsLinear` | `PUT` | `/api/v4/groups/{id}/integrations/linear` | Unmatched | Create or update the Linear integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsMatrix` | `PUT` | `/api/v4/groups/{id}/integrations/matrix` | Unmatched | Create or update the Matrix integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsMattermost` | `PUT` | `/api/v4/groups/{id}/integrations/mattermost` | Unmatched | Create or update the Mattermost integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsMattermostSlashCommands` | `PUT` | `/api/v4/groups/{id}/integrations/mattermost-slash-commands` | Unmatched | Create or update the Mattermost Slash Commands integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsMicrosoftTeams` | `PUT` | `/api/v4/groups/{id}/integrations/microsoft-teams` | Unmatched | Create or update the Microsoft Teams integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsMockCi` | `PUT` | `/api/v4/groups/{id}/integrations/mock-ci` | Unmatched | Create or update the Mock Ci integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsMockMonitoring` | `PUT` | `/api/v4/groups/{id}/integrations/mock-monitoring` | Unmatched | Create or update the Mock Monitoring integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsPackagist` | `PUT` | `/api/v4/groups/{id}/integrations/packagist` | Unmatched | Create or update the Packagist integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsPhorge` | `PUT` | `/api/v4/groups/{id}/integrations/phorge` | Unmatched | Create or update the Phorge integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsPipelinesEmail` | `PUT` | `/api/v4/groups/{id}/integrations/pipelines-email` | Unmatched | Create or update the Pipelines Email integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsPivotaltracker` | `PUT` | `/api/v4/groups/{id}/integrations/pivotaltracker` | Unmatched | Create or update the Pivotaltracker integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsPumble` | `PUT` | `/api/v4/groups/{id}/integrations/pumble` | Unmatched | Create or update the Pumble integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsPushover` | `PUT` | `/api/v4/groups/{id}/integrations/pushover` | Unmatched | Create or update the Pushover integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsRedmine` | `PUT` | `/api/v4/groups/{id}/integrations/redmine` | Unmatched | Create or update the Redmine integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsSlack` | `PUT` | `/api/v4/groups/{id}/integrations/slack` | Unmatched | Create or update the Slack integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsSquashTm` | `PUT` | `/api/v4/groups/{id}/integrations/squash-tm` | Unmatched | Create or update the Squash Tm integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsTeamcity` | `PUT` | `/api/v4/groups/{id}/integrations/teamcity` | Unmatched | Create or update the Teamcity integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsTelegram` | `PUT` | `/api/v4/groups/{id}/integrations/telegram` | Unmatched | Create or update the Telegram integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsUnifyCircuit` | `PUT` | `/api/v4/groups/{id}/integrations/unify-circuit` | Unmatched | Create or update the Unify Circuit integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsWebexTeams` | `PUT` | `/api/v4/groups/{id}/integrations/webex-teams` | Unmatched | Create or update the Webex Teams integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsYoutrack` | `PUT` | `/api/v4/groups/{id}/integrations/youtrack` | Unmatched | Create or update the Youtrack integration |
| `GitLabRestClient.putApiV4GroupsIdIntegrationsZentao` | `PUT` | `/api/v4/groups/{id}/integrations/zentao` | Unmatched | Create or update the Zentao integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsAppleAppStore` | `PUT` | `/api/v4/projects/{id}/integrations/apple-app-store` | Unmatched | Create or update the Apple App Store integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsAsana` | `PUT` | `/api/v4/projects/{id}/integrations/asana` | Unmatched | Create or update the Asana integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsAssembla` | `PUT` | `/api/v4/projects/{id}/integrations/assembla` | Unmatched | Create or update the Assembla integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsBamboo` | `PUT` | `/api/v4/projects/{id}/integrations/bamboo` | Unmatched | Create or update the Bamboo integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsBugzilla` | `PUT` | `/api/v4/projects/{id}/integrations/bugzilla` | Unmatched | Create or update the Bugzilla integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsBuildkite` | `PUT` | `/api/v4/projects/{id}/integrations/buildkite` | Unmatched | Create or update the Buildkite integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsCampfire` | `PUT` | `/api/v4/projects/{id}/integrations/campfire` | Unmatched | Create or update the Campfire integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsClickup` | `PUT` | `/api/v4/projects/{id}/integrations/clickup` | Unmatched | Create or update the Clickup integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsConfluence` | `PUT` | `/api/v4/projects/{id}/integrations/confluence` | Unmatched | Create or update the Confluence integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsCustomIssueTracker` | `PUT` | `/api/v4/projects/{id}/integrations/custom-issue-tracker` | Unmatched | Create or update the Custom Issue Tracker integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsDatadog` | `PUT` | `/api/v4/projects/{id}/integrations/datadog` | Unmatched | Create or update the Datadog integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsDiffblueCover` | `PUT` | `/api/v4/projects/{id}/integrations/diffblue-cover` | Unmatched | Create or update the Diffblue Cover integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsDiscord` | `PUT` | `/api/v4/projects/{id}/integrations/discord` | Unmatched | Create or update the Discord integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsDroneCi` | `PUT` | `/api/v4/projects/{id}/integrations/drone-ci` | Unmatched | Create or update the Drone Ci integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsEmailsOnPush` | `PUT` | `/api/v4/projects/{id}/integrations/emails-on-push` | Unmatched | Create or update the Emails On Push integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsEwm` | `PUT` | `/api/v4/projects/{id}/integrations/ewm` | Unmatched | Create or update the Ewm integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsExternalWiki` | `PUT` | `/api/v4/projects/{id}/integrations/external-wiki` | Unmatched | Create or update the External Wiki integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsGitGuardian` | `PUT` | `/api/v4/projects/{id}/integrations/git-guardian` | Unmatched | Create or update the Git Guardian integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsGithub` | `PUT` | `/api/v4/projects/{id}/integrations/github` | Unmatched | Create or update the Github integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsGitlabSlackApplication` | `PUT` | `/api/v4/projects/{id}/integrations/gitlab-slack-application` | Unmatched | Create or update the Gitlab Slack Application integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsGoogleCloudPlatformArtifactRegistry` | `PUT` | `/api/v4/projects/{id}/integrations/google-cloud-platform-artifact-registry` | `U:gitlab.integrations` | Create or update the Google Cloud Platform Artifact Registry integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsGoogleCloudPlatformWorkloadIdentityFederation` | `PUT` | `/api/v4/projects/{id}/integrations/google-cloud-platform-workload-identity-federation` | Unmatched | Create or update the Google Cloud Platform Workload Identity Federation integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsGooglePlay` | `PUT` | `/api/v4/projects/{id}/integrations/google-play` | Unmatched | Create or update the Google Play integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsHangoutsChat` | `PUT` | `/api/v4/projects/{id}/integrations/hangouts-chat` | Unmatched | Create or update the Hangouts Chat integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsHarbor` | `PUT` | `/api/v4/projects/{id}/integrations/harbor` | Unmatched | Create or update the Harbor integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsIrker` | `PUT` | `/api/v4/projects/{id}/integrations/irker` | Unmatched | Create or update the Irker integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsJenkins` | `PUT` | `/api/v4/projects/{id}/integrations/jenkins` | `U:gitlab.integrations` | Create or update the Jenkins integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsJira` | `PUT` | `/api/v4/projects/{id}/integrations/jira` | `U:gitlab.integrations` | Create or update the Jira integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsJiraCloudApp` | `PUT` | `/api/v4/projects/{id}/integrations/jira-cloud-app` | Unmatched | Create or update the Jira Cloud App integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsLinear` | `PUT` | `/api/v4/projects/{id}/integrations/linear` | Unmatched | Create or update the Linear integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsMatrix` | `PUT` | `/api/v4/projects/{id}/integrations/matrix` | Unmatched | Create or update the Matrix integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsMattermost` | `PUT` | `/api/v4/projects/{id}/integrations/mattermost` | Unmatched | Create or update the Mattermost integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsMattermostSlashCommands` | `PUT` | `/api/v4/projects/{id}/integrations/mattermost-slash-commands` | Unmatched | Create or update the Mattermost Slash Commands integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsMicrosoftTeams` | `PUT` | `/api/v4/projects/{id}/integrations/microsoft-teams` | Unmatched | Create or update the Microsoft Teams integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsMockCi` | `PUT` | `/api/v4/projects/{id}/integrations/mock-ci` | Unmatched | Create or update the Mock Ci integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsMockMonitoring` | `PUT` | `/api/v4/projects/{id}/integrations/mock-monitoring` | Unmatched | Create or update the Mock Monitoring integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsPackagist` | `PUT` | `/api/v4/projects/{id}/integrations/packagist` | Unmatched | Create or update the Packagist integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsPhorge` | `PUT` | `/api/v4/projects/{id}/integrations/phorge` | Unmatched | Create or update the Phorge integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsPipelinesEmail` | `PUT` | `/api/v4/projects/{id}/integrations/pipelines-email` | Unmatched | Create or update the Pipelines Email integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsPivotaltracker` | `PUT` | `/api/v4/projects/{id}/integrations/pivotaltracker` | Unmatched | Create or update the Pivotaltracker integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsPumble` | `PUT` | `/api/v4/projects/{id}/integrations/pumble` | Unmatched | Create or update the Pumble integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsPushover` | `PUT` | `/api/v4/projects/{id}/integrations/pushover` | Unmatched | Create or update the Pushover integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsRedmine` | `PUT` | `/api/v4/projects/{id}/integrations/redmine` | Unmatched | Create or update the Redmine integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsSlack` | `PUT` | `/api/v4/projects/{id}/integrations/slack` | `U:gitlab.integrations` | Create or update the Slack integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsSquashTm` | `PUT` | `/api/v4/projects/{id}/integrations/squash-tm` | Unmatched | Create or update the Squash Tm integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsTeamcity` | `PUT` | `/api/v4/projects/{id}/integrations/teamcity` | Unmatched | Create or update the Teamcity integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsTelegram` | `PUT` | `/api/v4/projects/{id}/integrations/telegram` | Unmatched | Create or update the Telegram integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsUnifyCircuit` | `PUT` | `/api/v4/projects/{id}/integrations/unify-circuit` | Unmatched | Create or update the Unify Circuit integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsWebexTeams` | `PUT` | `/api/v4/projects/{id}/integrations/webex-teams` | Unmatched | Create or update the Webex Teams integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsYoutrack` | `PUT` | `/api/v4/projects/{id}/integrations/youtrack` | Unmatched | Create or update the Youtrack integration |
| `GitLabRestClient.putApiV4ProjectsIdIntegrationsZentao` | `PUT` | `/api/v4/projects/{id}/integrations/zentao` | Unmatched | Create or update the Zentao integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesAppleAppStore` | `PUT` | `/api/v4/projects/{id}/services/apple-app-store` | Unmatched | Create or update the Apple App Store integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesAsana` | `PUT` | `/api/v4/projects/{id}/services/asana` | Unmatched | Create or update the Asana integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesAssembla` | `PUT` | `/api/v4/projects/{id}/services/assembla` | Unmatched | Create or update the Assembla integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesBamboo` | `PUT` | `/api/v4/projects/{id}/services/bamboo` | Unmatched | Create or update the Bamboo integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesBugzilla` | `PUT` | `/api/v4/projects/{id}/services/bugzilla` | Unmatched | Create or update the Bugzilla integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesBuildkite` | `PUT` | `/api/v4/projects/{id}/services/buildkite` | Unmatched | Create or update the Buildkite integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesCampfire` | `PUT` | `/api/v4/projects/{id}/services/campfire` | Unmatched | Create or update the Campfire integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesClickup` | `PUT` | `/api/v4/projects/{id}/services/clickup` | Unmatched | Create or update the Clickup integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesConfluence` | `PUT` | `/api/v4/projects/{id}/services/confluence` | Unmatched | Create or update the Confluence integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesCustomIssueTracker` | `PUT` | `/api/v4/projects/{id}/services/custom-issue-tracker` | Unmatched | Create or update the Custom Issue Tracker integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesDatadog` | `PUT` | `/api/v4/projects/{id}/services/datadog` | Unmatched | Create or update the Datadog integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesDiffblueCover` | `PUT` | `/api/v4/projects/{id}/services/diffblue-cover` | Unmatched | Create or update the Diffblue Cover integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesDiscord` | `PUT` | `/api/v4/projects/{id}/services/discord` | Unmatched | Create or update the Discord integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesDroneCi` | `PUT` | `/api/v4/projects/{id}/services/drone-ci` | Unmatched | Create or update the Drone Ci integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesEmailsOnPush` | `PUT` | `/api/v4/projects/{id}/services/emails-on-push` | Unmatched | Create or update the Emails On Push integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesEwm` | `PUT` | `/api/v4/projects/{id}/services/ewm` | Unmatched | Create or update the Ewm integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesExternalWiki` | `PUT` | `/api/v4/projects/{id}/services/external-wiki` | Unmatched | Create or update the External Wiki integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesGitGuardian` | `PUT` | `/api/v4/projects/{id}/services/git-guardian` | Unmatched | Create or update the Git Guardian integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesGithub` | `PUT` | `/api/v4/projects/{id}/services/github` | Unmatched | Create or update the Github integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesGitlabSlackApplication` | `PUT` | `/api/v4/projects/{id}/services/gitlab-slack-application` | Unmatched | Create or update the Gitlab Slack Application integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesGoogleCloudPlatformArtifactRegistry` | `PUT` | `/api/v4/projects/{id}/services/google-cloud-platform-artifact-registry` | Unmatched | Create or update the Google Cloud Platform Artifact Registry integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesGoogleCloudPlatformWorkloadIdentityFederation` | `PUT` | `/api/v4/projects/{id}/services/google-cloud-platform-workload-identity-federation` | Unmatched | Create or update the Google Cloud Platform Workload Identity Federation integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesGooglePlay` | `PUT` | `/api/v4/projects/{id}/services/google-play` | Unmatched | Create or update the Google Play integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesHangoutsChat` | `PUT` | `/api/v4/projects/{id}/services/hangouts-chat` | Unmatched | Create or update the Hangouts Chat integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesHarbor` | `PUT` | `/api/v4/projects/{id}/services/harbor` | Unmatched | Create or update the Harbor integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesIrker` | `PUT` | `/api/v4/projects/{id}/services/irker` | Unmatched | Create or update the Irker integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesJenkins` | `PUT` | `/api/v4/projects/{id}/services/jenkins` | Unmatched | Create or update the Jenkins integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesJira` | `PUT` | `/api/v4/projects/{id}/services/jira` | Unmatched | Create or update the Jira integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesJiraCloudApp` | `PUT` | `/api/v4/projects/{id}/services/jira-cloud-app` | Unmatched | Create or update the Jira Cloud App integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesLinear` | `PUT` | `/api/v4/projects/{id}/services/linear` | Unmatched | Create or update the Linear integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesMatrix` | `PUT` | `/api/v4/projects/{id}/services/matrix` | Unmatched | Create or update the Matrix integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesMattermost` | `PUT` | `/api/v4/projects/{id}/services/mattermost` | Unmatched | Create or update the Mattermost integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesMattermostSlashCommands` | `PUT` | `/api/v4/projects/{id}/services/mattermost-slash-commands` | Unmatched | Create or update the Mattermost Slash Commands integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesMicrosoftTeams` | `PUT` | `/api/v4/projects/{id}/services/microsoft-teams` | Unmatched | Create or update the Microsoft Teams integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesMockCi` | `PUT` | `/api/v4/projects/{id}/services/mock-ci` | Unmatched | Create or update the Mock Ci integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesMockMonitoring` | `PUT` | `/api/v4/projects/{id}/services/mock-monitoring` | Unmatched | Create or update the Mock Monitoring integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesPackagist` | `PUT` | `/api/v4/projects/{id}/services/packagist` | Unmatched | Create or update the Packagist integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesPhorge` | `PUT` | `/api/v4/projects/{id}/services/phorge` | Unmatched | Create or update the Phorge integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesPipelinesEmail` | `PUT` | `/api/v4/projects/{id}/services/pipelines-email` | Unmatched | Create or update the Pipelines Email integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesPivotaltracker` | `PUT` | `/api/v4/projects/{id}/services/pivotaltracker` | Unmatched | Create or update the Pivotaltracker integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesPumble` | `PUT` | `/api/v4/projects/{id}/services/pumble` | Unmatched | Create or update the Pumble integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesPushover` | `PUT` | `/api/v4/projects/{id}/services/pushover` | Unmatched | Create or update the Pushover integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesRedmine` | `PUT` | `/api/v4/projects/{id}/services/redmine` | Unmatched | Create or update the Redmine integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesSlack` | `PUT` | `/api/v4/projects/{id}/services/slack` | Unmatched | Create or update the Slack integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesSquashTm` | `PUT` | `/api/v4/projects/{id}/services/squash-tm` | Unmatched | Create or update the Squash Tm integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesTeamcity` | `PUT` | `/api/v4/projects/{id}/services/teamcity` | Unmatched | Create or update the Teamcity integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesTelegram` | `PUT` | `/api/v4/projects/{id}/services/telegram` | Unmatched | Create or update the Telegram integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesUnifyCircuit` | `PUT` | `/api/v4/projects/{id}/services/unify-circuit` | Unmatched | Create or update the Unify Circuit integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesWebexTeams` | `PUT` | `/api/v4/projects/{id}/services/webex-teams` | Unmatched | Create or update the Webex Teams integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesYoutrack` | `PUT` | `/api/v4/projects/{id}/services/youtrack` | Unmatched | Create or update the Youtrack integration |
| `GitLabRestClient.putApiV4ProjectsIdServicesZentao` | `PUT` | `/api/v4/projects/{id}/services/zentao` | Unmatched | Create or update the Zentao integration |

</details>

<details>
<summary><strong>invitations</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdInvitationsEmail` | `DELETE` | `/api/v4/groups/{id}/invitations/{email}` | Unmatched | Delete an invitation to a group |
| `GitLabRestClient.deleteApiV4ProjectsIdInvitationsEmail` | `DELETE` | `/api/v4/projects/{id}/invitations/{email}` | Unmatched | Delete an invitation to a project |
| `GitLabRestClient.getApiV4GroupsIdInvitations` | `GET` | `/api/v4/groups/{id}/invitations` | Unmatched | List all pending invitations for a group |
| `GitLabRestClient.getApiV4ProjectsIdInvitations` | `GET` | `/api/v4/projects/{id}/invitations` | Unmatched | List all pending invitations for a project |
| `GitLabRestClient.postApiV4GroupsIdInvitations` | `POST` | `/api/v4/groups/{id}/invitations` | Unmatched | Add a member to a group |
| `GitLabRestClient.postApiV4ProjectsIdInvitations` | `POST` | `/api/v4/projects/{id}/invitations` | Unmatched | Add a member to a project |
| `GitLabRestClient.putApiV4GroupsIdInvitationsEmail` | `PUT` | `/api/v4/groups/{id}/invitations/{email}` | Unmatched | Update an invitation to a group |
| `GitLabRestClient.putApiV4ProjectsIdInvitationsEmail` | `PUT` | `/api/v4/projects/{id}/invitations/{email}` | Unmatched | Update an invitation to a project |

</details>

<details>
<summary><strong>issues</strong> (15)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdIssuesIssueIidLinksIssueLinkId` | `DELETE` | `/api/v4/projects/{id}/issues/{issue_iid}/links/{issue_link_id}` | Unmatched | Delete an issue link |
| `GitLabRestClient.getApiV4Issues` | `GET` | `/api/v4/issues` | `P:issue.read.v1` | List all issues for the currently authenticated user |
| `GitLabRestClient.getApiV4IssuesId` | `GET` | `/api/v4/issues/{id}` | `P:issue.read.v1` | Retrieve an issue |
| `GitLabRestClient.getApiV4IssuesStatistics` | `GET` | `/api/v4/issues_statistics` | Unmatched | Retrieve issues statistics for the currently authenticated user |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidLinks` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/links` | Unmatched | List all issue links |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidLinksIssueLinkId` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/links/{issue_link_id}` | Unmatched | Retrieve an issue link |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidParticipants` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/participants` | Unmatched | List all participants in an issue |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidRelatedMergeRequests` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/related_merge_requests` | Unmatched | List all merge requests related to an issue |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidTimeStats` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/time_stats` | Unmatched | Retrieve time tracking stats for an issue |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidUserAgentDetail` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/user_agent_detail` | Unmatched | Retrieve user agent details for an issue |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidAddSpentTime` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/add_spent_time` | Unmatched | Add spent time for an issue |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidLinks` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/links` | Unmatched | Create an issue link |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidResetSpentTime` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/reset_spent_time` | Unmatched | Reset spent time for an issue |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidResetTimeEstimate` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/reset_time_estimate` | Unmatched | Reset the estimated time for an issue |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidTimeEstimate` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/time_estimate` | Unmatched | Set the estimated time for an issue |

</details>

<details>
<summary><strong>jira_connect_subscriptions</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.postApiV4IntegrationsJiraConnectSubscriptions` | `POST` | `/api/v4/integrations/jira_connect/subscriptions` | Unmatched | Subscribe a namespace to a JiraConnectInstallation |

</details>

<details>
<summary><strong>jira_forge_installation</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.postApiV4IntegrationsJiraForgeInstallationForgeToken` | `POST` | `/api/v4/integrations/jira_forge/installation/forge_token` | Unmatched | Register the GitLab for Jira (Forge) system token for direct dev-info sync |
| `GitLabRestClient.putApiV4IntegrationsJiraForgeInstallation` | `PUT` | `/api/v4/integrations/jira_forge/installation` | Unmatched | Update the GitLab for Jira (Forge) installation instance URL |

</details>

<details>
<summary><strong>jira_forge_subscriptions</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4IntegrationsJiraForgeSubscriptionsId` | `DELETE` | `/api/v4/integrations/jira_forge/subscriptions/{id}` | Unmatched | Delete a GitLab for Jira (Forge) namespace subscription |
| `GitLabRestClient.getApiV4IntegrationsJiraForgeSubscriptions` | `GET` | `/api/v4/integrations/jira_forge/subscriptions` | Unmatched | List GitLab for Jira (Forge) namespace subscriptions |
| `GitLabRestClient.postApiV4IntegrationsJiraForgeSubscriptions` | `POST` | `/api/v4/integrations/jira_forge/subscriptions` | Unmatched | Create a GitLab for Jira (Forge) namespace subscription |

</details>

<details>
<summary><strong>job_artifacts</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdArtifacts` | `DELETE` | `/api/v4/projects/{id}/artifacts` | Unmatched | Delete all job artifacts in a project |
| `GitLabRestClient.deleteApiV4ProjectsIdJobsJobIdArtifacts` | `DELETE` | `/api/v4/projects/{id}/jobs/{job_id}/artifacts` | `P:ci.artifacts.v1` | Delete job artifacts |
| `GitLabRestClient.getApiV4ProjectsIdJobsArtifactsRefNameDownload` | `GET` | `/api/v4/projects/{id}/jobs/artifacts/{ref_name}/download` | Unmatched | Retrieve job artifacts |
| `GitLabRestClient.getApiV4ProjectsIdJobsArtifactsRefNameRawArtifactPath` | `GET` | `/api/v4/projects/{id}/jobs/artifacts/{ref_name}/raw/{artifact_path}` | Unmatched | Download a specific file from artifacts archive from a ref |
| `GitLabRestClient.getApiV4ProjectsIdJobsJobIdArtifacts` | `GET` | `/api/v4/projects/{id}/jobs/{job_id}/artifacts` | `P:ci.artifacts.v1` | Download the artifacts archive from a job |
| `GitLabRestClient.getApiV4ProjectsIdJobsJobIdArtifactsArtifactPath` | `GET` | `/api/v4/projects/{id}/jobs/{job_id}/artifacts/{artifact_path}` | `P:ci.artifacts.v1` | Download a specific file from artifacts archive |
| `GitLabRestClient.getApiV4ProjectsIdJobsJobIdArtifactsTree` | `GET` | `/api/v4/projects/{id}/jobs/{job_id}/artifacts/tree` | Unmatched | List all files in an artifacts archive |
| `GitLabRestClient.postApiV4ProjectsIdJobsJobIdArtifactsKeep` | `POST` | `/api/v4/projects/{id}/jobs/{job_id}/artifacts/keep` | `P:ci.artifacts.v1` | Retain job artifacts |

</details>

<details>
<summary><strong>jobs</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4JobsIdArtifacts` | `GET` | `/api/v4/jobs/{id}/artifacts` | Unmatched | Download job artifacts |
| `GitLabRestClient.getApiV4RunnersIdJobs` | `GET` | `/api/v4/runners/{id}/jobs` | Unmatched | List all jobs processed by a runner |
| `GitLabRestClient.patchApiV4JobsIdTrace` | `PATCH` | `/api/v4/jobs/{id}/trace` | Unmatched | Append a patch to the job trace |
| `GitLabRestClient.postApiV4JobsIdArtifacts` | `POST` | `/api/v4/jobs/{id}/artifacts` | Unmatched | Upload job artifacts |
| `GitLabRestClient.postApiV4JobsIdArtifactsAuthorize` | `POST` | `/api/v4/jobs/{id}/artifacts/authorize` | Unmatched | Authorize artifacts upload |
| `GitLabRestClient.postApiV4JobsRequest` | `POST` | `/api/v4/jobs/request` | Unmatched | Request a job |
| `GitLabRestClient.putApiV4JobsId` | `PUT` | `/api/v4/jobs/{id}` | Unmatched | Update a job |

</details>

<details>
<summary><strong>keys</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdSshCertificatesSshCertificatesId` | `DELETE` | `/api/v4/groups/{id}/ssh_certificates/{ssh_certificates_id}` | Unmatched | Delete a group SSH certificate |
| `GitLabRestClient.getApiV4GroupsIdSshCertificates` | `GET` | `/api/v4/groups/{id}/ssh_certificates` | Unmatched | Get a list of Groups::SshCertificate for a Group. |
| `GitLabRestClient.getApiV4Keys` | `GET` | `/api/v4/keys` | Unmatched | Retrieve user by SSH key fingerprint |
| `GitLabRestClient.getApiV4KeysId` | `GET` | `/api/v4/keys/{id}` | Unmatched | Retrieve user by SSH key ID |
| `GitLabRestClient.postApiV4GroupsIdSshCertificates` | `POST` | `/api/v4/groups/{id}/ssh_certificates` | Unmatched | Add a Groups::SshCertificate. |

</details>

<details>
<summary><strong>ldap</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.postApiV4GroupsIdLdapSync` | `POST` | `/api/v4/groups/{id}/ldap_sync` | Unmatched | Sync a group with LDAP |

</details>

<details>
<summary><strong>markdown</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.postApiV4Markdown` | `POST` | `/api/v4/markdown` | Unmatched | Render Markdown content |

</details>

<details>
<summary><strong>members</strong> (23)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdBillableMembersUserId` | `DELETE` | `/api/v4/groups/{id}/billable_members/{user_id}` | Unmatched | Remove a billable member from a group |
| `GitLabRestClient.deleteApiV4GroupsIdMembersUserId` | `DELETE` | `/api/v4/groups/{id}/members/{user_id}` | Unmatched | Remove a member from a group |
| `GitLabRestClient.deleteApiV4GroupsIdMembersUserIdOverride` | `DELETE` | `/api/v4/groups/{id}/members/{user_id}/override` | Unmatched | Remove an LDAP access level override |
| `GitLabRestClient.deleteApiV4ProjectsIdMembersUserId` | `DELETE` | `/api/v4/projects/{id}/members/{user_id}` | Unmatched | Remove a member from a project |
| `GitLabRestClient.getApiV4GroupsIdBillableMembersUserIdIndirect` | `GET` | `/api/v4/groups/{id}/billable_members/{user_id}/indirect` | Unmatched | List all indirect memberships for a billable group member |
| `GitLabRestClient.getApiV4GroupsIdBillableMembersUserIdMemberships` | `GET` | `/api/v4/groups/{id}/billable_members/{user_id}/memberships` | Unmatched | List all memberships for a billable group member |
| `GitLabRestClient.getApiV4GroupsIdMembers` | `GET` | `/api/v4/groups/{id}/members` | `P:namespace.members.read.v1` | List all direct members of a group |
| `GitLabRestClient.getApiV4GroupsIdMembersAll` | `GET` | `/api/v4/groups/{id}/members/all` | `P:namespace.members.read.v1` | List all members of a group |
| `GitLabRestClient.getApiV4GroupsIdMembersAllUserId` | `GET` | `/api/v4/groups/{id}/members/all/{user_id}` | Unmatched | Retrieve a group member |
| `GitLabRestClient.getApiV4GroupsIdMembersUserId` | `GET` | `/api/v4/groups/{id}/members/{user_id}` | Unmatched | Retrieve a direct group member |
| `GitLabRestClient.getApiV4GroupsIdPendingMembers` | `GET` | `/api/v4/groups/{id}/pending_members` | Unmatched | List all pending group members |
| `GitLabRestClient.getApiV4ProjectsIdMembers` | `GET` | `/api/v4/projects/{id}/members` | `P:collaborator.read.v1` | List all direct members of a project |
| `GitLabRestClient.getApiV4ProjectsIdMembersAll` | `GET` | `/api/v4/projects/{id}/members/all` | `P:collaborator.read.v1` | List all members of a project |
| `GitLabRestClient.getApiV4ProjectsIdMembersAllUserId` | `GET` | `/api/v4/projects/{id}/members/all/{user_id}` | Unmatched | Retrieve a project member |
| `GitLabRestClient.getApiV4ProjectsIdMembersUserId` | `GET` | `/api/v4/projects/{id}/members/{user_id}` | Unmatched | Retrieve a direct project member |
| `GitLabRestClient.postApiV4GroupsIdMembers` | `POST` | `/api/v4/groups/{id}/members` | Unmatched | Add a member to a group |
| `GitLabRestClient.postApiV4GroupsIdMembersApproveAll` | `POST` | `/api/v4/groups/{id}/members/approve_all` | Unmatched | Approve all pending group members |
| `GitLabRestClient.postApiV4GroupsIdMembersUserIdOverride` | `POST` | `/api/v4/groups/{id}/members/{user_id}/override` | Unmatched | Set override flag for a member of a group |
| `GitLabRestClient.postApiV4ProjectsIdMembers` | `POST` | `/api/v4/projects/{id}/members` | Unmatched | Add a member to a project |
| `GitLabRestClient.putApiV4GroupsIdMembersMemberIdApprove` | `PUT` | `/api/v4/groups/{id}/members/{member_id}/approve` | Unmatched | Approve a group member |
| `GitLabRestClient.putApiV4GroupsIdMembersUserId` | `PUT` | `/api/v4/groups/{id}/members/{user_id}` | Unmatched | Update a group member |
| `GitLabRestClient.putApiV4GroupsIdMembersUserIdState` | `PUT` | `/api/v4/groups/{id}/members/{user_id}/state` | Unmatched | Update group membership state for a user |
| `GitLabRestClient.putApiV4ProjectsIdMembersUserId` | `PUT` | `/api/v4/projects/{id}/members/{user_id}` | Unmatched | Update a project member |

</details>

<details>
<summary><strong>merge_request_approvals</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidApprovalState` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/approval_state` | Unmatched | Retrieve approval details for a merge request |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidApprovals` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/approvals` | `P:pull-request.review.v1` | Retrieve approval state for a merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidApprovals` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/approvals` | Unmatched | [Deprecated] Change approval-related configuration |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/approve` | `P:pull-request.review.v1` | Approve merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidUnapprove` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/unapprove` | `P:pull-request.review.v1` | Unapprove a merge request |
| `GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIidResetApprovals` | `PUT` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/reset_approvals` | Unmatched | Reset approvals for a merge request |

</details>

<details>
<summary><strong>merge_requests</strong> (32)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdMergeRequestsMergeRequestIid` | `DELETE` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}` | Unmatched | Delete a merge request |
| `GitLabRestClient.deleteApiV4ProjectsIdMergeRequestsMergeRequestIidContextCommits` | `DELETE` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/context_commits` | Unmatched | Delete context commits from a merge request |
| `GitLabRestClient.getApiV4GroupsIdMergeRequests` | `GET` | `/api/v4/groups/{id}/merge_requests` | Unmatched | List all group merge requests |
| `GitLabRestClient.getApiV4MergeRequests` | `GET` | `/api/v4/merge_requests` | Unmatched | List all merge requests |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequests` | `GET` | `/api/v4/projects/{id}/merge_requests` | `E:pull-request.core.v1` | List all project merge requests |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIid` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}` | `E:pull-request.core.v1` | Retrieve a merge request |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidChanges` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/changes` | `E:pull-request.changes.v1` | Retrieve merge request changes |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidClosesIssues` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/closes_issues` | Unmatched | List all issues that close on merge |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidCommits` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/commits` | `E:pull-request.changes.v1` | Retrieve merge request commits |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidContextCommits` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/context_commits` | Unmatched | List all context commits for a merge request |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidDiffs` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/diffs` | `E:pull-request.changes.v1` | List all merge request diffs |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidMergeRef` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/merge_ref` | Unmatched | Merge to default merge ref path |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidParticipants` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/participants` | Unmatched | Retrieve merge request participants |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidPipelines` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/pipelines` | Unmatched | List all merge request pipelines |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidRawDiffs` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/raw_diffs` | `E:pull-request.changes.v1` | Retrieve merge request raw diffs |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidRelatedIssues` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/related_issues` | Unmatched | List all issues related to the merge request |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidReviewers` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/reviewers` | `P:pull-request.reviewers.v1` | Retrieve merge request reviewers |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidTimeStats` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/time_stats` | Unmatched | Retrieve time tracking stats for a merge request |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidVersions` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/versions` | Unmatched | Retrieve merge request diff versions |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsMergeRequestIidVersionsVersionId` | `GET` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/versions/{version_id}` | Unmatched | Retrieve a merge request diff version |
| `GitLabRestClient.postApiV4ProjectsIdCreateCiConfig` | `POST` | `/api/v4/projects/{id}/create_ci_config` | Unmatched | Create a CI configuration merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequests` | `POST` | `/api/v4/projects/{id}/merge_requests` | `E:pull-request.core.v1` | Create a merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidAddSpentTime` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/add_spent_time` | Unmatched | Add spent time for a merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidCancelMergeWhenPipelineSucceeds` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/cancel_merge_when_pipeline_succeeds` | Unmatched | Cancel merge when pipeline succeeds |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidContextCommits` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/context_commits` | Unmatched | Create context commits for a merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidPipelines` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/pipelines` | Unmatched | Create a merge request pipeline |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidResetSpentTime` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/reset_spent_time` | Unmatched | Reset spent time for a merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidResetTimeEstimate` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/reset_time_estimate` | Unmatched | Reset the estimated time for a merge request |
| `GitLabRestClient.postApiV4ProjectsIdMergeRequestsMergeRequestIidTimeEstimate` | `POST` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/time_estimate` | Unmatched | Set the estimated time for a merge request |
| `GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIid` | `PUT` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}` | `E:pull-request.core.v1`<br>`P:pull-request.reviewers.v1` | Update a merge request |
| `GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIidMerge` | `PUT` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/merge` | `E:pull-request.merge.v1` | Merge a merge request |
| `GitLabRestClient.putApiV4ProjectsIdMergeRequestsMergeRequestIidRebase` | `PUT` | `/api/v4/projects/{id}/merge_requests/{merge_request_iid}/rebase` | Unmatched | Rebase a merge request |

</details>

<details>
<summary><strong>metadata</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4Metadata` | `GET` | `/api/v4/metadata` | Unmatched | Retrieve metadata information for this GitLab instance |
| `GitLabRestClient.getApiV4Version` | `GET` | `/api/v4/version` | Unmatched | Retrieves version information for the GitLab instance |

</details>

<details>
<summary><strong>metric_images</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdIssuesIssueIidMetricImagesMetricImageId` | `DELETE` | `/api/v4/projects/{id}/issues/{issue_iid}/metric_images/{metric_image_id}` | Unmatched | Delete a metric image from an incident |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidMetricImages` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/metric_images` | Unmatched | List all metric images for an incident |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidMetricImages` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/metric_images` | Unmatched | Upload a metric image for an incident |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidMetricImagesAuthorize` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/metric_images/authorize` | Unmatched | Authorize metric image upload |
| `GitLabRestClient.putApiV4ProjectsIdIssuesIssueIidMetricImagesMetricImageId` | `PUT` | `/api/v4/projects/{id}/issues/{issue_iid}/metric_images/{metric_image_id}` | Unmatched | Update a metric image for an incident |

</details>

<details>
<summary><strong>metrics</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4UsageDataMetricDefinitions` | `GET` | `/api/v4/usage_data/metric_definitions` | Unmatched | Download metric definitions |

</details>

<details>
<summary><strong>migrations</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4AdminMigrationsPending` | `GET` | `/api/v4/admin/migrations/pending` | Unmatched | List all pending migrations |
| `GitLabRestClient.postApiV4AdminMigrationsTimestampMark` | `POST` | `/api/v4/admin/migrations/{timestamp}/mark` | Unmatched | Update status of a migration |

</details>

<details>
<summary><strong>ml_model_registry</strong> (3)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileName` | `GET` | `/api/v4/projects/{id}/packages/ml_models/{model_version_id}/files/{path}/{file_name}` | Unmatched | Download an ml_model package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileName` | `PUT` | `/api/v4/projects/{id}/packages/ml_models/{model_version_id}/files/{path}/{file_name}` | Unmatched | Workhorse upload model package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileNameAuthorize` | `PUT` | `/api/v4/projects/{id}/packages/ml_models/{model_version_id}/files/{path}/{file_name}/authorize` | Unmatched | Workhorse authorize model package file |

</details>

<details>
<summary><strong>namespaces</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4NamespacesIdStorageLimitExclusion` | `DELETE` | `/api/v4/namespaces/{id}/storage/limit_exclusion` | Unmatched | Removes a storage limit exclusion for a Namespace |
| `GitLabRestClient.getApiV4Namespaces` | `GET` | `/api/v4/namespaces` | Unmatched | List all namespaces |
| `GitLabRestClient.getApiV4NamespacesId` | `GET` | `/api/v4/namespaces/{id}` | Unmatched | Retrieve namespace details |
| `GitLabRestClient.getApiV4NamespacesIdExists` | `GET` | `/api/v4/namespaces/{id}/exists` | Unmatched | Verify namespace availability |
| `GitLabRestClient.getApiV4NamespacesIdGitlabSubscription` | `GET` | `/api/v4/namespaces/{id}/gitlab_subscription` | Unmatched | Retrieve namespace subscription |
| `GitLabRestClient.getApiV4NamespacesStorageLimitExclusions` | `GET` | `/api/v4/namespaces/storage/limit_exclusions` | Unmatched | Retrieve all limit exclusions |
| `GitLabRestClient.postApiV4NamespacesIdStorageLimitExclusion` | `POST` | `/api/v4/namespaces/{id}/storage/limit_exclusion` | Unmatched | Creates a storage limit exclusion for a Namespace |
| `GitLabRestClient.putApiV4NamespacesId` | `PUT` | `/api/v4/namespaces/{id}` | Unmatched | Update a namespace |

</details>

<details>
<summary><strong>offline_transfers</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4OfflineExports` | `GET` | `/api/v4/offline_exports` | Unmatched | List all offline transfer exports |
| `GitLabRestClient.getApiV4OfflineExportsId` | `GET` | `/api/v4/offline_exports/{id}` | Unmatched | Get offline transfer export details |
| `GitLabRestClient.postApiV4OfflineExports` | `POST` | `/api/v4/offline_exports` | Unmatched | Start a new offline transfer export |
| `GitLabRestClient.postApiV4OfflineImports` | `POST` | `/api/v4/offline_imports` | Unmatched | Start a new offline transfer import |

</details>

<details>
<summary><strong>organizations</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4OrganizationsId` | `DELETE` | `/api/v4/organizations/{id}` | Unmatched | Soft-delete an organization |
| `GitLabRestClient.postApiV4Organizations` | `POST` | `/api/v4/organizations` | Unmatched | Create an organization |

</details>

<details>
<summary><strong>packages</strong> (20)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesPackageId` | `DELETE` | `/api/v4/projects/{id}/packages/{package_id}` | `P:packages.metadata.v1` | Delete a project package |
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesPackageIdPackageFilesPackageFileId` | `DELETE` | `/api/v4/projects/{id}/packages/{package_id}/package_files/{package_file_id}` | Unmatched | Delete a package file |
| `GitLabRestClient.getApiV4GroupsIdPackages` | `GET` | `/api/v4/groups/{id}/packages` | Unmatched | List all packages for a group |
| `GitLabRestClient.getApiV4GroupsIdPackagesMavenPathFileName` | `GET` | `/api/v4/groups/{id}/-/packages/maven/{path}/{file_name}` | Unmatched | Download the maven package file at a group level |
| `GitLabRestClient.getApiV4PackagesMavenPathFileName` | `GET` | `/api/v4/packages/maven/{path}/{file_name}` | Unmatched | Download the maven package file at instance level |
| `GitLabRestClient.getApiV4ProjectsIdPackages` | `GET` | `/api/v4/projects/{id}/packages` | `P:packages.metadata.v1` | List all packages for a project |
| `GitLabRestClient.getApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName` | `GET` | `/api/v4/projects/{id}/packages/generic/{package_name}/{package_version}/{path}/{file_name}` | `U:gitlab.package-protocols` | Download package file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesGoModuleNameVList` | `GET` | `/api/v4/projects/{id}/packages/go/{module_name}/@v/list` | Unmatched | List |
| `GitLabRestClient.getApiV4ProjectsIdPackagesGoModuleNameVModuleVersionInfo` | `GET` | `/api/v4/projects/{id}/packages/go/{module_name}/@v/{module_version}.info` | Unmatched | Version metadata |
| `GitLabRestClient.getApiV4ProjectsIdPackagesGoModuleNameVModuleVersionMod` | `GET` | `/api/v4/projects/{id}/packages/go/{module_name}/@v/{module_version}.mod` | Unmatched | Download module file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesGoModuleNameVModuleVersionZip` | `GET` | `/api/v4/projects/{id}/packages/go/{module_name}/@v/{module_version}.zip` | Unmatched | Download module source |
| `GitLabRestClient.getApiV4ProjectsIdPackagesMavenPathFileName` | `GET` | `/api/v4/projects/{id}/packages/maven/{path}/{file_name}` | Unmatched | Download the maven package file at a project level |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPackageId` | `GET` | `/api/v4/projects/{id}/packages/{package_id}` | `P:packages.metadata.v1` | Retrieve a project package |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPackageIdPackageFiles` | `GET` | `/api/v4/projects/{id}/packages/{package_id}/package_files` | `P:packages.metadata.v1` | List all package files |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPackageIdPackageFilesPackageFileIdDownload` | `GET` | `/api/v4/projects/{id}/packages/{package_id}/package_files/{package_file_id}/download` | Unmatched | Download a package file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPackageIdPipelines` | `GET` | `/api/v4/projects/{id}/packages/{package_id}/pipelines` | Unmatched | List all package pipelines |
| `GitLabRestClient.putApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName` | `PUT` | `/api/v4/projects/{id}/packages/generic/{package_name}/{package_version}/{path}/{file_name}` | Unmatched | Upload package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileNameAuthorize` | `PUT` | `/api/v4/projects/{id}/packages/generic/{package_name}/{package_version}/{path}/{file_name}/authorize` | Unmatched | Workhorse authorize generic package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesMavenPathFileName` | `PUT` | `/api/v4/projects/{id}/packages/maven/{path}/{file_name}` | `U:gitlab.package-protocols` | Upload the maven package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesMavenPathFileNameAuthorize` | `PUT` | `/api/v4/projects/{id}/packages/maven/{path}/{file_name}/authorize` | Unmatched | Workhorse authorize the maven package file upload |

</details>

<details>
<summary><strong>packages_cargo</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdPackagesCargo1PackageName` | `GET` | `/api/v4/projects/{id}/packages/cargo/1/{package_name}` | Unmatched | Get the sparse index for a Cargo crate (1-character name) |
| `GitLabRestClient.getApiV4ProjectsIdPackagesCargo2PackageName` | `GET` | `/api/v4/projects/{id}/packages/cargo/2/{package_name}` | Unmatched | Get the sparse index for a Cargo crate (2-character name) |
| `GitLabRestClient.getApiV4ProjectsIdPackagesCargo3FirstCharPackageName` | `GET` | `/api/v4/projects/{id}/packages/cargo/3/{first_char}/{package_name}` | Unmatched | Get the sparse index for a Cargo crate (3-character name) |
| `GitLabRestClient.getApiV4ProjectsIdPackagesCargoConfigJson` | `GET` | `/api/v4/projects/{id}/packages/cargo/config.json` | Unmatched | Get config.json |
| `GitLabRestClient.getApiV4ProjectsIdPackagesCargoPackageNamePackageVersionDownload` | `GET` | `/api/v4/projects/{id}/packages/cargo/{package_name}/{package_version}/download` | Unmatched | Download a Cargo crate |
| `GitLabRestClient.getApiV4ProjectsIdPackagesCargoPrefix1Prefix2PackageName` | `GET` | `/api/v4/projects/{id}/packages/cargo/{prefix_1}/{prefix_2}/{package_name}` | Unmatched | Get the sparse index for a Cargo crate (4+ character name) |

</details>

<details>
<summary><strong>packages_composer</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4GroupIdPackagesComposerP2PackageName` | `GET` | `/api/v4/group/{id}/-/packages/composer/p2/{package_name}` | Unmatched | Composer v2 packages p2 endpoint at group level for package versions metadata |
| `GitLabRestClient.getApiV4GroupIdPackagesComposerPSha` | `GET` | `/api/v4/group/{id}/-/packages/composer/p/{sha}` | Unmatched | List all packages for a group |
| `GitLabRestClient.getApiV4GroupIdPackagesComposerPackageName` | `GET` | `/api/v4/group/{id}/-/packages/composer/{package_name}` | Unmatched | Composer packages endpoint at group level for package versions metadata |
| `GitLabRestClient.getApiV4GroupIdPackagesComposerPackages` | `GET` | `/api/v4/group/{id}/-/packages/composer/packages` | Unmatched | Retrieve repository URL templates |
| `GitLabRestClient.getApiV4ProjectsIdPackagesComposerArchivesPackageName` | `GET` | `/api/v4/projects/{id}/packages/composer/archives/{package_name}` | Unmatched | Composer package endpoint to download a package archive |
| `GitLabRestClient.postApiV4ProjectsIdPackagesComposer` | `POST` | `/api/v4/projects/{id}/packages/composer` | Unmatched | Create a package |

</details>

<details>
<summary><strong>packages_conan</strong> (59)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannel` | `DELETE` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}` | Unmatched | Delete a recipe and package |
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannel` | `DELETE` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}` | Unmatched | Delete a recipe and package |
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePacka_07c4vz3` | `DELETE` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}` | Unmatched | Delete recipe revision |
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePacka_1j6ejfs` | `DELETE` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/packages/{conan_package_reference}/revisions/{package_revision}` | Unmatched | Delete a package revision |
| `GitLabRestClient.getApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannel` | `GET` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}` | Unmatched | Retrieve a recipe snapshot |
| `GitLabRestClient.getApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelDigest` | `GET` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/digest` | Unmatched | Retrieve a recipe manifest |
| `GitLabRestClient.getApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelDownloadUrls` | `GET` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/download_urls` | Unmatched | List all recipe download URLs |
| `GitLabRestClient.getApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelPack_0n8bt0z` | `GET` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}/download_urls` | Unmatched | List all package download URLs |
| `GitLabRestClient.getApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelPack_0z290ro` | `GET` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}/digest` | Unmatched | Retrieve a package manifest |
| `GitLabRestClient.getApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelPack_18dqf7f` | `GET` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}` | Unmatched | Retrieve a package snapshot |
| `GitLabRestClient.getApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelSearch` | `GET` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/search` | Unmatched | Retrieve package references metadata |
| `GitLabRestClient.getApiV4PackagesConanV1ConansSearch` | `GET` | `/api/v4/packages/conan/v1/conans/search` | Unmatched | Search for a Conan package |
| `GitLabRestClient.getApiV4PackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageChannelRecip_0fr3axm` | `GET` | `/api/v4/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/export/{file_name}` | Unmatched | Retrieve a recipe file |
| `GitLabRestClient.getApiV4PackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageChannelRecip_1ajkgmw` | `GET` | `/api/v4/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/package/{conan_package_reference}/{package_revision}/{file_name}` | Unmatched | Retrieve a package file |
| `GitLabRestClient.getApiV4PackagesConanV1Ping` | `GET` | `/api/v4/packages/conan/v1/ping` | Unmatched | Verify availability of a Conan repository |
| `GitLabRestClient.getApiV4PackagesConanV1UsersAuthenticate` | `GET` | `/api/v4/packages/conan/v1/users/authenticate` | Unmatched | Retrieve an authentication token |
| `GitLabRestClient.getApiV4PackagesConanV1UsersCheckCredentials` | `GET` | `/api/v4/packages/conan/v1/users/check_credentials` | Unmatched | Verify authentication credentials |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageC_0u2zqd9` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}/digest` | Unmatched | Retrieve a package manifest |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageC_0vyyac8` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}/download_urls` | Unmatched | List all package download URLs |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageC_0wfa7n9` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/download_urls` | Unmatched | List all recipe download URLs |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageC_1bsw1xy` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/search` | Unmatched | Retrieve package references metadata |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageC_1gswnd4` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}` | Unmatched | Retrieve a package snapshot |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageC_1tjqa12` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/digest` | Unmatched | Retrieve a recipe manifest |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannel` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}` | Unmatched | Retrieve a recipe snapshot |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1ConansSearch` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/conans/search` | Unmatched | Search for a Conan package |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageCh_109nc9v` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/export/{file_name}` | Unmatched | Retrieve a recipe file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageCh_1enj41p` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/package/{conan_package_reference}/{package_revision}/{file_name}` | Unmatched | Retrieve a package file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1Ping` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/ping` | Unmatched | Verify availability of a Conan repository |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1UsersAuthenticate` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/users/authenticate` | Unmatched | Retrieve an authentication token |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV1UsersCheckCredentials` | `GET` | `/api/v4/projects/{id}/packages/conan/v1/users/check_credentials` | Unmatched | Verify authentication credentials |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_0jx9z0f` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/packages/{conan_package_reference}/latest` | Unmatched | Retrieve latest package revision |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_0ut98w2` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/packages/{conan_package_reference}/revisions/{package_revision}/files/{file_name}` | Unmatched | Retrieve a package file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_168ud2p` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/search` | Unmatched | Retrieve package references metadata by recipe revision |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_18opf88` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/files` | Unmatched | List all recipe files |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_1a37tin` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/packages/{conan_package_reference}/revisions/{package_revision}/files` | Unmatched | List all package files |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_1c9oe9q` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/packages/{conan_package_reference}/revisions` | Unmatched | List all package revisions |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_1dnzq19` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/files/{file_name}` | Unmatched | Retrieve a recipe file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_1hbbav4` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/latest` | Unmatched | Retrieve latest recipe revision |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_1l8kyyz` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/search` | Unmatched | Retrieve package references metadata |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_1lmf5r7` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions` | Unmatched | List all recipe revisions |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2ConansSearch` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/conans/search` | Unmatched | Search for a Conan package |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2UsersAuthenticate` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/users/authenticate` | Unmatched | Retrieve an authentication token |
| `GitLabRestClient.getApiV4ProjectsIdPackagesConanV2UsersCheckCredentials` | `GET` | `/api/v4/projects/{id}/packages/conan/v2/users/check_credentials` | Unmatched | Verify authentication credentials |
| `GitLabRestClient.postApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelPac_17azztg` | `POST` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}/upload_urls` | Unmatched | List all package upload URLs |
| `GitLabRestClient.postApiV4PackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackageChannelUploadUrls` | `POST` | `/api/v4/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/upload_urls` | Unmatched | List all recipe upload URLs |
| `GitLabRestClient.postApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackage_1jp56hf` | `POST` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/packages/{conan_package_reference}/upload_urls` | Unmatched | List all package upload URLs |
| `GitLabRestClient.postApiV4ProjectsIdPackagesConanV1ConansPackageNamePackageVersionPackageUsernamePackage_1tgm0ze` | `POST` | `/api/v4/projects/{id}/packages/conan/v1/conans/{package_name}/{package_version}/{package_username}/{package_channel}/upload_urls` | Unmatched | List all recipe upload URLs |
| `GitLabRestClient.putApiV4PackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageChannelRecip_015c44l` | `PUT` | `/api/v4/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/export/{file_name}/authorize` | Unmatched | Workhorse authorize the Conan recipe file |
| `GitLabRestClient.putApiV4PackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageChannelRecip_0w7l54b` | `PUT` | `/api/v4/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/package/{conan_package_reference}/{package_revision}/{file_name}` | Unmatched | Upload a package file |
| `GitLabRestClient.putApiV4PackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageChannelRecip_16ncmq7` | `PUT` | `/api/v4/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/package/{conan_package_reference}/{package_revision}/{file_name}/authorize` | Unmatched | Workhorse authorize the Conan package file |
| `GitLabRestClient.putApiV4PackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageChannelRecip_1y5kgoh` | `PUT` | `/api/v4/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/export/{file_name}` | Unmatched | Upload a recipe file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageCh_10m964e` | `PUT` | `/api/v4/projects/{id}/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/package/{conan_package_reference}/{package_revision}/{file_name}` | Unmatched | Upload a package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageCh_15jpr3i` | `PUT` | `/api/v4/projects/{id}/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/package/{conan_package_reference}/{package_revision}/{file_name}/authorize` | Unmatched | Workhorse authorize the Conan package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageCh_1s433ls` | `PUT` | `/api/v4/projects/{id}/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/export/{file_name}/authorize` | Unmatched | Workhorse authorize the Conan recipe file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV1FilesPackageNamePackageVersionPackageUsernamePackageCh_1u6yw8o` | `PUT` | `/api/v4/projects/{id}/packages/conan/v1/files/{package_name}/{package_version}/{package_username}/{package_channel}/{recipe_revision}/export/{file_name}` | Unmatched | Upload a recipe file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_01eflq1` | `PUT` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/packages/{conan_package_reference}/revisions/{package_revision}/files/{file_name}/authorize` | Unmatched | Workhorse authorize the Conan package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_08vpsal` | `PUT` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/packages/{conan_package_reference}/revisions/{package_revision}/files/{file_name}` | Unmatched | Upload a package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_0cqihg2` | `PUT` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/files/{file_name}/authorize` | Unmatched | Workhorse authorize the Conan recipe file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesConanV2ConansPackageNamePackageVersionPackageUsernamePackageC_0gzc66y` | `PUT` | `/api/v4/projects/{id}/packages/conan/v2/conans/{package_name}/{package_version}/{package_username}/{package_channel}/revisions/{recipe_revision}/files/{file_name}` | Unmatched | Upload a recipe file |

</details>

<details>
<summary><strong>packages_debian</strong> (34)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdDebianDistributionsCodename` | `DELETE` | `/api/v4/groups/{id}/-/debian_distributions/{codename}` | Unmatched | Delete a Debian group distribution |
| `GitLabRestClient.deleteApiV4ProjectsIdDebianDistributionsCodename` | `DELETE` | `/api/v4/projects/{id}/debian_distributions/{codename}` | Unmatched | Delete a Debian project distribution |
| `GitLabRestClient.getApiV4GroupsIdDebianDistributions` | `GET` | `/api/v4/groups/{id}/-/debian_distributions` | Unmatched | List all Debian group distributions |
| `GitLabRestClient.getApiV4GroupsIdDebianDistributionsCodename` | `GET` | `/api/v4/groups/{id}/-/debian_distributions/{codename}` | Unmatched | Retrieve a Debian group distribution |
| `GitLabRestClient.getApiV4GroupsIdDebianDistributionsCodenameKeyAsc` | `GET` | `/api/v4/groups/{id}/-/debian_distributions/{codename}/key.asc` | Unmatched | Retrieve a Debian group distribution key |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionComponentBinaryArchitectureByHashSha256FileSha256` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/{component}/binary-{architecture}/by-hash/SHA256/{file_sha256}` | Unmatched | The binary files index by hash |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionComponentBinaryArchitecturePackages` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/{component}/binary-{architecture}/Packages` | Unmatched | The binary files index |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionComponentDebianInstallerBinaryArchitectu_0evct1s` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/{component}/debian-installer/binary-{architecture}/Packages` | Unmatched | The installer (udeb) binary files index |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionComponentDebianInstallerBinaryArchitectu_14vhb3m` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/{component}/debian-installer/binary-{architecture}/by-hash/SHA256/{file_sha256}` | Unmatched | The installer (udeb) binary files index by hash |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionComponentSourceByHashSha256FileSha256` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/{component}/source/by-hash/SHA256/{file_sha256}` | Unmatched | The source files index by hash |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionComponentSourceSources` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/{component}/source/Sources` | Unmatched | The source files index |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionInrelease` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/InRelease` | Unmatched | The signed Release file |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionRelease` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/Release` | Unmatched | The unsigned Release file |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianDistsDistributionReleaseGpg` | `GET` | `/api/v4/groups/{id}/-/packages/debian/dists/{distribution}/Release.gpg` | Unmatched | The Release file signature |
| `GitLabRestClient.getApiV4GroupsIdPackagesDebianPoolDistributionProjectIdLetterPackageNamePackageVersionFileName` | `GET` | `/api/v4/groups/{id}/-/packages/debian/pool/{distribution}/{project_id}/{letter}/{package_name}/{package_version}/{file_name}` | Unmatched | Download Debian package |
| `GitLabRestClient.getApiV4ProjectsIdDebianDistributions` | `GET` | `/api/v4/projects/{id}/debian_distributions` | Unmatched | List all Debian project distributions |
| `GitLabRestClient.getApiV4ProjectsIdDebianDistributionsCodename` | `GET` | `/api/v4/projects/{id}/debian_distributions/{codename}` | Unmatched | Retrieve a Debian project distribution |
| `GitLabRestClient.getApiV4ProjectsIdDebianDistributionsCodenameKeyAsc` | `GET` | `/api/v4/projects/{id}/debian_distributions/{codename}/key.asc` | Unmatched | Retrieve a Debian project distribution key |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionComponentBinaryArchitectureByHashSha25_0gjm3th` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/{component}/binary-{architecture}/by-hash/SHA256/{file_sha256}` | Unmatched | The binary files index by hash |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionComponentBinaryArchitecturePackages` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/{component}/binary-{architecture}/Packages` | Unmatched | The binary files index |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionComponentDebianInstallerBinaryArchitec_10wt6b8` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/{component}/debian-installer/binary-{architecture}/by-hash/SHA256/{file_sha256}` | Unmatched | The installer (udeb) binary files index by hash |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionComponentDebianInstallerBinaryArchitec_1yaw3ou` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/{component}/debian-installer/binary-{architecture}/Packages` | Unmatched | The installer (udeb) binary files index |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionComponentSourceByHashSha256FileSha256` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/{component}/source/by-hash/SHA256/{file_sha256}` | Unmatched | The source files index by hash |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionComponentSourceSources` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/{component}/source/Sources` | Unmatched | The source files index |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionInrelease` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/InRelease` | Unmatched | The signed Release file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionRelease` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/Release` | Unmatched | The unsigned Release file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianDistsDistributionReleaseGpg` | `GET` | `/api/v4/projects/{id}/packages/debian/dists/{distribution}/Release.gpg` | Unmatched | The Release file signature |
| `GitLabRestClient.getApiV4ProjectsIdPackagesDebianPoolDistributionLetterPackageNamePackageVersionFileName` | `GET` | `/api/v4/projects/{id}/packages/debian/pool/{distribution}/{letter}/{package_name}/{package_version}/{file_name}` | Unmatched | Download a Debian package file |
| `GitLabRestClient.postApiV4GroupsIdDebianDistributions` | `POST` | `/api/v4/groups/{id}/-/debian_distributions` | Unmatched | Create a Debian group distribution |
| `GitLabRestClient.postApiV4ProjectsIdDebianDistributions` | `POST` | `/api/v4/projects/{id}/debian_distributions` | Unmatched | Create a Debian project distribution |
| `GitLabRestClient.putApiV4GroupsIdDebianDistributionsCodename` | `PUT` | `/api/v4/groups/{id}/-/debian_distributions/{codename}` | Unmatched | Update a Debian group distribution |
| `GitLabRestClient.putApiV4ProjectsIdDebianDistributionsCodename` | `PUT` | `/api/v4/projects/{id}/debian_distributions/{codename}` | Unmatched | Update a Debian project distribution |
| `GitLabRestClient.putApiV4ProjectsIdPackagesDebianFileName` | `PUT` | `/api/v4/projects/{id}/packages/debian/{file_name}` | Unmatched | Upload a Debian package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesDebianFileNameAuthorize` | `PUT` | `/api/v4/projects/{id}/packages/debian/{file_name}/authorize` | Unmatched | Authorize Debian package upload |

</details>

<details>
<summary><strong>packages_helm</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdPackagesHelmChannelChartsFileNameTgz` | `GET` | `/api/v4/projects/{id}/packages/helm/{channel}/charts/{file_name}.tgz` | Unmatched | Download a chart |
| `GitLabRestClient.getApiV4ProjectsIdPackagesHelmChannelIndexYaml` | `GET` | `/api/v4/projects/{id}/packages/helm/{channel}/index.yaml` | Unmatched | Download a chart index |
| `GitLabRestClient.postApiV4ProjectsIdPackagesHelmApiChannelCharts` | `POST` | `/api/v4/projects/{id}/packages/helm/api/{channel}/charts` | Unmatched | Upload a chart |
| `GitLabRestClient.postApiV4ProjectsIdPackagesHelmApiChannelChartsAuthorize` | `POST` | `/api/v4/projects/{id}/packages/helm/api/{channel}/charts/authorize` | Unmatched | Authorize a chart upload from workhorse |

</details>

<details>
<summary><strong>packages_npm</strong> (20)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdPackagesNpmPackagePackageNameDistTagsTag` | `DELETE` | `/api/v4/groups/{id}/-/packages/npm/-/package/{package_name}/dist-tags/{tag}` | Unmatched | Deletes the given tag |
| `GitLabRestClient.deleteApiV4PackagesNpmPackagePackageNameDistTagsTag` | `DELETE` | `/api/v4/packages/npm/-/package/{package_name}/dist-tags/{tag}` | Unmatched | Deletes the given tag |
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesNpmPackagePackageNameDistTagsTag` | `DELETE` | `/api/v4/projects/{id}/packages/npm/-/package/{package_name}/dist-tags/{tag}` | Unmatched | Deletes the given tag |
| `GitLabRestClient.getApiV4GroupsIdPackagesNpmPackageName` | `GET` | `/api/v4/groups/{id}/-/packages/npm/{package_name}` | Unmatched | NPM registry metadata endpoint |
| `GitLabRestClient.getApiV4GroupsIdPackagesNpmPackagePackageNameDistTags` | `GET` | `/api/v4/groups/{id}/-/packages/npm/-/package/{package_name}/dist-tags` | Unmatched | Get all tags for a given an NPM package |
| `GitLabRestClient.getApiV4PackagesNpmPackageName` | `GET` | `/api/v4/packages/npm/{package_name}` | Unmatched | NPM registry metadata endpoint |
| `GitLabRestClient.getApiV4PackagesNpmPackagePackageNameDistTags` | `GET` | `/api/v4/packages/npm/-/package/{package_name}/dist-tags` | Unmatched | Get all tags for a given an NPM package |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNpmPackageName` | `GET` | `/api/v4/projects/{id}/packages/npm/{package_name}` | Unmatched | NPM registry metadata endpoint |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNpmPackageNameFileName` | `GET` | `/api/v4/projects/{id}/packages/npm/{package_name}/-/{file_name}` | Unmatched | Download the NPM tarball |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNpmPackagePackageNameDistTags` | `GET` | `/api/v4/projects/{id}/packages/npm/-/package/{package_name}/dist-tags` | Unmatched | Get all tags for a given an NPM package |
| `GitLabRestClient.postApiV4GroupsIdPackagesNpmNpmV1SecurityAdvisoriesBulk` | `POST` | `/api/v4/groups/{id}/-/packages/npm/-/npm/v1/security/advisories/bulk` | Unmatched | NPM registry bulk advisory endpoint |
| `GitLabRestClient.postApiV4GroupsIdPackagesNpmNpmV1SecurityAuditsQuick` | `POST` | `/api/v4/groups/{id}/-/packages/npm/-/npm/v1/security/audits/quick` | Unmatched | NPM registry quick audit endpoint |
| `GitLabRestClient.postApiV4PackagesNpmNpmV1SecurityAdvisoriesBulk` | `POST` | `/api/v4/packages/npm/-/npm/v1/security/advisories/bulk` | Unmatched | NPM registry bulk advisory endpoint |
| `GitLabRestClient.postApiV4PackagesNpmNpmV1SecurityAuditsQuick` | `POST` | `/api/v4/packages/npm/-/npm/v1/security/audits/quick` | Unmatched | NPM registry quick audit endpoint |
| `GitLabRestClient.postApiV4ProjectsIdPackagesNpmNpmV1SecurityAdvisoriesBulk` | `POST` | `/api/v4/projects/{id}/packages/npm/-/npm/v1/security/advisories/bulk` | Unmatched | NPM registry bulk advisory endpoint |
| `GitLabRestClient.postApiV4ProjectsIdPackagesNpmNpmV1SecurityAuditsQuick` | `POST` | `/api/v4/projects/{id}/packages/npm/-/npm/v1/security/audits/quick` | Unmatched | NPM registry quick audit endpoint |
| `GitLabRestClient.putApiV4GroupsIdPackagesNpmPackagePackageNameDistTagsTag` | `PUT` | `/api/v4/groups/{id}/-/packages/npm/-/package/{package_name}/dist-tags/{tag}` | Unmatched | Create or Update the given tag for the given NPM package and version |
| `GitLabRestClient.putApiV4PackagesNpmPackagePackageNameDistTagsTag` | `PUT` | `/api/v4/packages/npm/-/package/{package_name}/dist-tags/{tag}` | Unmatched | Create or Update the given tag for the given NPM package and version |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNpmPackageName` | `PUT` | `/api/v4/projects/{id}/packages/npm/{package_name}` | `U:gitlab.package-protocols` | Create or deprecate an NPM package |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNpmPackagePackageNameDistTagsTag` | `PUT` | `/api/v4/projects/{id}/packages/npm/-/package/{package_name}/dist-tags/{tag}` | Unmatched | Create or Update the given tag for the given NPM package and version |

</details>

<details>
<summary><strong>packages_nuget</strong> (26)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesNugetPackageNamePackageVersion` | `DELETE` | `/api/v4/projects/{id}/packages/nuget/{package_name}/{package_version}` | Unmatched | The NuGet Package Delete endpoint |
| `GitLabRestClient.getApiV4GroupsIdPackagesNugetIndex` | `GET` | `/api/v4/groups/{id}/-/packages/nuget/index` | Unmatched | The NuGet V3 Feed Service Index |
| `GitLabRestClient.getApiV4GroupsIdPackagesNugetMetadataPackageNameIndex` | `GET` | `/api/v4/groups/{id}/-/packages/nuget/metadata/{package_name}/index` | Unmatched | The NuGet Metadata Service - Package name level |
| `GitLabRestClient.getApiV4GroupsIdPackagesNugetMetadataPackageNamePackageVersion` | `GET` | `/api/v4/groups/{id}/-/packages/nuget/metadata/{package_name}/{package_version}` | Unmatched | The NuGet Metadata Service - Package name and version level |
| `GitLabRestClient.getApiV4GroupsIdPackagesNugetQuery` | `GET` | `/api/v4/groups/{id}/-/packages/nuget/query` | Unmatched | The NuGet Search Service |
| `GitLabRestClient.getApiV4GroupsIdPackagesNugetSymbolfilesFileNameSignatureSameFileName` | `GET` | `/api/v4/groups/{id}/-/packages/nuget/symbolfiles/{file_name}/{signature}/{same_file_name}` | Unmatched | The NuGet Symbol File Download Endpoint |
| `GitLabRestClient.getApiV4GroupsIdPackagesNugetV2` | `GET` | `/api/v4/groups/{id}/-/packages/nuget/v2` | Unmatched | The NuGet V2 Feed Service Index |
| `GitLabRestClient.getApiV4GroupsIdPackagesNugetV2Metadata` | `GET` | `/api/v4/groups/{id}/-/packages/nuget/v2/$metadata` | Unmatched | The NuGet V2 Feed Package $metadata endpoint |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetDownloadPackageNameIndex` | `GET` | `/api/v4/projects/{id}/packages/nuget/download/{package_name}/index` | Unmatched | The NuGet Content Service - index request |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetDownloadPackageNamePackageVersionPackageFilename` | `GET` | `/api/v4/projects/{id}/packages/nuget/download/{package_name}/{package_version}/{package_filename}` | Unmatched | The NuGet Content Service - content request |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetIndex` | `GET` | `/api/v4/projects/{id}/packages/nuget/index` | Unmatched | The NuGet V3 Feed Service Index |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetMetadataPackageNameIndex` | `GET` | `/api/v4/projects/{id}/packages/nuget/metadata/{package_name}/index` | Unmatched | The NuGet Metadata Service - Package name level |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetMetadataPackageNamePackageVersion` | `GET` | `/api/v4/projects/{id}/packages/nuget/metadata/{package_name}/{package_version}` | Unmatched | The NuGet Metadata Service - Package name and version level |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetQuery` | `GET` | `/api/v4/projects/{id}/packages/nuget/query` | Unmatched | The NuGet Search Service |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetSymbolfilesFileNameSignatureSameFileName` | `GET` | `/api/v4/projects/{id}/packages/nuget/symbolfiles/{file_name}/{signature}/{same_file_name}` | Unmatched | The NuGet Symbol File Download Endpoint |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetV2` | `GET` | `/api/v4/projects/{id}/packages/nuget/v2` | Unmatched | The NuGet V2 Feed Service Index |
| `GitLabRestClient.getApiV4ProjectsIdPackagesNugetV2Metadata` | `GET` | `/api/v4/projects/{id}/packages/nuget/v2/$metadata` | Unmatched | The NuGet V2 Feed Package $metadata endpoint |
| `GitLabRestClient.getApiV4ProjectsProjectIdPackagesNugetV2Findpackagesbyid` | `GET` | `/api/v4/projects/{project_id}/packages/nuget/v2/FindPackagesById()` | Unmatched | The NuGet V2 Feed Find Packages by ID endpoint |
| `GitLabRestClient.getApiV4ProjectsProjectIdPackagesNugetV2Packages` | `GET` | `/api/v4/projects/{project_id}/packages/nuget/v2/Packages()` | Unmatched | The NuGet V2 Feed Enumerate Packages endpoint |
| `GitLabRestClient.getApiV4ProjectsProjectIdPackagesNugetV2PackagesIdPackageNameVersionPackageVersion` | `GET` | `/api/v4/projects/{project_id}/packages/nuget/v2/Packages(Id='{package_name}',Version='{package_version}')` | Unmatched | The NuGet V2 Feed Single Package Metadata endpoint |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNuget` | `PUT` | `/api/v4/projects/{id}/packages/nuget` | `U:gitlab.package-protocols` | Upload a NuGet v3 package file for a project |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNugetAuthorize` | `PUT` | `/api/v4/projects/{id}/packages/nuget/authorize` | Unmatched | The NuGet Package Authorize endpoint |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNugetSymbolpackage` | `PUT` | `/api/v4/projects/{id}/packages/nuget/symbolpackage` | Unmatched | Upload a NuGet symbol package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNugetSymbolpackageAuthorize` | `PUT` | `/api/v4/projects/{id}/packages/nuget/symbolpackage/authorize` | Unmatched | The NuGet Symbol Package Authorize endpoint |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNugetV2` | `PUT` | `/api/v4/projects/{id}/packages/nuget/v2` | Unmatched | Upload a NuGet v2 package file for a project |
| `GitLabRestClient.putApiV4ProjectsIdPackagesNugetV2Authorize` | `PUT` | `/api/v4/projects/{id}/packages/nuget/v2/authorize` | Unmatched | The NuGet V2 Feed Package Authorize endpoint |

</details>

<details>
<summary><strong>packages_pypi</strong> (9)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4GroupsIdPackagesPypiFilesSha256FileIdentifier` | `GET` | `/api/v4/groups/{id}/-/packages/pypi/files/{sha256}/{file_identifier}` | Unmatched | Download a package file from a group |
| `GitLabRestClient.getApiV4GroupsIdPackagesPypiSimple` | `GET` | `/api/v4/groups/{id}/-/packages/pypi/simple` | Unmatched | List all packages for a group |
| `GitLabRestClient.getApiV4GroupsIdPackagesPypiSimplePackageName` | `GET` | `/api/v4/groups/{id}/-/packages/pypi/simple/{package_name}` | Unmatched | The PyPi Simple Group Package Endpoint |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPypiFilesSha256FileIdentifier` | `GET` | `/api/v4/projects/{id}/packages/pypi/files/{sha256}/{file_identifier}` | Unmatched | The PyPi package download endpoint |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPypiForwardPackageNameUpstreamPath` | `GET` | `/api/v4/projects/{id}/packages/pypi/forward/{package_name}/{upstream_path}` | Unmatched | Download a forwarded (proxied) PyPI package file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPypiSimple` | `GET` | `/api/v4/projects/{id}/packages/pypi/simple` | Unmatched | List all packages for a project |
| `GitLabRestClient.getApiV4ProjectsIdPackagesPypiSimplePackageName` | `GET` | `/api/v4/projects/{id}/packages/pypi/simple/{package_name}` | `U:gitlab.package-protocols` | The PyPi Simple Project Package Endpoint |
| `GitLabRestClient.postApiV4ProjectsIdPackagesPypi` | `POST` | `/api/v4/projects/{id}/packages/pypi` | Unmatched | Upload a package |
| `GitLabRestClient.postApiV4ProjectsIdPackagesPypiAuthorize` | `POST` | `/api/v4/projects/{id}/packages/pypi/authorize` | Unmatched | Authorize the PyPi package upload from workhorse |

</details>

<details>
<summary><strong>packages_rpm</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdPackagesRpmPackageFileIdFileName` | `GET` | `/api/v4/projects/{id}/packages/rpm/{package_file_id}/{file_name}` | Unmatched | Download RPM package files |
| `GitLabRestClient.getApiV4ProjectsIdPackagesRpmRepodataFileName` | `GET` | `/api/v4/projects/{id}/packages/rpm/repodata/{file_name}` | Unmatched | Download repository metadata files |
| `GitLabRestClient.postApiV4ProjectsIdPackagesRpm` | `POST` | `/api/v4/projects/{id}/packages/rpm` | Unmatched | Upload a RPM package |
| `GitLabRestClient.postApiV4ProjectsIdPackagesRpmAuthorize` | `POST` | `/api/v4/projects/{id}/packages/rpm/authorize` | Unmatched | Authorize package upload from workhorse |

</details>

<details>
<summary><strong>packages_rubygem</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdPackagesRubygemsApiV1Dependencies` | `GET` | `/api/v4/projects/{id}/packages/rubygems/api/v1/dependencies` | Unmatched | Retrieve dependencies |
| `GitLabRestClient.getApiV4ProjectsIdPackagesRubygemsFileName` | `GET` | `/api/v4/projects/{id}/packages/rubygems/{file_name}` | Unmatched | Download the spec index file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesRubygemsGemsFileName` | `GET` | `/api/v4/projects/{id}/packages/rubygems/gems/{file_name}` | Unmatched | Download a gem file |
| `GitLabRestClient.getApiV4ProjectsIdPackagesRubygemsQuickMarshal48FileName` | `GET` | `/api/v4/projects/{id}/packages/rubygems/quick/Marshal.4.8/{file_name}` | Unmatched | Download a gemspec file |
| `GitLabRestClient.postApiV4ProjectsIdPackagesRubygemsApiV1Gems` | `POST` | `/api/v4/projects/{id}/packages/rubygems/api/v1/gems` | Unmatched | Upload a gem |
| `GitLabRestClient.postApiV4ProjectsIdPackagesRubygemsApiV1GemsAuthorize` | `POST` | `/api/v4/projects/{id}/packages/rubygems/api/v1/gems/authorize` | Unmatched | Authorize a gem upload from workhorse |

</details>

<details>
<summary><strong>pipeline_schedules</strong> (12)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdPipelineSchedulesPipelineScheduleId` | `DELETE` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}` | Unmatched | Delete a pipeline schedule |
| `GitLabRestClient.deleteApiV4ProjectsIdPipelineSchedulesPipelineScheduleIdVariablesKey` | `DELETE` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}/variables/{key}` | Unmatched | Delete a variable for a pipeline schedule |
| `GitLabRestClient.getApiV4ProjectsIdPipelineSchedules` | `GET` | `/api/v4/projects/{id}/pipeline_schedules` | Unmatched | List all pipeline schedules |
| `GitLabRestClient.getApiV4ProjectsIdPipelineSchedulesPipelineScheduleId` | `GET` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}` | Unmatched | Retrieve a pipeline schedule |
| `GitLabRestClient.getApiV4ProjectsIdPipelineSchedulesPipelineScheduleIdPipelines` | `GET` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}/pipelines` | Unmatched | List all pipelines triggered by a pipeline schedule |
| `GitLabRestClient.getApiV4ProjectsIdPipelineSchedulesPipelineScheduleIdVariablesKey` | `GET` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}/variables/{key}` | Unmatched | Retrieve a variable for a pipeline schedule |
| `GitLabRestClient.postApiV4ProjectsIdPipelineSchedules` | `POST` | `/api/v4/projects/{id}/pipeline_schedules` | Unmatched | Create a pipeline schedule |
| `GitLabRestClient.postApiV4ProjectsIdPipelineSchedulesPipelineScheduleIdPlay` | `POST` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}/play` | Unmatched | Run a pipeline schedule |
| `GitLabRestClient.postApiV4ProjectsIdPipelineSchedulesPipelineScheduleIdTakeOwnership` | `POST` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}/take_ownership` | Unmatched | Create or update ownership of a pipeline schedule |
| `GitLabRestClient.postApiV4ProjectsIdPipelineSchedulesPipelineScheduleIdVariables` | `POST` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}/variables` | Unmatched | Create a variable for a pipeline schedule |
| `GitLabRestClient.putApiV4ProjectsIdPipelineSchedulesPipelineScheduleId` | `PUT` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}` | Unmatched | Update a pipeline schedule |
| `GitLabRestClient.putApiV4ProjectsIdPipelineSchedulesPipelineScheduleIdVariablesKey` | `PUT` | `/api/v4/projects/{id}/pipeline_schedules/{pipeline_schedule_id}/variables/{key}` | Unmatched | Update a variable for a pipeline schedule |

</details>

<details>
<summary><strong>pipelines</strong> (14)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdPipelinesPipelineId` | `DELETE` | `/api/v4/projects/{id}/pipelines/{pipeline_id}` | Unmatched | Delete a pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelines` | `GET` | `/api/v4/projects/{id}/pipelines` | `P:ci.run.v1` | List all project pipelines |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesLatest` | `GET` | `/api/v4/projects/{id}/pipelines/latest` | Unmatched | Retrieve the latest pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineId` | `GET` | `/api/v4/projects/{id}/pipelines/{pipeline_id}` | `P:ci.run.v1` | Retrieve a pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineIdBridges` | `GET` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/bridges` | Unmatched | [Deprecated] List all bridge jobs by pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineIdJobs` | `GET` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/jobs` | `P:ci.jobs-logs.v1` | List all jobs by pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineIdTestReport` | `GET` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/test_report` | Unmatched | Retrieve a test report for a pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineIdTestReportSummary` | `GET` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/test_report_summary` | Unmatched | Retrieve a test report summary for a pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineIdTriggerJobs` | `GET` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/trigger_jobs` | Unmatched | List all trigger jobs by pipeline |
| `GitLabRestClient.getApiV4ProjectsIdPipelinesPipelineIdVariables` | `GET` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/variables` | Unmatched | List all pipeline variables |
| `GitLabRestClient.postApiV4ProjectsIdPipeline` | `POST` | `/api/v4/projects/{id}/pipeline` | `P:ci.run.v1` | Create a pipeline |
| `GitLabRestClient.postApiV4ProjectsIdPipelinesPipelineIdCancel` | `POST` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/cancel` | `P:ci.run.v1` | Cancel all jobs for a pipeline |
| `GitLabRestClient.postApiV4ProjectsIdPipelinesPipelineIdRetry` | `POST` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/retry` | `P:ci.run.v1` | Retry jobs in a pipeline |
| `GitLabRestClient.putApiV4ProjectsIdPipelinesPipelineIdMetadata` | `PUT` | `/api/v4/projects/{id}/pipelines/{pipeline_id}/metadata` | Unmatched | Update pipeline metadata |

</details>

<details>
<summary><strong>plan_limits</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ApplicationPlanLimits` | `GET` | `/api/v4/application/plan_limits` | Unmatched | Get current plan limits |
| `GitLabRestClient.putApiV4ApplicationPlanLimits` | `PUT` | `/api/v4/application/plan_limits` | Unmatched | Change plan limits |

</details>

<details>
<summary><strong>project_import</strong> (19)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdExport` | `GET` | `/api/v4/projects/{id}/export` | Unmatched | Retrieve the status of a project export |
| `GitLabRestClient.getApiV4ProjectsIdExportDownload` | `GET` | `/api/v4/projects/{id}/export/download` | Unmatched | Download a project export |
| `GitLabRestClient.getApiV4ProjectsIdExportRelationsDownload` | `GET` | `/api/v4/projects/{id}/export_relations/download` | Unmatched | Download a relations export for a project |
| `GitLabRestClient.getApiV4ProjectsIdExportRelationsStatus` | `GET` | `/api/v4/projects/{id}/export_relations/status` | Unmatched | Retrieve the status of an relations export for a project |
| `GitLabRestClient.getApiV4ProjectsIdImport` | `GET` | `/api/v4/projects/{id}/import` | Unmatched | Retrieve the status of a project import |
| `GitLabRestClient.getApiV4ProjectsIdRelationImports` | `GET` | `/api/v4/projects/{id}/relation-imports` | Unmatched | Retrieve the status of a project resource import |
| `GitLabRestClient.postApiV4ImportBitbucket` | `POST` | `/api/v4/import/bitbucket` | Unmatched | Import repository from Bitbucket Cloud |
| `GitLabRestClient.postApiV4ImportBitbucketServer` | `POST` | `/api/v4/import/bitbucket_server` | Unmatched | Import repository from Bitbucket Server |
| `GitLabRestClient.postApiV4ImportGithub` | `POST` | `/api/v4/import/github` | Unmatched | Import a repository from GitHub |
| `GitLabRestClient.postApiV4ImportGithubCancel` | `POST` | `/api/v4/import/github/cancel` | Unmatched | Cancel a GitHub project import |
| `GitLabRestClient.postApiV4ProjectsIdExport` | `POST` | `/api/v4/projects/{id}/export` | Unmatched | Export a project |
| `GitLabRestClient.postApiV4ProjectsIdExportRelations` | `POST` | `/api/v4/projects/{id}/export_relations` | Unmatched | Schedule a relations export for a project |
| `GitLabRestClient.postApiV4ProjectsIdImportGit` | `POST` | `/api/v4/projects/{id}/import/git` | Unmatched | Import a project from a Git URL |
| `GitLabRestClient.postApiV4ProjectsImport` | `POST` | `/api/v4/projects/import` | Unmatched | Import a project from a local archive |
| `GitLabRestClient.postApiV4ProjectsImportAuthorize` | `POST` | `/api/v4/projects/import/authorize` | Unmatched | Workhorse authorize the project import upload |
| `GitLabRestClient.postApiV4ProjectsImportRelation` | `POST` | `/api/v4/projects/import-relation` | Unmatched | Import project resources |
| `GitLabRestClient.postApiV4ProjectsImportRelationAuthorize` | `POST` | `/api/v4/projects/import-relation/authorize` | Unmatched | Authorize project relation import |
| `GitLabRestClient.postApiV4ProjectsRemoteImport` | `POST` | `/api/v4/projects/remote-import` | Unmatched | Import a project from a remote archive |
| `GitLabRestClient.postApiV4ProjectsRemoteImportS3` | `POST` | `/api/v4/projects/remote-import-s3` | Unmatched | Import a project from an AWS S3 bucket |

</details>

<details>
<summary><strong>project_snapshots</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdSnapshot` | `GET` | `/api/v4/projects/{id}/snapshot` | Unmatched | Download snapshot of a Git repository |

</details>

<details>
<summary><strong>project_templates</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdTemplatesType` | `GET` | `/api/v4/projects/{id}/templates/{type}` | Unmatched | List all templates of a particular type |
| `GitLabRestClient.getApiV4ProjectsIdTemplatesTypeName` | `GET` | `/api/v4/projects/{id}/templates/{type}/{name}` | Unmatched | Retrieve a template of a particular type |

</details>

<details>
<summary><strong>project_topics</strong> (6)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4TopicsId` | `DELETE` | `/api/v4/topics/{id}` | Unmatched | Delete a project topic |
| `GitLabRestClient.getApiV4Topics` | `GET` | `/api/v4/topics` | Unmatched | List all topics |
| `GitLabRestClient.getApiV4TopicsId` | `GET` | `/api/v4/topics/{id}` | Unmatched | Retrieve a topic |
| `GitLabRestClient.postApiV4Topics` | `POST` | `/api/v4/topics` | Unmatched | Create a project topic |
| `GitLabRestClient.postApiV4TopicsMerge` | `POST` | `/api/v4/topics/merge` | Unmatched | Merge topics |
| `GitLabRestClient.putApiV4TopicsId` | `PUT` | `/api/v4/topics/{id}` | Unmatched | Update a project topic |

</details>

<details>
<summary><strong>projects</strong> (74)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsId` | `DELETE` | `/api/v4/projects/{id}` | `P:repository.delete.v1` | Delete a project |
| `GitLabRestClient.deleteApiV4ProjectsIdFork` | `DELETE` | `/api/v4/projects/{id}/fork` | Unmatched | Delete a fork relationship |
| `GitLabRestClient.deleteApiV4ProjectsIdIssuesIssueIid` | `DELETE` | `/api/v4/projects/{id}/issues/{issue_iid}` | Unmatched | Delete an issue |
| `GitLabRestClient.deleteApiV4ProjectsIdPackagesProtectionRulesPackageProtectionRuleId` | `DELETE` | `/api/v4/projects/{id}/packages/protection/rules/{package_protection_rule_id}` | Unmatched | Delete a package protection rule |
| `GitLabRestClient.deleteApiV4ProjectsIdRegistryProtectionRepositoryRulesProtectionRuleId` | `DELETE` | `/api/v4/projects/{id}/registry/protection/repository/rules/{protection_rule_id}` | Unmatched | Delete a container repository protection rule |
| `GitLabRestClient.deleteApiV4ProjectsIdRegistryProtectionTagRulesProtectionRuleId` | `DELETE` | `/api/v4/projects/{id}/registry/protection/tag/rules/{protection_rule_id}` | Unmatched | Delete a container registry protection tag rule |
| `GitLabRestClient.deleteApiV4ProjectsIdRunnersRunnerId` | `DELETE` | `/api/v4/projects/{id}/runners/{runner_id}` | `P:ci.runners.v1` | Unassign a runner from a project |
| `GitLabRestClient.deleteApiV4ProjectsIdShareGroupId` | `DELETE` | `/api/v4/projects/{id}/share/{group_id}` | Unmatched | Delete a shared project link in a group |
| `GitLabRestClient.deleteApiV4ProjectsIdTerraformStateProtectionRulesTerraformStateProtectionRuleId` | `DELETE` | `/api/v4/projects/{id}/terraform/state_protection_rules/{terraform_state_protection_rule_id}` | Unmatched | Delete a Terraform state protection rule |
| `GitLabRestClient.deleteApiV4ProjectsIdUploadsSecretFilename` | `DELETE` | `/api/v4/projects/{id}/uploads/{secret}/{filename}` | Unmatched | Delete an uploaded file by secret and filename |
| `GitLabRestClient.deleteApiV4ProjectsIdUploadsUploadId` | `DELETE` | `/api/v4/projects/{id}/uploads/{upload_id}` | Unmatched | Delete an uploaded file by ID |
| `GitLabRestClient.getApiV4Projects` | `GET` | `/api/v4/projects` | `E:repository.list.v1` | List all projects |
| `GitLabRestClient.getApiV4ProjectsId` | `GET` | `/api/v4/projects/{id}` | `E:repository.get.v1` | Retrieve a project |
| `GitLabRestClient.getApiV4ProjectsIdAuditEvents` | `GET` | `/api/v4/projects/{id}/audit_events` | Unmatched | List all project audit events |
| `GitLabRestClient.getApiV4ProjectsIdAuditEventsAuditEventId` | `GET` | `/api/v4/projects/{id}/audit_events/{audit_event_id}` | Unmatched | Retrieve a project audit event |
| `GitLabRestClient.getApiV4ProjectsIdForks` | `GET` | `/api/v4/projects/{id}/forks` | `E:repository.fork.list.v1` | List all forks of a project |
| `GitLabRestClient.getApiV4ProjectsIdGroups` | `GET` | `/api/v4/projects/{id}/groups` | Unmatched | List all ancestor groups |
| `GitLabRestClient.getApiV4ProjectsIdInvitedGroups` | `GET` | `/api/v4/projects/{id}/invited_groups` | Unmatched | List all invited groups in a project |
| `GitLabRestClient.getApiV4ProjectsIdIssues` | `GET` | `/api/v4/projects/{id}/issues` | Unmatched | List all project issues |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIid` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}` | Unmatched | Retrieve a project issue |
| `GitLabRestClient.getApiV4ProjectsIdIssuesIssueIidClosedBy` | `GET` | `/api/v4/projects/{id}/issues/{issue_iid}/closed_by` | Unmatched | List all merge requests that close an issue on merge |
| `GitLabRestClient.getApiV4ProjectsIdIssuesStatistics` | `GET` | `/api/v4/projects/{id}/issues_statistics` | Unmatched | Retrieve issues statistics for a project |
| `GitLabRestClient.getApiV4ProjectsIdLanguages` | `GET` | `/api/v4/projects/{id}/languages` | Unmatched | Retrieve programming language usage information |
| `GitLabRestClient.getApiV4ProjectsIdPackagesProtectionRules` | `GET` | `/api/v4/projects/{id}/packages/protection/rules` | Unmatched | List all package protection rules |
| `GitLabRestClient.getApiV4ProjectsIdPagesAccess` | `GET` | `/api/v4/projects/{id}/pages_access` | Unmatched | Check pages access of this project |
| `GitLabRestClient.getApiV4ProjectsIdRegistryProtectionRepositoryRules` | `GET` | `/api/v4/projects/{id}/registry/protection/repository/rules` | Unmatched | List all container repository protection rules |
| `GitLabRestClient.getApiV4ProjectsIdRegistryProtectionTagRules` | `GET` | `/api/v4/projects/{id}/registry/protection/tag/rules` | Unmatched | List all container registry protection tag rules |
| `GitLabRestClient.getApiV4ProjectsIdRunners` | `GET` | `/api/v4/projects/{id}/runners` | `P:ci.runners.v1` | List project's runners |
| `GitLabRestClient.getApiV4ProjectsIdSearch` | `GET` | `/api/v4/projects/{id}/-/search` | `P:search.code.v1` | Search a project |
| `GitLabRestClient.getApiV4ProjectsIdStarrers` | `GET` | `/api/v4/projects/{id}/starrers` | Unmatched | List all users who starred a project |
| `GitLabRestClient.getApiV4ProjectsIdStatistics` | `GET` | `/api/v4/projects/{id}/statistics` | Unmatched | Retrieve the statistics of the last 30 days |
| `GitLabRestClient.getApiV4ProjectsIdStorage` | `GET` | `/api/v4/projects/{id}/storage` | Unmatched | Retrieve the path to repository storage |
| `GitLabRestClient.getApiV4ProjectsIdTerraformStateProtectionRules` | `GET` | `/api/v4/projects/{id}/terraform/state_protection_rules` | Unmatched | List all Terraform state protection rules for a project |
| `GitLabRestClient.getApiV4ProjectsIdTransferLocations` | `GET` | `/api/v4/projects/{id}/transfer_locations` | Unmatched | List all transferable namespaces for a project |
| `GitLabRestClient.getApiV4ProjectsIdUploads` | `GET` | `/api/v4/projects/{id}/uploads` | Unmatched | List all uploads |
| `GitLabRestClient.getApiV4ProjectsIdUploadsSecretFilename` | `GET` | `/api/v4/projects/{id}/uploads/{secret}/{filename}` | Unmatched | Download an uploaded file by secret and filename |
| `GitLabRestClient.getApiV4ProjectsIdUploadsUploadId` | `GET` | `/api/v4/projects/{id}/uploads/{upload_id}` | Unmatched | Download an uploaded file by ID |
| `GitLabRestClient.getApiV4ProjectsIdUsers` | `GET` | `/api/v4/projects/{id}/users` | Unmatched | List all members of a project |
| `GitLabRestClient.getApiV4RunnersIdProjects` | `GET` | `/api/v4/runners/{id}/projects` | Unmatched | List runner's projects |
| `GitLabRestClient.getApiV4UsersUserIdContributedProjects` | `GET` | `/api/v4/users/{user_id}/contributed_projects` | Unmatched | List all projects contributions for a user |
| `GitLabRestClient.getApiV4UsersUserIdProjects` | `GET` | `/api/v4/users/{user_id}/projects` | `E:repository.list.v1` | List all personal projects for a user |
| `GitLabRestClient.getApiV4UsersUserIdStarredProjects` | `GET` | `/api/v4/users/{user_id}/starred_projects` | Unmatched | List all projects starred by a user |
| `GitLabRestClient.patchApiV4ProjectsIdPackagesProtectionRulesPackageProtectionRuleId` | `PATCH` | `/api/v4/projects/{id}/packages/protection/rules/{package_protection_rule_id}` | Unmatched | Update a package protection rule |
| `GitLabRestClient.patchApiV4ProjectsIdRegistryProtectionRepositoryRulesProtectionRuleId` | `PATCH` | `/api/v4/projects/{id}/registry/protection/repository/rules/{protection_rule_id}` | Unmatched | Update a container repository protection rule |
| `GitLabRestClient.patchApiV4ProjectsIdRegistryProtectionTagRulesProtectionRuleId` | `PATCH` | `/api/v4/projects/{id}/registry/protection/tag/rules/{protection_rule_id}` | Unmatched | Update a container registry protection tag rule |
| `GitLabRestClient.patchApiV4ProjectsIdTerraformStateProtectionRulesTerraformStateProtectionRuleId` | `PATCH` | `/api/v4/projects/{id}/terraform/state_protection_rules/{terraform_state_protection_rule_id}` | Unmatched | Update a Terraform state protection rule for a project |
| `GitLabRestClient.postApiV4Projects` | `POST` | `/api/v4/projects` | `E:repository.create.v1` | Create a project |
| `GitLabRestClient.postApiV4ProjectsIdArchive` | `POST` | `/api/v4/projects/{id}/archive` | `E:repository.archive.v1` | Archive a project |
| `GitLabRestClient.postApiV4ProjectsIdFork` | `POST` | `/api/v4/projects/{id}/fork` | `E:repository.fork.create.v1` | Create a fork of a project |
| `GitLabRestClient.postApiV4ProjectsIdForkForkedFromId` | `POST` | `/api/v4/projects/{id}/fork/{forked_from_id}` | Unmatched | Create a fork relationship |
| `GitLabRestClient.postApiV4ProjectsIdHousekeeping` | `POST` | `/api/v4/projects/{id}/housekeeping` | Unmatched | Start the housekeeping task for a project |
| `GitLabRestClient.postApiV4ProjectsIdImportProjectMembersProjectId` | `POST` | `/api/v4/projects/{id}/import_project_members/{project_id}` | Unmatched | Import members |
| `GitLabRestClient.postApiV4ProjectsIdIssues` | `POST` | `/api/v4/projects/{id}/issues` | Unmatched | Create an issue |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidClone` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/clone` | Unmatched | Clone an issue |
| `GitLabRestClient.postApiV4ProjectsIdIssuesIssueIidMove` | `POST` | `/api/v4/projects/{id}/issues/{issue_iid}/move` | Unmatched | Move an issue |
| `GitLabRestClient.postApiV4ProjectsIdPackagesProtectionRules` | `POST` | `/api/v4/projects/{id}/packages/protection/rules` | Unmatched | Create a package protection rule |
| `GitLabRestClient.postApiV4ProjectsIdRegistryProtectionRepositoryRules` | `POST` | `/api/v4/projects/{id}/registry/protection/repository/rules` | Unmatched | Create a container repository protection rule |
| `GitLabRestClient.postApiV4ProjectsIdRegistryProtectionTagRules` | `POST` | `/api/v4/projects/{id}/registry/protection/tag/rules` | Unmatched | Create a container registry protection tag rule |
| `GitLabRestClient.postApiV4ProjectsIdRepositorySize` | `POST` | `/api/v4/projects/{id}/repository_size` | Unmatched | Start a task to recalculate repository size for a project |
| `GitLabRestClient.postApiV4ProjectsIdRestore` | `POST` | `/api/v4/projects/{id}/restore` | Unmatched | Restore a project marked for deletion |
| `GitLabRestClient.postApiV4ProjectsIdRunners` | `POST` | `/api/v4/projects/{id}/runners` | `P:ci.runners.v1` | Assign a runner to a project |
| `GitLabRestClient.postApiV4ProjectsIdRunnersResetRegistrationToken` | `POST` | `/api/v4/projects/{id}/runners/reset_registration_token` | Unmatched | Reset the runner registration token for a project |
| `GitLabRestClient.postApiV4ProjectsIdShare` | `POST` | `/api/v4/projects/{id}/share` | Unmatched | Share a project with a group |
| `GitLabRestClient.postApiV4ProjectsIdStar` | `POST` | `/api/v4/projects/{id}/star` | Unmatched | Star a project |
| `GitLabRestClient.postApiV4ProjectsIdTerraformStateProtectionRules` | `POST` | `/api/v4/projects/{id}/terraform/state_protection_rules` | Unmatched | Create a Terraform state protection rule for a project |
| `GitLabRestClient.postApiV4ProjectsIdUnarchive` | `POST` | `/api/v4/projects/{id}/unarchive` | `E:repository.archive.v1` | Unarchive a project |
| `GitLabRestClient.postApiV4ProjectsIdUnstar` | `POST` | `/api/v4/projects/{id}/unstar` | Unmatched | Unstar a project |
| `GitLabRestClient.postApiV4ProjectsIdUploads` | `POST` | `/api/v4/projects/{id}/uploads` | Unmatched | Create an upload |
| `GitLabRestClient.postApiV4ProjectsIdUploadsAuthorize` | `POST` | `/api/v4/projects/{id}/uploads/authorize` | Unmatched | Workhorse authorize the file upload |
| `GitLabRestClient.postApiV4ProjectsUserUserId` | `POST` | `/api/v4/projects/user/{user_id}` | `E:repository.create.v1` | Create a project for a user |
| `GitLabRestClient.putApiV4ProjectsId` | `PUT` | `/api/v4/projects/{id}` | `E:repository.update.v1` | Update a project |
| `GitLabRestClient.putApiV4ProjectsIdIssuesIssueIid` | `PUT` | `/api/v4/projects/{id}/issues/{issue_iid}` | Unmatched | Update an issue |
| `GitLabRestClient.putApiV4ProjectsIdIssuesIssueIidReorder` | `PUT` | `/api/v4/projects/{id}/issues/{issue_iid}/reorder` | Unmatched | Update the order of an issue |
| `GitLabRestClient.putApiV4ProjectsIdTransfer` | `PUT` | `/api/v4/projects/{id}/transfer` | Unmatched | Transfer a project to another namespace |

</details>

<details>
<summary><strong>projects_job_token_scope</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdJobTokenScopeAllowlistTargetProjectId` | `DELETE` | `/api/v4/projects/{id}/job_token_scope/allowlist/{target_project_id}` | Unmatched | Delete a project from a CI/CD job token allowlist |
| `GitLabRestClient.deleteApiV4ProjectsIdJobTokenScopeGroupsAllowlistTargetGroupId` | `DELETE` | `/api/v4/projects/{id}/job_token_scope/groups_allowlist/{target_group_id}` | Unmatched | Delete a group from a CI/CD job token allowlist |
| `GitLabRestClient.getApiV4ProjectsIdJobTokenScope` | `GET` | `/api/v4/projects/{id}/job_token_scope` | Unmatched | Retrieve the CI/CD job token access settings for a project |
| `GitLabRestClient.getApiV4ProjectsIdJobTokenScopeAllowlist` | `GET` | `/api/v4/projects/{id}/job_token_scope/allowlist` | Unmatched | List all projects in a CI/CD job token allowlist |
| `GitLabRestClient.getApiV4ProjectsIdJobTokenScopeGroupsAllowlist` | `GET` | `/api/v4/projects/{id}/job_token_scope/groups_allowlist` | Unmatched | List all groups in a CI/CD job token allowlist |
| `GitLabRestClient.patchApiV4ProjectsIdJobTokenScope` | `PATCH` | `/api/v4/projects/{id}/job_token_scope` | Unmatched | Update the CI/CD job token access settings for a project |
| `GitLabRestClient.postApiV4ProjectsIdJobTokenScopeAllowlist` | `POST` | `/api/v4/projects/{id}/job_token_scope/allowlist` | Unmatched | Add a project to a CI/CD job token allowlist |
| `GitLabRestClient.postApiV4ProjectsIdJobTokenScopeGroupsAllowlist` | `POST` | `/api/v4/projects/{id}/job_token_scope/groups_allowlist` | Unmatched | Add a group to a CI/CD job token allowlist |

</details>

<details>
<summary><strong>protected_branches</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdProtectedBranchesName` | `DELETE` | `/api/v4/projects/{id}/protected_branches/{name}` | `P:branch.protection.write.v1` | Unprotect repository branches |
| `GitLabRestClient.getApiV4ProjectsIdProtectedBranches` | `GET` | `/api/v4/projects/{id}/protected_branches` | `P:branch.protection.read.v1` | List all protected branches |
| `GitLabRestClient.getApiV4ProjectsIdProtectedBranchesName` | `GET` | `/api/v4/projects/{id}/protected_branches/{name}` | `P:branch.protection.read.v1` | Retrieve a protected branch or wildcard protected branch |
| `GitLabRestClient.patchApiV4ProjectsIdProtectedBranchesName` | `PATCH` | `/api/v4/projects/{id}/protected_branches/{name}` | `P:branch.protection.write.v1` | Update a protected branch |
| `GitLabRestClient.postApiV4ProjectsIdProtectedBranches` | `POST` | `/api/v4/projects/{id}/protected_branches` | `P:branch.protection.write.v1` | Protect repository branches |

</details>

<details>
<summary><strong>protected_tags</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdProtectedTagsName` | `DELETE` | `/api/v4/projects/{id}/protected_tags/{name}` | Unmatched | Unprotect repository tags |
| `GitLabRestClient.getApiV4ProjectsIdProtectedTags` | `GET` | `/api/v4/projects/{id}/protected_tags` | Unmatched | List all protected tags |
| `GitLabRestClient.getApiV4ProjectsIdProtectedTagsName` | `GET` | `/api/v4/projects/{id}/protected_tags/{name}` | Unmatched | Retrieve a protected tag or wildcard protected tag |
| `GitLabRestClient.postApiV4ProjectsIdProtectedTags` | `POST` | `/api/v4/projects/{id}/protected_tags` | Unmatched | Protect a repository tag |

</details>

<details>
<summary><strong>releases</strong> (14)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdReleasesTagName` | `DELETE` | `/api/v4/projects/{id}/releases/{tag_name}` | `E:release.crud.v1` | Delete a release |
| `GitLabRestClient.deleteApiV4ProjectsIdReleasesTagNameAssetsLinksLinkId` | `DELETE` | `/api/v4/projects/{id}/releases/{tag_name}/assets/links/{link_id}` | Unmatched | Delete a release link |
| `GitLabRestClient.getApiV4GroupsIdReleases` | `GET` | `/api/v4/groups/{id}/releases` | Unmatched | List all releases in a group |
| `GitLabRestClient.getApiV4ProjectsIdReleases` | `GET` | `/api/v4/projects/{id}/releases` | `E:release.crud.v1` | List all releases in a project |
| `GitLabRestClient.getApiV4ProjectsIdReleasesPermalinkLatestSuffixPath` | `GET` | `/api/v4/projects/{id}/releases/permalink/latest/{suffix_path}` | Unmatched | Get the latest project release |
| `GitLabRestClient.getApiV4ProjectsIdReleasesTagName` | `GET` | `/api/v4/projects/{id}/releases/{tag_name}` | `E:release.crud.v1` | Retrieve a release by tag name |
| `GitLabRestClient.getApiV4ProjectsIdReleasesTagNameAssetsLinks` | `GET` | `/api/v4/projects/{id}/releases/{tag_name}/assets/links` | Unmatched | List all release links |
| `GitLabRestClient.getApiV4ProjectsIdReleasesTagNameAssetsLinksLinkId` | `GET` | `/api/v4/projects/{id}/releases/{tag_name}/assets/links/{link_id}` | Unmatched | Retrieve a release link |
| `GitLabRestClient.getApiV4ProjectsIdReleasesTagNameDownloadsDirectAssetPath` | `GET` | `/api/v4/projects/{id}/releases/{tag_name}/downloads/{direct_asset_path}` | Unmatched | Download a project release asset file |
| `GitLabRestClient.postApiV4ProjectsIdReleases` | `POST` | `/api/v4/projects/{id}/releases` | `E:release.crud.v1` | Create a release |
| `GitLabRestClient.postApiV4ProjectsIdReleasesTagNameAssetsLinks` | `POST` | `/api/v4/projects/{id}/releases/{tag_name}/assets/links` | Unmatched | Create a release link |
| `GitLabRestClient.postApiV4ProjectsIdReleasesTagNameEvidence` | `POST` | `/api/v4/projects/{id}/releases/{tag_name}/evidence` | Unmatched | Generate release evidence |
| `GitLabRestClient.putApiV4ProjectsIdReleasesTagName` | `PUT` | `/api/v4/projects/{id}/releases/{tag_name}` | `E:release.crud.v1` | Update a release |
| `GitLabRestClient.putApiV4ProjectsIdReleasesTagNameAssetsLinksLinkId` | `PUT` | `/api/v4/projects/{id}/releases/{tag_name}/assets/links/{link_id}` | Unmatched | Update a release link |

</details>

<details>
<summary><strong>remote_mirrors</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdRemoteMirrorsMirrorId` | `DELETE` | `/api/v4/projects/{id}/remote_mirrors/{mirror_id}` | Unmatched | Delete a remote mirror from a project |
| `GitLabRestClient.getApiV4ProjectsIdRemoteMirrors` | `GET` | `/api/v4/projects/{id}/remote_mirrors` | Unmatched | List all remote mirrors for a project |
| `GitLabRestClient.getApiV4ProjectsIdRemoteMirrorsMirrorId` | `GET` | `/api/v4/projects/{id}/remote_mirrors/{mirror_id}` | Unmatched | Retrieve a remote mirror for a project |
| `GitLabRestClient.getApiV4ProjectsIdRemoteMirrorsMirrorIdPublicKey` | `GET` | `/api/v4/projects/{id}/remote_mirrors/{mirror_id}/public_key` | Unmatched | Retrieve a public key for a remote mirror |
| `GitLabRestClient.postApiV4ProjectsIdRemoteMirrors` | `POST` | `/api/v4/projects/{id}/remote_mirrors` | Unmatched | Create a push mirror |
| `GitLabRestClient.postApiV4ProjectsIdRemoteMirrorsMirrorIdSync` | `POST` | `/api/v4/projects/{id}/remote_mirrors/{mirror_id}/sync` | Unmatched | Force push mirror update |
| `GitLabRestClient.putApiV4ProjectsIdRemoteMirrorsMirrorId` | `PUT` | `/api/v4/projects/{id}/remote_mirrors/{mirror_id}` | Unmatched | Update a remote mirror in a project |

</details>

<details>
<summary><strong>repositories</strong> (13)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdRepositoryArchive` | `GET` | `/api/v4/projects/{id}/repository/archive` | Unmatched | Retrieve file archive from a repository |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryBlobsSha` | `GET` | `/api/v4/projects/{id}/repository/blobs/{sha}` | `P:git.blob.read.v1` | Retrieve a blob from a repository |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryBlobsShaRaw` | `GET` | `/api/v4/projects/{id}/repository/blobs/{sha}/raw` | `P:git.blob.read.v1` | Retrieve raw blob content |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryChangelog` | `GET` | `/api/v4/projects/{id}/repository/changelog` | Unmatched | Generate changelog data |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryCompare` | `GET` | `/api/v4/projects/{id}/repository/compare` | `E:commit.compare.v1` | Compare branches, tags, or commits |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryContributors` | `GET` | `/api/v4/projects/{id}/repository/contributors` | Unmatched | Retrieve contributors metrics |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryDiffStats` | `GET` | `/api/v4/projects/{id}/repository/diff_stats` | Unmatched | Get diff statistics between two commits |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryDivergingCommits` | `GET` | `/api/v4/projects/{id}/repository/diverging_commits` | Unmatched | Retrieve diverging commit counts between two refs |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryHealth` | `GET` | `/api/v4/projects/{id}/repository/health` | Unmatched | Retrieve repository health statistics |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryMergeBase` | `GET` | `/api/v4/projects/{id}/repository/merge_base` | Unmatched | Retrieve a merge base |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryTree` | `GET` | `/api/v4/projects/{id}/repository/tree` | `P:content.read.v1`<br>`P:git.tree.read.v1` | List all repository trees in a project |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryBlobsBatch` | `POST` | `/api/v4/projects/{id}/repository/blobs/batch` | Unmatched | Get contents of multiple files in a single request |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryChangelog` | `POST` | `/api/v4/projects/{id}/repository/changelog` | Unmatched | Add changelog data to file |

</details>

<details>
<summary><strong>resource_events</strong> (4)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4ProjectsIdIssuesEventableIdResourceMilestoneEvents` | `GET` | `/api/v4/projects/{id}/issues/{eventable_id}/resource_milestone_events` | Unmatched | List all project issue milestone events |
| `GitLabRestClient.getApiV4ProjectsIdIssuesEventableIdResourceMilestoneEventsEventId` | `GET` | `/api/v4/projects/{id}/issues/{eventable_id}/resource_milestone_events/{event_id}` | Unmatched | Retrieve an issue milestone event |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsEventableIdResourceMilestoneEvents` | `GET` | `/api/v4/projects/{id}/merge_requests/{eventable_id}/resource_milestone_events` | Unmatched | List all project merge request milestone events |
| `GitLabRestClient.getApiV4ProjectsIdMergeRequestsEventableIdResourceMilestoneEventsEventId` | `GET` | `/api/v4/projects/{id}/merge_requests/{eventable_id}/resource_milestone_events/{event_id}` | Unmatched | Retrieve a merge request milestone event |

</details>

<details>
<summary><strong>runners</strong> (8)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4RunnersId` | `DELETE` | `/api/v4/runners/{id}` | Unmatched | Delete a runner |
| `GitLabRestClient.getApiV4Runners` | `GET` | `/api/v4/runners` | Unmatched | List available runners |
| `GitLabRestClient.getApiV4RunnersAll` | `GET` | `/api/v4/runners/all` | `P:ci.runners.v1` | List all runners |
| `GitLabRestClient.getApiV4RunnersId` | `GET` | `/api/v4/runners/{id}` | `P:ci.runners.v1` | Retrieve details on a runner |
| `GitLabRestClient.getApiV4RunnersIdManagers` | `GET` | `/api/v4/runners/{id}/managers` | Unmatched | List all managers for a runner |
| `GitLabRestClient.postApiV4RunnersIdResetAuthenticationToken` | `POST` | `/api/v4/runners/{id}/reset_authentication_token` | Unmatched | Reset runner's authentication token |
| `GitLabRestClient.postApiV4UserRunners` | `POST` | `/api/v4/user/runners` | Unmatched | Create a runner owned by currently authenticated user |
| `GitLabRestClient.putApiV4RunnersId` | `PUT` | `/api/v4/runners/{id}` | Unmatched | Update details of a runner |

</details>

<details>
<summary><strong>search</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4GroupsIdSearch` | `GET` | `/api/v4/groups/{id}/-/search` | `P:search.code.v1` | Search on GitLab within a group |
| `GitLabRestClient.getApiV4Search` | `GET` | `/api/v4/search` | `P:search.code.v1`<br>`P:user.search.v1` | Search an instance |

</details>

<details>
<summary><strong>secure_files</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdSecureFilesSecureFileId` | `DELETE` | `/api/v4/projects/{id}/secure_files/{secure_file_id}` | Unmatched | Delete a secure file |
| `GitLabRestClient.getApiV4ProjectsIdSecureFiles` | `GET` | `/api/v4/projects/{id}/secure_files` | Unmatched | List all secure files for a project |
| `GitLabRestClient.getApiV4ProjectsIdSecureFilesSecureFileId` | `GET` | `/api/v4/projects/{id}/secure_files/{secure_file_id}` | Unmatched | Retrieve details of a secure file |
| `GitLabRestClient.getApiV4ProjectsIdSecureFilesSecureFileIdDownload` | `GET` | `/api/v4/projects/{id}/secure_files/{secure_file_id}/download` | Unmatched | Download a secure file |
| `GitLabRestClient.postApiV4ProjectsIdSecureFiles` | `POST` | `/api/v4/projects/{id}/secure_files` | Unmatched | Create a secure file |

</details>

<details>
<summary><strong>snippets</strong> (18)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdSnippetsSnippetId` | `DELETE` | `/api/v4/projects/{id}/snippets/{snippet_id}` | Unmatched | Delete a project snippet |
| `GitLabRestClient.deleteApiV4SnippetsId` | `DELETE` | `/api/v4/snippets/{id}` | `P:snippet.crud.v1` | Delete snippet |
| `GitLabRestClient.getApiV4ProjectsIdSnippets` | `GET` | `/api/v4/projects/{id}/snippets` | `P:snippet.crud.v1` | List all snippets for a project |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetId` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}` | Unmatched | Retrieve a project snippet |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetIdFilesRefFilePathRaw` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}/files/{ref}/{file_path}/raw` | Unmatched | Retrieve snippet repository file content |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetIdRaw` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}/raw` | Unmatched | Retrieve a raw project snippet |
| `GitLabRestClient.getApiV4ProjectsIdSnippetsSnippetIdUserAgentDetail` | `GET` | `/api/v4/projects/{id}/snippets/{snippet_id}/user_agent_detail` | Unmatched | Retrieve user agent details for a project snippet |
| `GitLabRestClient.getApiV4Snippets` | `GET` | `/api/v4/snippets` | `P:snippet.crud.v1` | List all snippets for current user |
| `GitLabRestClient.getApiV4SnippetsAll` | `GET` | `/api/v4/snippets/all` | Unmatched | List all snippets |
| `GitLabRestClient.getApiV4SnippetsId` | `GET` | `/api/v4/snippets/{id}` | `P:snippet.crud.v1` | Retrieve a snippet |
| `GitLabRestClient.getApiV4SnippetsIdFilesRefFilePathRaw` | `GET` | `/api/v4/snippets/{id}/files/{ref}/{file_path}/raw` | Unmatched | Retrieve snippet file content |
| `GitLabRestClient.getApiV4SnippetsIdRaw` | `GET` | `/api/v4/snippets/{id}/raw` | Unmatched | Retrieve a raw snippet |
| `GitLabRestClient.getApiV4SnippetsIdUserAgentDetail` | `GET` | `/api/v4/snippets/{id}/user_agent_detail` | Unmatched | Retrieve user agent details for a snippet |
| `GitLabRestClient.getApiV4SnippetsPublic` | `GET` | `/api/v4/snippets/public` | Unmatched | List all public snippets |
| `GitLabRestClient.postApiV4ProjectsIdSnippets` | `POST` | `/api/v4/projects/{id}/snippets` | `P:snippet.crud.v1` | Create a project snippet |
| `GitLabRestClient.postApiV4Snippets` | `POST` | `/api/v4/snippets` | `P:snippet.crud.v1` | Create a snippet |
| `GitLabRestClient.putApiV4ProjectsIdSnippetsSnippetId` | `PUT` | `/api/v4/projects/{id}/snippets/{snippet_id}` | Unmatched | Update a project snippet |
| `GitLabRestClient.putApiV4SnippetsId` | `PUT` | `/api/v4/snippets/{id}` | `P:snippet.crud.v1` | Update snippet |

</details>

<details>
<summary><strong>submodules</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.putApiV4ProjectsIdRepositorySubmodulesSubmodule` | `PUT` | `/api/v4/projects/{id}/repository/submodules/{submodule}` | Unmatched | Update a submodule reference |

</details>

<details>
<summary><strong>suggestions</strong> (2)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.putApiV4SuggestionsBatchApply` | `PUT` | `/api/v4/suggestions/batch_apply` | Unmatched | Apply multiple suggestions to a merge request |
| `GitLabRestClient.putApiV4SuggestionsIdApply` | `PUT` | `/api/v4/suggestions/{id}/apply` | Unmatched | Apply a suggestion to a merge request |

</details>

<details>
<summary><strong>tags</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdRepositoryTagsTagName` | `DELETE` | `/api/v4/projects/{id}/repository/tags/{tag_name}` | `E:tag.create-delete.v1` | Delete a tag |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryTags` | `GET` | `/api/v4/projects/{id}/repository/tags` | `E:tag.list-get.v1` | List all project repository tags |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryTagsTagName` | `GET` | `/api/v4/projects/{id}/repository/tags/{tag_name}` | `E:tag.list-get.v1` | Retrieve a single repository tag |
| `GitLabRestClient.getApiV4ProjectsIdRepositoryTagsTagNameSignature` | `GET` | `/api/v4/projects/{id}/repository/tags/{tag_name}/signature` | Unmatched | Retrieve X.509 signature of a tag |
| `GitLabRestClient.postApiV4ProjectsIdRepositoryTags` | `POST` | `/api/v4/projects/{id}/repository/tags` | `E:tag.create-delete.v1` | Create a tag |

</details>

<details>
<summary><strong>terraform</strong> (18)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4ProjectsIdTerraformStateName` | `DELETE` | `/api/v4/projects/{id}/terraform/state/{name}` | Unmatched | Delete a Terraform state |
| `GitLabRestClient.deleteApiV4ProjectsIdTerraformStateNameLock` | `DELETE` | `/api/v4/projects/{id}/terraform/state/{name}/lock` | Unmatched | Unlock a Terraform state |
| `GitLabRestClient.deleteApiV4ProjectsIdTerraformStateNameVersionsSerial` | `DELETE` | `/api/v4/projects/{id}/terraform/state/{name}/versions/{serial}` | Unmatched | Delete a Terraform state version |
| `GitLabRestClient.getApiV4PackagesTerraformModulesV1ModuleNamespaceModuleNameModuleSystem` | `GET` | `/api/v4/packages/terraform/modules/v1/{module_namespace}/{module_name}/{module_system}` | Unmatched | Retrieve latest version for a module |
| `GitLabRestClient.getApiV4PackagesTerraformModulesV1ModuleNamespaceModuleNameModuleSystemDownload` | `GET` | `/api/v4/packages/terraform/modules/v1/{module_namespace}/{module_name}/{module_system}/download` | Unmatched | Retrieve download URL for latest module version |
| `GitLabRestClient.getApiV4PackagesTerraformModulesV1ModuleNamespaceModuleNameModuleSystemModuleVersion` | `GET` | `/api/v4/packages/terraform/modules/v1/{module_namespace}/{module_name}/{module_system}/{module_version}` | Unmatched | Get details about specific version of a module |
| `GitLabRestClient.getApiV4PackagesTerraformModulesV1ModuleNamespaceModuleNameModuleSystemModuleVersionDownload` | `GET` | `/api/v4/packages/terraform/modules/v1/{module_namespace}/{module_name}/{module_system}/{module_version}/download` | Unmatched | Get download location for specific version of a module |
| `GitLabRestClient.getApiV4PackagesTerraformModulesV1ModuleNamespaceModuleNameModuleSystemModuleVersionFile` | `GET` | `/api/v4/packages/terraform/modules/v1/{module_namespace}/{module_name}/{module_system}/{module_version}/file` | Unmatched | Download specific version of a module |
| `GitLabRestClient.getApiV4PackagesTerraformModulesV1ModuleNamespaceModuleNameModuleSystemVersions` | `GET` | `/api/v4/packages/terraform/modules/v1/{module_namespace}/{module_name}/{module_system}/versions` | Unmatched | List all available versions for a module |
| `GitLabRestClient.getApiV4ProjectsIdPackagesTerraformModulesModuleNameModuleSystem` | `GET` | `/api/v4/projects/{id}/packages/terraform/modules/{module_name}/{module_system}` | Unmatched | Download the latest version of a module |
| `GitLabRestClient.getApiV4ProjectsIdPackagesTerraformModulesModuleNameModuleSystemModuleVersion` | `GET` | `/api/v4/projects/{id}/packages/terraform/modules/{module_name}/{module_system}/{module_version}` | Unmatched | Download a specific version of a module |
| `GitLabRestClient.getApiV4ProjectsIdTerraformStateName` | `GET` | `/api/v4/projects/{id}/terraform/state/{name}` | `U:gitlab.terraform-kubernetes` | Retrieve a Terraform state |
| `GitLabRestClient.getApiV4ProjectsIdTerraformStateNameVersionsSerial` | `GET` | `/api/v4/projects/{id}/terraform/state/{name}/versions/{serial}` | Unmatched | Retrieve a Terraform state version |
| `GitLabRestClient.postApiV4ProjectsIdTerraformStateName` | `POST` | `/api/v4/projects/{id}/terraform/state/{name}` | Unmatched | Create or update a Terraform state |
| `GitLabRestClient.postApiV4ProjectsIdTerraformStateNameAuthorize` | `POST` | `/api/v4/projects/{id}/terraform/state/{name}/authorize` | Unmatched | Authorize Terraform state upload |
| `GitLabRestClient.postApiV4ProjectsIdTerraformStateNameLock` | `POST` | `/api/v4/projects/{id}/terraform/state/{name}/lock` | `U:gitlab.terraform-kubernetes` | Lock a Terraform state |
| `GitLabRestClient.putApiV4ProjectsIdPackagesTerraformModulesModuleNameModuleSystemModuleVersionFile` | `PUT` | `/api/v4/projects/{id}/packages/terraform/modules/{module_name}/{module_system}/{module_version}/file` | Unmatched | Upload Terraform Module package file |
| `GitLabRestClient.putApiV4ProjectsIdPackagesTerraformModulesModuleNameModuleSystemModuleVersionFileAuthorize` | `PUT` | `/api/v4/projects/{id}/packages/terraform/modules/{module_name}/{module_system}/{module_version}/file/authorize` | Unmatched | Workhorse authorize Terraform Module package file |

</details>

<details>
<summary><strong>unleash</strong> (5)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4FeatureFlagsUnleashProjectId` | `GET` | `/api/v4/feature_flags/unleash/{project_id}` | Unmatched | Get Unleash features |
| `GitLabRestClient.getApiV4FeatureFlagsUnleashProjectIdClientFeatures` | `GET` | `/api/v4/feature_flags/unleash/{project_id}/client/features` | `U:gitlab.feature-flags` | Get a list of features |
| `GitLabRestClient.getApiV4FeatureFlagsUnleashProjectIdFeatures` | `GET` | `/api/v4/feature_flags/unleash/{project_id}/features` | Unmatched | [Deprecated] Get a list of features (v2 client support) |
| `GitLabRestClient.postApiV4FeatureFlagsUnleashProjectIdClientMetrics` | `POST` | `/api/v4/feature_flags/unleash/{project_id}/client/metrics` | Unmatched | Report Unleash client metrics |
| `GitLabRestClient.postApiV4FeatureFlagsUnleashProjectIdClientRegister` | `POST` | `/api/v4/feature_flags/unleash/{project_id}/client/register` | Unmatched | Register Unleash client |

</details>

<details>
<summary><strong>usage_data</strong> (7)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4UsageDataNonSqlMetrics` | `GET` | `/api/v4/usage_data/non_sql_metrics` | Unmatched | List all non-SQL metrics |
| `GitLabRestClient.getApiV4UsageDataQueries` | `GET` | `/api/v4/usage_data/queries` | Unmatched | List all Service Ping SQL queries |
| `GitLabRestClient.getApiV4UsageDataServicePing` | `GET` | `/api/v4/usage_data/service_ping` | Unmatched | Retrieve Service Ping payload |
| `GitLabRestClient.postApiV4UsageDataIncrementCounter` | `POST` | `/api/v4/usage_data/increment_counter` | Unmatched | Track usage data event |
| `GitLabRestClient.postApiV4UsageDataIncrementUniqueUsers` | `POST` | `/api/v4/usage_data/increment_unique_users` | Unmatched | Track usage data event for the current user |
| `GitLabRestClient.postApiV4UsageDataTrackEvent` | `POST` | `/api/v4/usage_data/track_event` | Unmatched | Track an internal GitLab event |
| `GitLabRestClient.postApiV4UsageDataTrackEvents` | `POST` | `/api/v4/usage_data/track_events` | Unmatched | Track multiple internal GitLab events |

</details>

<details>
<summary><strong>users</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4UserCounts` | `GET` | `/api/v4/user_counts` | Unmatched | Return the user specific counts |

</details>

<details>
<summary><strong>web_commits</strong> (1)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.getApiV4WebCommitsPublicKey` | `GET` | `/api/v4/web_commits/public_key` | Unmatched | Retrieve the public signing key |

</details>

<details>
<summary><strong>wikis</strong> (12)</summary>

| Method | HTTP | Route | Classification | Description |
|---|---|---|---|---|
| `GitLabRestClient.deleteApiV4GroupsIdWikisSlug` | `DELETE` | `/api/v4/groups/{id}/wikis/{slug}` | Unmatched | Delete a wiki page for a group |
| `GitLabRestClient.deleteApiV4ProjectsIdWikisSlug` | `DELETE` | `/api/v4/projects/{id}/wikis/{slug}` | `E:wiki.crud.v1` | Delete a wiki page for a project |
| `GitLabRestClient.getApiV4GroupsIdWikis` | `GET` | `/api/v4/groups/{id}/wikis` | Unmatched | List all wiki pages for a group |
| `GitLabRestClient.getApiV4GroupsIdWikisSlug` | `GET` | `/api/v4/groups/{id}/wikis/{slug}` | Unmatched | Retrieve a wiki page for a group |
| `GitLabRestClient.getApiV4ProjectsIdWikis` | `GET` | `/api/v4/projects/{id}/wikis` | `E:wiki.crud.v1` | List all wiki pages for a project |
| `GitLabRestClient.getApiV4ProjectsIdWikisSlug` | `GET` | `/api/v4/projects/{id}/wikis/{slug}` | `E:wiki.crud.v1` | Retrieve a wiki page for a project |
| `GitLabRestClient.postApiV4GroupsIdWikis` | `POST` | `/api/v4/groups/{id}/wikis` | Unmatched | Create a wiki page for a group |
| `GitLabRestClient.postApiV4GroupsIdWikisAttachments` | `POST` | `/api/v4/groups/{id}/wikis/attachments` | Unmatched | Upload an attachment to a group wiki |
| `GitLabRestClient.postApiV4ProjectsIdWikis` | `POST` | `/api/v4/projects/{id}/wikis` | `E:wiki.crud.v1` | Create a wiki page for a project |
| `GitLabRestClient.postApiV4ProjectsIdWikisAttachments` | `POST` | `/api/v4/projects/{id}/wikis/attachments` | Unmatched | Upload an attachment to a project wiki |
| `GitLabRestClient.putApiV4GroupsIdWikisSlug` | `PUT` | `/api/v4/groups/{id}/wikis/{slug}` | Unmatched | Update a wiki page for a group |
| `GitLabRestClient.putApiV4ProjectsIdWikisSlug` | `PUT` | `/api/v4/projects/{id}/wikis/{slug}` | `E:wiki.crud.v1` | Update a wiki page for a project |

</details>

## Mapping Rules

- Exact public generated method names are pinned by reviewed rules.
- Similar names, tags, paths, or schemas never establish equivalence automatically.
- `project`, `repository`, `workspace`, `organization`, and `group` aliases are applied only inside a reviewed capability.
- Partial mappings always explain the material difference.
- New or changed upstream methods automatically remain unmatched until reviewed.
- The document contains no generation timestamp, and all ordering is ordinal for deterministic output.

