export const providerIds = [
  "azure-devops",
  "bitbucket",
  "codeberg",
  "gitea",
  "github",
  "gitlab",
] as const;

export type ProviderId = (typeof providerIds)[number];
export type CapabilityRelation = "E" | "P";

export type CapabilityMember = {
  relation: CapabilityRelation;
  methods: readonly string[];
  note?: string;
};

export type Capability = {
  id: string;
  domain: string;
  title: string;
  contract: string;
  mapping: string;
  members: Partial<Record<ProviderId, CapabilityMember>>;
};

export type UniqueSurface = {
  id: string;
  provider: ProviderId;
  title: string;
  methods: readonly string[];
  description: string;
  nearest?: string;
};

export type RejectedMapping = {
  title: string;
  methods: Partial<Record<ProviderId, readonly string[]>>;
  reason: string;
};

const equivalent = (methods: readonly string[], note?: string): CapabilityMember => ({
  relation: "E",
  methods,
  note,
});

const partial = (methods: readonly string[], note: string): CapabilityMember => ({
  relation: "P",
  methods,
  note,
});

export const capabilities: readonly Capability[] = [
  {
    id: "repository.list.v1",
    domain: "Repositories",
    title: "List repositories",
    contract: "List repository-bearing resources visible in a selected owner or namespace scope.",
    mapping:
      "Scope selectors differ: Azure project, Bitbucket workspace, GitLab group/project, and user or organization elsewhere.",
    members: {
      "azure-devops": equivalent(["repositoriesList"]),
      bitbucket: equivalent(["getRepositories", "getRepositoriesWorkspace"]),
      codeberg: equivalent(["userCurrentListRepos", "userListRepos", "orgListRepos"]),
      gitea: equivalent(["userCurrentListRepos", "userListRepos", "orgListRepos"]),
      github: equivalent(["reposListForAuthenticatedUser", "reposListForOrg", "reposListForUser"]),
      gitlab: equivalent([
        "getApiV4Projects",
        "getApiV4GroupsIdProjects",
        "getApiV4UsersUserIdProjects",
      ]),
    },
  },
  {
    id: "repository.get.v1",
    domain: "Repositories",
    title: "Get repository metadata",
    contract:
      "Read one repository-bearing resource by stable provider identifier or owner/name pair.",
    mapping:
      "GitLab calls the repository-bearing unit a project; Azure requires organization and project context.",
    members: {
      "azure-devops": equivalent(["repositoriesGetRepository"]),
      bitbucket: equivalent(["getRepositoriesWorkspaceRepoSlug"]),
      codeberg: equivalent(["repoGet", "repoGetById"]),
      gitea: equivalent(["repoGet", "repoGetById"]),
      github: equivalent(["reposGet"]),
      gitlab: equivalent(["getApiV4ProjectsId"]),
    },
  },
  {
    id: "repository.create.v1",
    domain: "Repositories",
    title: "Create repository",
    contract: "Create a repository in a selected user or namespace scope.",
    mapping:
      "Owner and namespace models differ; Bitbucket PUT can also replace repository settings.",
    members: {
      "azure-devops": equivalent(["repositoriesCreate"]),
      bitbucket: partial(
        ["postRepositoriesWorkspaceRepoSlug", "putRepositoriesWorkspaceRepoSlug"],
        "Workspace-scoped create routes have different PUT/POST semantics.",
      ),
      codeberg: equivalent(["createCurrentUserRepo", "createOrgRepo"]),
      gitea: equivalent(["createCurrentUserRepo", "createOrgRepo"]),
      github: equivalent(["reposCreateForAuthenticatedUser", "reposCreateInOrg"]),
      gitlab: equivalent(["postApiV4Projects", "postApiV4ProjectsUserUserId"]),
    },
  },
  {
    id: "repository.update.v1",
    domain: "Repositories",
    title: "Update repository metadata",
    contract: "Change mutable repository metadata and settings without modifying Git objects.",
    mapping:
      "Writable fields vary substantially, so only the transport-level effect is equivalent.",
    members: {
      "azure-devops": partial(
        ["repositoriesUpdate"],
        "The Git spec documents a narrow subset of repository fields.",
      ),
      bitbucket: equivalent(["putRepositoriesWorkspaceRepoSlug"]),
      codeberg: equivalent(["repoEdit"]),
      gitea: equivalent(["repoEdit"]),
      github: equivalent(["reposUpdate"]),
      gitlab: equivalent(["putApiV4ProjectsId"]),
    },
  },
  {
    id: "repository.delete.v1",
    domain: "Repositories",
    title: "Delete repository",
    contract: "Remove a repository-bearing resource from its active namespace.",
    mapping:
      "Azure initially moves a repository to a recycle bin; other providers expose direct deletion with provider-specific retention policy.",
    members: {
      "azure-devops": partial(
        ["repositoriesDelete", "repositoriesDeleteRepositoryFromRecycleBin"],
        "Soft deletion and permanent deletion are separate operations.",
      ),
      bitbucket: equivalent(["deleteRepositoriesWorkspaceRepoSlug"]),
      codeberg: equivalent(["repoDelete"]),
      gitea: equivalent(["repoDelete"]),
      github: equivalent(["reposDelete"]),
      gitlab: partial(
        ["deleteApiV4ProjectsId"],
        "Delayed deletion policy can defer physical removal.",
      ),
    },
  },
  {
    id: "repository.archive.v1",
    domain: "Repositories",
    title: "Archive or unarchive repository",
    contract: "Transition a repository between active and archived states without deleting it.",
    mapping: "Only Codeberg, Gitea, GitHub, and GitLab expose an accepted generated mapping.",
    members: {
      codeberg: partial(["repoEdit"], "Archive is a field on generic repository update."),
      gitea: partial(["repoEdit"], "Archive is a field on generic repository update."),
      github: partial(["reposUpdate"], "Archive is a field on generic repository update."),
      gitlab: equivalent(["postApiV4ProjectsIdArchive", "postApiV4ProjectsIdUnarchive"]),
    },
  },
  {
    id: "repository.fork.create.v1",
    domain: "Repositories",
    title: "Create repository fork",
    contract: "Create a repository whose initial lineage points to an existing repository.",
    mapping:
      "Azure models a fork through repository creation; destination namespace and asynchronous behavior differ.",
    members: {
      "azure-devops": partial(
        ["repositoriesCreate"],
        "Forking is selected through parentRepository/sourceRef fields.",
      ),
      bitbucket: equivalent(["postRepositoriesWorkspaceRepoSlugForks"]),
      codeberg: equivalent(["createFork"]),
      gitea: equivalent(["createFork"]),
      github: equivalent(["reposCreateFork"]),
      gitlab: equivalent(["postApiV4ProjectsIdFork"]),
    },
  },
  {
    id: "repository.fork.list.v1",
    domain: "Repositories",
    title: "List repository forks",
    contract: "List repositories whose recorded parent is the selected repository.",
    mapping: "Pagination and lineage fields differ but the read effect maps directly.",
    members: {
      "azure-devops": equivalent(["forksList"]),
      bitbucket: equivalent(["getRepositoriesWorkspaceRepoSlugForks"]),
      codeberg: equivalent(["listForks"]),
      gitea: equivalent(["listForks"]),
      github: equivalent(["reposListForks"]),
      gitlab: equivalent(["getApiV4ProjectsIdForks"]),
    },
  },
  {
    id: "branch.list.v1",
    domain: "Branches and tags",
    title: "List branches",
    contract: "List branch refs and their current tips for a repository.",
    mapping:
      "Azure uses the generic ref list and requires a heads filter; other providers expose branch resources.",
    members: {
      "azure-devops": partial(
        ["refsList"],
        "Caller must filter refs/heads and receives generic refs.",
      ),
      bitbucket: equivalent(["getRepositoriesWorkspaceRepoSlugRefsBranches"]),
      codeberg: equivalent(["repoListBranches"]),
      gitea: equivalent(["repoListBranches"]),
      github: equivalent(["reposListBranches"]),
      gitlab: equivalent(["getApiV4ProjectsIdRepositoryBranches"]),
    },
  },
  {
    id: "branch.get.v1",
    domain: "Branches and tags",
    title: "Get branch",
    contract: "Read one named branch and its tip.",
    mapping:
      "Azure resolves this through generic refs or branch statistics rather than a dedicated branch object.",
    members: {
      "azure-devops": partial(
        ["refsList", "statsGet"],
        "Requires an exact ref filter or returns statistics rather than a common branch model.",
      ),
      bitbucket: equivalent(["getRepositoriesWorkspaceRepoSlugRefsBranchesName"]),
      codeberg: equivalent(["repoGetBranch"]),
      gitea: equivalent(["repoGetBranch"]),
      github: equivalent(["reposGetBranch"]),
      gitlab: equivalent(["getApiV4ProjectsIdRepositoryBranchesBranch"]),
    },
  },
  {
    id: "branch.create.v1",
    domain: "Branches and tags",
    title: "Create branch",
    contract: "Create one branch ref at a selected commit.",
    mapping: "Azure and GitHub use generic ref mutation; Bitbucket's generated body is incomplete.",
    members: {
      "azure-devops": partial(
        ["refsUpdateRefs"],
        "Batch generic ref mutation rather than dedicated branch creation.",
      ),
      bitbucket: partial(
        ["postRepositoriesWorkspaceRepoSlugRefsBranches"],
        "Normalized specification omits the required branch body.",
      ),
      codeberg: equivalent(["repoCreateBranch"]),
      gitea: equivalent(["repoCreateBranch"]),
      github: partial(["gitCreateRef"], "Caller must construct refs/heads/name explicitly."),
      gitlab: equivalent(["postApiV4ProjectsIdRepositoryBranches"]),
    },
  },
  {
    id: "branch.delete.v1",
    domain: "Branches and tags",
    title: "Delete branch",
    contract: "Delete one branch ref without deleting the repository.",
    mapping:
      "Azure and GitHub expose generic ref deletion; protected/default branch rules remain provider-specific.",
    members: {
      "azure-devops": partial(
        ["refsUpdateRefs"],
        "Deletion is encoded as a zero object ID in a batch mutation.",
      ),
      bitbucket: equivalent(["deleteRepositoriesWorkspaceRepoSlugRefsBranchesName"]),
      codeberg: equivalent(["repoDeleteBranch"]),
      gitea: equivalent(["repoDeleteBranch"]),
      github: partial(["gitDeleteRef"], "Caller must address refs/heads/name explicitly."),
      gitlab: equivalent(["deleteApiV4ProjectsIdRepositoryBranchesBranch"]),
    },
  },
  {
    id: "branch.protection.read.v1",
    domain: "Branches and tags",
    title: "Read branch protection",
    contract: "Read effective branch protection or policy configuration.",
    mapping:
      "Policy models are not interchangeable: Azure policies, Bitbucket restrictions, GitHub protections/rulesets, and protected branches elsewhere.",
    members: {
      "azure-devops": partial(
        ["policyConfigurationsGet"],
        "Read-only inherited policy evaluation.",
      ),
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugBranchRestrictions",
        "getRepositoriesWorkspaceRepoSlugBranchRestrictionsId",
      ], "Returns individual restriction rules."),
      codeberg: equivalent(["repoListBranchProtection", "repoGetBranchProtection"]),
      gitea: equivalent(["repoListBranchProtection", "repoGetBranchProtection"]),
      github: partial(
        ["reposGetBranchProtection", "reposGetRepoRulesets", "reposGetRepoRuleset"],
        "Classic protection and rulesets are separate models.",
      ),
      gitlab: partial([
        "getApiV4ProjectsIdProtectedBranches",
        "getApiV4ProjectsIdProtectedBranchesName",
      ], "Protected patterns and access levels differ from rule objects."),
    },
  },
  {
    id: "branch.protection.write.v1",
    domain: "Branches and tags",
    title: "Write branch protection",
    contract: "Create, update, or remove branch protection policy.",
    mapping:
      "No accepted Azure mapping exists in the Git-only snapshot; every other provider has a materially different rule model.",
    members: {
      bitbucket: partial([
        "postRepositoriesWorkspaceRepoSlugBranchRestrictions",
        "putRepositoriesWorkspaceRepoSlugBranchRestrictionsId",
        "deleteRepositoriesWorkspaceRepoSlugBranchRestrictionsId",
      ], "Mutates individual restriction rules."),
      codeberg: equivalent([
        "repoCreateBranchProtection",
        "repoEditBranchProtection",
        "repoDeleteBranchProtection",
      ]),
      gitea: equivalent([
        "repoCreateBranchProtection",
        "repoEditBranchProtection",
        "repoDeleteBranchProtection",
      ]),
      github: partial([
        "reposUpdateBranchProtection",
        "reposDeleteBranchProtection",
        "reposCreateRepoRuleset",
        "reposUpdateRepoRuleset",
        "reposDeleteRepoRuleset",
      ], "Two protection systems with different scope and expressiveness."),
      gitlab: partial([
        "postApiV4ProjectsIdProtectedBranches",
        "patchApiV4ProjectsIdProtectedBranchesName",
        "deleteApiV4ProjectsIdProtectedBranchesName",
      ], "Pattern and access-level model."),
    },
  },
  {
    id: "tag.list-get.v1",
    domain: "Branches and tags",
    title: "List or get tags",
    contract: "Read tag refs and associated commit or tag-object metadata.",
    mapping: "Azure and GitHub generic refs do not return the same high-level tag representation.",
    members: {
      "azure-devops": partial(
        ["refsList", "annotatedTagsGet"],
        "Lightweight refs and annotated tag objects are separate reads.",
      ),
      bitbucket: equivalent([
        "getRepositoriesWorkspaceRepoSlugRefsTags",
        "getRepositoriesWorkspaceRepoSlugRefsTagsName",
      ]),
      codeberg: equivalent(["repoListTags", "repoGetTag"]),
      gitea: equivalent(["repoListTags", "repoGetTag"]),
      github: partial(
        ["reposListTags", "gitGetRef", "gitGetTag"],
        "High-level list, ref lookup, and annotated object lookup are separate.",
      ),
      gitlab: equivalent([
        "getApiV4ProjectsIdRepositoryTags",
        "getApiV4ProjectsIdRepositoryTagsTagName",
      ]),
    },
  },
  {
    id: "tag.create-delete.v1",
    domain: "Branches and tags",
    title: "Create or delete tag",
    contract: "Create or delete a named lightweight or annotated tag.",
    mapping:
      "GitHub and Azure separate generic refs from annotated objects; Bitbucket always creates an annotated tag.",
    members: {
      "azure-devops": partial(
        ["refsUpdateRefs", "annotatedTagsCreate"],
        "Tag ref and annotated tag object use different operations.",
      ),
      bitbucket: partial([
        "postRepositoriesWorkspaceRepoSlugRefsTags",
        "deleteRepositoriesWorkspaceRepoSlugRefsTagsName",
      ], "Create always produces an annotated tag."),
      codeberg: equivalent(["repoCreateTag", "repoDeleteTag"]),
      gitea: equivalent(["repoCreateTag", "repoDeleteTag"]),
      github: partial(
        ["gitCreateTag", "gitCreateRef", "gitDeleteRef"],
        "Annotated tags require object creation followed by ref creation.",
      ),
      gitlab: equivalent([
        "postApiV4ProjectsIdRepositoryTags",
        "deleteApiV4ProjectsIdRepositoryTagsTagName",
      ]),
    },
  },
  {
    id: "commit.list.v1",
    domain: "Commits and Git data",
    title: "List commits",
    contract:
      "List commits reachable from a repository ref, optionally filtered by path or author.",
    mapping: "Filter vocabularies and pagination differ but the core read maps directly.",
    members: {
      "azure-devops": equivalent(["commitsGetCommits", "commitsGetCommitsBatch"]),
      bitbucket: equivalent([
        "getRepositoriesWorkspaceRepoSlugCommits",
        "getRepositoriesWorkspaceRepoSlugCommitsRevision",
      ]),
      codeberg: equivalent(["repoGetAllCommits"]),
      gitea: equivalent(["repoGetAllCommits"]),
      github: equivalent(["reposListCommits"]),
      gitlab: equivalent(["getApiV4ProjectsIdRepositoryCommits"]),
    },
  },
  {
    id: "commit.get.v1",
    domain: "Commits and Git data",
    title: "Get commit",
    contract: "Read one commit and provider-level metadata by commit identifier.",
    mapping: "GitHub also exposes a lower-level Git commit object operation.",
    members: {
      "azure-devops": equivalent(["commitsGet"]),
      bitbucket: equivalent(["getRepositoriesWorkspaceRepoSlugCommitCommit"]),
      codeberg: equivalent(["repoGetSingleCommit"]),
      gitea: equivalent(["repoGetSingleCommit"]),
      github: equivalent(["reposGetCommit", "gitGetCommit"]),
      gitlab: equivalent(["getApiV4ProjectsIdRepositoryCommitsSha"]),
    },
  },
  {
    id: "commit.compare.v1",
    domain: "Commits and Git data",
    title: "Compare commits",
    contract: "Compare two commits or refs and return commit/file differences.",
    mapping: "Operand order, merge-base behavior, raw media, and structured diff fidelity differ.",
    members: {
      "azure-devops": equivalent(["diffsGet"]),
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugDiffSpec",
        "getRepositoriesWorkspaceRepoSlugDiffstatSpec",
      ], "Raw diff and diffstat are split; topic mode changes merge-base behavior."),
      codeberg: equivalent(["repoCompareDiff"]),
      gitea: equivalent(["repoCompareDiff"]),
      github: equivalent(["reposCompareCommits"]),
      gitlab: equivalent(["getApiV4ProjectsIdRepositoryCompare"]),
    },
  },
  {
    id: "git.ref.read.v1",
    domain: "Commits and Git data",
    title: "Read generic Git refs",
    contract: "List or retrieve refs without restricting them to branches or tags.",
    mapping: "GitLab has no generic ref operation in this snapshot.",
    members: {
      "azure-devops": equivalent(["refsList"]),
      bitbucket: equivalent(["getRepositoriesWorkspaceRepoSlugRefs"]),
      codeberg: equivalent(["repoListAllGitRefs", "repoListGitRefs"]),
      gitea: equivalent(["repoListAllGitRefs", "repoListGitRefs"]),
      github: equivalent(["gitGetRef", "gitListMatchingRefs"]),
    },
  },
  {
    id: "git.tree.read.v1",
    domain: "Commits and Git data",
    title: "Read Git tree",
    contract: "Read a tree or tree-like repository listing at a selected revision.",
    mapping: "Bitbucket and GitLab expose path listings rather than raw Git tree objects.",
    members: {
      "azure-devops": equivalent(["treesGet"]),
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugSrc",
        "getRepositoriesWorkspaceRepoSlugSrcCommitPath",
      ], "Source listing is path-oriented, not a raw tree object."),
      codeberg: equivalent(["getTree"]),
      gitea: equivalent(["getTree"]),
      github: equivalent(["gitGetTree"]),
      gitlab: partial(
        ["getApiV4ProjectsIdRepositoryTree"],
        "ls-tree-style path/ref listing rather than raw tree object.",
      ),
    },
  },
  {
    id: "git.blob.read.v1",
    domain: "Commits and Git data",
    title: "Read Git blob",
    contract: "Read blob content or metadata by object ID.",
    mapping:
      "Bitbucket has no accepted blob-by-object-ID mapping; several normalized response schemas omit binary bodies.",
    members: {
      "azure-devops": equivalent(["blobsGetBlob"]),
      codeberg: equivalent(["getBlob"]),
      gitea: equivalent(["getBlob"]),
      github: equivalent(["gitGetBlob"]),
      gitlab: partial([
        "getApiV4ProjectsIdRepositoryBlobsSha",
        "getApiV4ProjectsIdRepositoryBlobsShaRaw",
      ], "Success body schemas are incomplete in the normalized source."),
    },
  },
  {
    id: "content.read.v1",
    domain: "Commits and Git data",
    title: "Read repository content",
    contract: "List a directory or read file metadata/content by repository path and revision.",
    mapping:
      "Raw and metadata representations differ; some normalized sources omit binary response variants.",
    members: {
      "azure-devops": equivalent(["itemsGet", "itemsList", "itemsGetItemsBatch"]),
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugSrc",
        "getRepositoriesWorkspaceRepoSlugSrcCommitPath",
      ], "File and directory responses share an incompletely typed route."),
      codeberg: equivalent(["repoGetContents", "repoGetContentsList", "repoGetRawFile"]),
      gitea: equivalent([
        "repoGetContents",
        "repoGetContentsList",
        "repoGetRawFile",
        "repoGetContentsExt",
      ]),
      github: partial(
        ["reposGetContent"],
        "Raw media is documented but not represented completely in the generated response union.",
      ),
      gitlab: partial([
        "getApiV4ProjectsIdRepositoryTree",
        "getApiV4ProjectsIdRepositoryFilesFilePath",
        "getApiV4ProjectsIdRepositoryFilesFilePathRaw",
      ], "Raw binary media is mislabeled or incomplete in the normalized source."),
    },
  },
  {
    id: "content.write.v1",
    domain: "Commits and Git data",
    title: "Commit file changes",
    contract:
      "Create a commit from one or more file create/update/delete actions and advance a branch.",
    mapping:
      "Azure uses pushes; GitHub batch writes require raw Git composition; Bitbucket and GitLab request schemas are incomplete.",
    members: {
      "azure-devops": partial(["pushesCreate"], "Push operation combines commits and ref updates."),
      bitbucket: partial(
        ["postRepositoriesWorkspaceRepoSlugSrc"],
        "Multipart request body is absent from the normalized schema.",
      ),
      codeberg: equivalent([
        "repoCreateFile",
        "repoUpdateFile",
        "repoDeleteFile",
        "repoChangeFiles",
      ]),
      gitea: equivalent(["repoCreateFile", "repoUpdateFile", "repoDeleteFile", "repoChangeFiles"]),
      github: partial([
        "reposCreateOrUpdateFileContents",
        "reposDeleteFile",
        "gitCreateBlob",
        "gitCreateTree",
        "gitCreateCommit",
        "gitUpdateRef",
      ], "Single-file API is direct; batch writes require composition."),
      gitlab: partial([
        "postApiV4ProjectsIdRepositoryCommits",
        "postApiV4ProjectsIdRepositoryFilesFilePath",
        "putApiV4ProjectsIdRepositoryFilesFilePath",
        "deleteApiV4ProjectsIdRepositoryFilesFilePath",
      ], "Normalized request schemas omit the documented commit action fields."),
    },
  },
  {
    id: "collaborator.read.v1",
    domain: "Repository access and integrations",
    title: "Read repository collaborators or members",
    contract: "Read principals with direct or inherited access to a repository-bearing resource.",
    mapping:
      "Bitbucket permission entries and GitLab project membership are broader than collaborator invitations.",
    members: {
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugPermissionsConfigUsers",
        "getRepositoriesWorkspaceRepoSlugPermissionsConfigGroups",
      ], "Returns direct user/group permission bindings."),
      codeberg: equivalent(["repoListCollaborators", "repoCheckCollaborator"]),
      gitea: equivalent(["repoListCollaborators", "repoCheckCollaborator"]),
      github: equivalent([
        "reposListCollaborators",
        "reposCheckCollaborator",
        "reposGetCollaboratorPermissionLevel",
      ]),
      gitlab: partial(
        ["getApiV4ProjectsIdMembers", "getApiV4ProjectsIdMembersAll"],
        "Project members can include inherited group membership.",
      ),
    },
  },
  {
    id: "deploy-key.crud.v1",
    domain: "Repository access and integrations",
    title: "Manage deploy keys",
    contract: "List, create, inspect, and remove repository-scoped SSH deploy keys.",
    mapping: "Azure Git has no accepted mapping; Bitbucket create/update bodies are incomplete.",
    members: {
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugDeployKeys",
        "getRepositoriesWorkspaceRepoSlugDeployKeysKeyId",
        "postRepositoriesWorkspaceRepoSlugDeployKeys",
        "putRepositoriesWorkspaceRepoSlugDeployKeysKeyId",
        "deleteRepositoriesWorkspaceRepoSlugDeployKeysKeyId",
      ], "Create and update request bodies are missing in the normalized source."),
      codeberg: equivalent(["repoListKeys", "repoGetKey", "repoCreateKey", "repoDeleteKey"]),
      gitea: equivalent(["repoListKeys", "repoGetKey", "repoCreateKey", "repoDeleteKey"]),
      github: equivalent([
        "reposListDeployKeys",
        "reposGetDeployKey",
        "reposCreateDeployKey",
        "reposDeleteDeployKey",
      ]),
      gitlab: equivalent([
        "getApiV4ProjectsIdDeployKeys",
        "getApiV4ProjectsIdDeployKeysKeyId",
        "postApiV4ProjectsIdDeployKeys",
        "putApiV4ProjectsIdDeployKeysKeyId",
        "deleteApiV4ProjectsIdDeployKeysKeyId",
      ]),
    },
  },
  {
    id: "webhook.crud.v1",
    domain: "Repository access and integrations",
    title: "Manage repository webhooks",
    contract: "List, create, update, test, and delete outbound repository webhooks.",
    mapping:
      "Delivery logs/replay and test-trigger capabilities differ; Bitbucket request bodies are incomplete.",
    members: {
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugHooks",
        "getRepositoriesWorkspaceRepoSlugHooksUid",
        "postRepositoriesWorkspaceRepoSlugHooks",
        "putRepositoriesWorkspaceRepoSlugHooksUid",
        "deleteRepositoriesWorkspaceRepoSlugHooksUid",
      ], "Create/update bodies are absent from the normalized source."),
      codeberg: equivalent([
        "repoListHooks",
        "repoGetHook",
        "repoCreateHook",
        "repoEditHook",
        "repoDeleteHook",
        "repoTestHook",
      ]),
      gitea: equivalent([
        "repoListHooks",
        "repoGetHook",
        "repoCreateHook",
        "repoEditHook",
        "repoDeleteHook",
        "repoTestHook",
      ]),
      github: equivalent([
        "reposListWebhooks",
        "reposGetWebhook",
        "reposCreateWebhook",
        "reposUpdateWebhook",
        "reposDeleteWebhook",
        "reposPingWebhook",
        "reposTestPushWebhook",
      ]),
      gitlab: equivalent([
        "getApiV4ProjectsIdHooks",
        "getApiV4ProjectsIdHooksHookId",
        "postApiV4ProjectsIdHooks",
        "putApiV4ProjectsIdHooksHookId",
        "deleteApiV4ProjectsIdHooksHookId",
        "postApiV4ProjectsIdHooksHookIdTestTrigger",
      ]),
    },
  },
  {
    id: "release.crud.v1",
    domain: "Repository access and integrations",
    title: "Manage releases",
    contract: "List, read, create, update, and delete releases attached to repository tags.",
    mapping: "Azure and Bitbucket have no accepted release resource in these generated snapshots.",
    members: {
      codeberg: equivalent([
        "repoListReleases",
        "repoGetRelease",
        "repoGetReleaseByTag",
        "repoCreateRelease",
        "repoEditRelease",
        "repoDeleteRelease",
      ]),
      gitea: equivalent([
        "repoListReleases",
        "repoGetRelease",
        "repoGetReleaseByTag",
        "repoCreateRelease",
        "repoEditRelease",
        "repoDeleteRelease",
      ]),
      github: equivalent([
        "reposListReleases",
        "reposGetRelease",
        "reposGetReleaseByTag",
        "reposCreateRelease",
        "reposUpdateRelease",
        "reposDeleteRelease",
      ]),
      gitlab: equivalent([
        "getApiV4ProjectsIdReleases",
        "getApiV4ProjectsIdReleasesTagName",
        "postApiV4ProjectsIdReleases",
        "putApiV4ProjectsIdReleasesTagName",
        "deleteApiV4ProjectsIdReleasesTagName",
      ]),
    },
  },
  {
    id: "commit-status.v1",
    domain: "Repository access and integrations",
    title: "Read and create commit statuses",
    contract: "Attach external state/context information to a commit and list recorded statuses.",
    mapping: "Bitbucket also supports keyed updates; combined-status endpoints are not universal.",
    members: {
      "azure-devops": equivalent(["statusesCreate", "statusesList"]),
      bitbucket: equivalent([
        "postRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuild",
        "getRepositoriesWorkspaceRepoSlugCommitCommitStatuses",
        "putRepositoriesWorkspaceRepoSlugCommitCommitStatusesBuildKey",
      ]),
      codeberg: equivalent(["repoCreateStatus", "repoListStatuses", "repoListStatusesByRef"]),
      gitea: equivalent(["repoCreateStatus", "repoListStatuses", "repoListStatusesByRef"]),
      github: equivalent(["reposCreateCommitStatus", "reposListCommitStatusesForRef"]),
      gitlab: equivalent([
        "postApiV4ProjectsIdStatusesSha",
        "getApiV4ProjectsIdRepositoryCommitsShaStatuses",
      ]),
    },
  },
  {
    id: "user.current.read.v1",
    domain: "Identity and namespaces",
    title: "Get authenticated user",
    contract: "Read the identity represented by current request credentials.",
    mapping: "Azure Git and the generated GitLab snapshot have no accepted current-user method.",
    members: {
      bitbucket: equivalent(["getUser"]),
      codeberg: equivalent(["userGetCurrent"]),
      gitea: equivalent(["userGetCurrent"]),
      github: equivalent(["usersGetAuthenticated"]),
    },
  },
  {
    id: "user.named.read.v1",
    domain: "Identity and namespaces",
    title: "Get named user",
    contract: "Read one public provider user by username or provider identifier.",
    mapping: "Azure Git and the generated GitLab snapshot have no accepted direct user getter.",
    members: {
      bitbucket: equivalent(["getUsersSelectedUser"]),
      codeberg: equivalent(["userGet"]),
      gitea: equivalent(["userGet"]),
      github: equivalent(["usersGetByUsername", "usersGetById"]),
    },
  },
  {
    id: "user.search.v1",
    domain: "Identity and namespaces",
    title: "Search users",
    contract: "Search provider users by a text query.",
    mapping:
      "GitLab search has an untyped generated response; Bitbucket and Azure expose no accepted mapping.",
    members: {
      codeberg: equivalent(["userSearch"]),
      gitea: equivalent(["userSearch"]),
      github: equivalent(["searchUsers"]),
      gitlab: partial(
        ["getApiV4Search"],
        "Requires scope=users and the generated success body is undefined.",
      ),
    },
  },
  {
    id: "namespace.read.v1",
    domain: "Identity and namespaces",
    title: "List or get repository namespaces",
    contract: "Read owner namespaces that can contain repositories.",
    mapping:
      "Organization, workspace, and group are only comparable as repository ownership boundaries, not as lossless resources.",
    members: {
      bitbucket: equivalent(["getUserWorkspaces", "getWorkspacesWorkspace"]),
      codeberg: equivalent(["orgGetAll", "orgGet"]),
      gitea: equivalent(["orgGetAll", "orgGet"]),
      github: equivalent(["orgsList", "orgsGet"]),
      gitlab: partial(
        ["getApiV4Groups", "getApiV4GroupsId"],
        "GitLab groups are hierarchical and can contain projects/subgroups.",
      ),
    },
  },
  {
    id: "namespace.members.read.v1",
    domain: "Identity and namespaces",
    title: "Read namespace members",
    contract: "List principals with membership in a repository namespace.",
    mapping: "Direct, public, inherited, pending, and permission-binding semantics differ.",
    members: {
      bitbucket: equivalent([
        "getWorkspacesWorkspaceMembers",
        "getWorkspacesWorkspaceMembersMember",
      ]),
      codeberg: equivalent(["orgListMembers", "orgListPublicMembers"]),
      gitea: equivalent(["orgListMembers", "orgListPublicMembers"]),
      github: equivalent(["orgsListMembers", "orgsListOutsideCollaborators"]),
      gitlab: partial(
        ["getApiV4GroupsIdMembers", "getApiV4GroupsIdMembersAll"],
        "members/all includes inherited membership.",
      ),
    },
  },
  {
    id: "team.crud.v1",
    domain: "Identity and namespaces",
    title: "Manage teams",
    contract: "Manage a named team with members and repository access inside a namespace.",
    mapping:
      "Bitbucket permission groups and GitLab subgroups are explicitly not accepted as team equivalents.",
    members: {
      codeberg: equivalent([
        "orgListTeams",
        "orgCreateTeam",
        "orgGetTeam",
        "orgEditTeam",
        "orgDeleteTeam",
        "orgListTeamMembers",
        "orgAddTeamMember",
        "orgRemoveTeamMember",
      ]),
      gitea: equivalent([
        "orgListTeams",
        "orgCreateTeam",
        "orgGetTeam",
        "orgEditTeam",
        "orgDeleteTeam",
        "orgListTeamMembers",
        "orgAddTeamMember",
        "orgRemoveTeamMember",
      ]),
      github: equivalent([
        "teamsList",
        "teamsCreate",
        "teamsGetByName",
        "teamsUpdateInOrg",
        "teamsDeleteInOrg",
        "teamsListMembersInOrg",
        "teamsAddOrUpdateMembershipForUserInOrg",
        "teamsRemoveMembershipForUserInOrg",
      ]),
    },
  },
  {
    id: "issue.read.v1",
    domain: "Issues and planning",
    title: "List or get issues",
    contract: "List issues in a repository/namespace scope and read one issue.",
    mapping:
      "GitLab's generated snapshot only exposes global/group reads, and GitHub list endpoints can include pull requests.",
    members: {
      codeberg: equivalent(["issueListIssues", "issueGetIssue"]),
      gitea: equivalent(["issueListIssues", "issueGetIssue"]),
      github: partial(
        ["issuesListForRepo", "issuesGet"],
        "Repository issue lists can include pull requests.",
      ),
      gitlab: partial(
        ["getApiV4Issues", "getApiV4IssuesId", "getApiV4GroupsIdIssues"],
        "Project-scoped core issue read operations are absent from the generated snapshot.",
      ),
    },
  },
  {
    id: "issue.write.v1",
    domain: "Issues and planning",
    title: "Create, update, or delete issue",
    contract: "Create and mutate issue state/content in a repository.",
    mapping: "GitHub has no issue delete; GitLab mutation is absent from the generated snapshot.",
    members: {
      codeberg: equivalent(["issueCreateIssue", "issueEditIssue", "issueDelete"]),
      gitea: equivalent(["issueCreateIssue", "issueEditIssue", "issueDelete"]),
      github: partial(["issuesCreate", "issuesUpdate"], "No generated issue deletion operation."),
    },
  },
  {
    id: "issue.comments.v1",
    domain: "Issues and planning",
    title: "Manage issue comments",
    contract: "List, create, update, and delete issue conversation comments.",
    mapping: "GitLab ordinary issue notes are absent from the generated snapshot.",
    members: {
      codeberg: equivalent([
        "issueGetComments",
        "issueCreateComment",
        "issueGetComment",
        "issueEditComment",
        "issueDeleteComment",
      ]),
      gitea: equivalent([
        "issueGetComments",
        "issueCreateComment",
        "issueGetComment",
        "issueEditComment",
        "issueDeleteComment",
      ]),
      github: equivalent([
        "issuesListComments",
        "issuesCreateComment",
        "issuesGetComment",
        "issuesUpdateComment",
        "issuesDeleteComment",
      ]),
    },
  },
  {
    id: "label.catalog.v1",
    domain: "Issues and planning",
    title: "Manage label catalog",
    contract: "List and manage reusable repository labels.",
    mapping:
      "Azure PR tags and GitLab MR label fields are attachment mechanisms, not accepted label catalogs.",
    members: {
      codeberg: equivalent([
        "issueListLabels",
        "issueCreateLabel",
        "issueGetLabel",
        "issueEditLabel",
        "issueDeleteLabel",
      ]),
      gitea: equivalent([
        "issueListLabels",
        "issueCreateLabel",
        "issueGetLabel",
        "issueEditLabel",
        "issueDeleteLabel",
      ]),
      github: equivalent([
        "issuesListLabelsForRepo",
        "issuesCreateLabel",
        "issuesGetLabel",
        "issuesUpdateLabel",
        "issuesDeleteLabel",
      ]),
    },
  },
  {
    id: "milestone.catalog.v1",
    domain: "Issues and planning",
    title: "Manage milestones",
    contract: "List and manage repository milestones assignable to issues or pull requests.",
    mapping:
      "GitLab MR milestone assignment exists, but catalog CRUD is absent from the generated snapshot.",
    members: {
      codeberg: equivalent([
        "issueGetMilestonesList",
        "issueCreateMilestone",
        "issueGetMilestone",
        "issueEditMilestone",
        "issueDeleteMilestone",
      ]),
      gitea: equivalent([
        "issueGetMilestonesList",
        "issueCreateMilestone",
        "issueGetMilestone",
        "issueEditMilestone",
        "issueDeleteMilestone",
      ]),
      github: equivalent([
        "issuesListMilestones",
        "issuesCreateMilestone",
        "issuesGetMilestone",
        "issuesUpdateMilestone",
        "issuesDeleteMilestone",
      ]),
    },
  },
  {
    id: "pull-request.core.v1",
    domain: "Pull and merge requests",
    title: "List, create, read, and update pull request",
    contract: "Manage a proposal to merge commits from a source branch into a target branch.",
    mapping:
      "All six map at the workflow level, but identity, source-branch ownership, draft state, and mergeability fields differ.",
    members: {
      "azure-devops": equivalent([
        "pullRequestsGetPullRequests",
        "pullRequestsCreate",
        "pullRequestsGetPullRequest",
        "pullRequestsUpdate",
      ]),
      bitbucket: equivalent([
        "getRepositoriesWorkspaceRepoSlugPullrequests",
        "postRepositoriesWorkspaceRepoSlugPullrequests",
        "getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId",
        "putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId",
      ]),
      codeberg: equivalent([
        "repoListPullRequests",
        "repoCreatePullRequest",
        "repoGetPullRequest",
        "repoEditPullRequest",
      ]),
      gitea: equivalent([
        "repoListPullRequests",
        "repoCreatePullRequest",
        "repoGetPullRequest",
        "repoEditPullRequest",
      ]),
      github: equivalent(["pullsList", "pullsCreate", "pullsGet", "pullsUpdate"]),
      gitlab: equivalent([
        "getApiV4ProjectsIdMergeRequests",
        "postApiV4ProjectsIdMergeRequests",
        "getApiV4ProjectsIdMergeRequestsMergeRequestIid",
        "putApiV4ProjectsIdMergeRequestsMergeRequestIid",
      ]),
    },
  },
  {
    id: "pull-request.merge.v1",
    domain: "Pull and merge requests",
    title: "Merge or complete pull request",
    contract: "Apply the proposed source changes to the target branch.",
    mapping: "Azure completes by updating PR state; merge strategies and async behavior differ.",
    members: {
      "azure-devops": partial(
        ["pullRequestsUpdate"],
        "Completion is a state update with completion options, not a dedicated merge operation.",
      ),
      bitbucket: equivalent(["postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdMerge"]),
      codeberg: equivalent(["repoMergePullRequest"]),
      gitea: equivalent(["repoMergePullRequest"]),
      github: equivalent(["pullsMerge", "pullsMergeAsync"]),
      gitlab: equivalent(["putApiV4ProjectsIdMergeRequestsMergeRequestIidMerge"]),
    },
  },
  {
    id: "pull-request.changes.v1",
    domain: "Pull and merge requests",
    title: "Read pull request commits and changes",
    contract: "Read commits and file-level changes belonging to a pull or merge request.",
    mapping:
      "Azure iteration changes and provider raw diff/patch representations are materially different.",
    members: {
      "azure-devops": partial([
        "pullRequestCommitsGetPullRequestCommits",
        "pullRequestIterationChangesGet",
      ], "Change model is iteration-oriented and has no raw patch endpoint."),
      bitbucket: equivalent([
        "getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommits",
        "getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDiff",
        "getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdDiffstat",
      ]),
      codeberg: equivalent([
        "repoGetPullRequestCommits",
        "repoGetPullRequestFiles",
        "repoDownloadPullDiffOrPatch",
      ]),
      gitea: equivalent([
        "repoGetPullRequestCommits",
        "repoGetPullRequestFiles",
        "repoDownloadPullDiffOrPatch",
      ]),
      github: equivalent(["pullsListCommits", "pullsListFiles"]),
      gitlab: equivalent([
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidCommits",
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidChanges",
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidDiffs",
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidRawDiffs",
      ]),
    },
  },
  {
    id: "pull-request.reviewers.v1",
    domain: "Pull and merge requests",
    title: "Read or request reviewers",
    contract: "Read assigned/requested reviewers and request or remove reviewer participation.",
    mapping:
      "Bitbucket and GitLab primarily set reviewer arrays in PR/MR bodies rather than dedicated request endpoints.",
    members: {
      "azure-devops": equivalent([
        "pullRequestReviewersList",
        "pullRequestReviewersCreatePullRequestReviewer",
        "pullRequestReviewersDelete",
      ]),
      bitbucket: partial([
        "getRepositoriesWorkspaceRepoSlugDefaultReviewers",
        "postRepositoriesWorkspaceRepoSlugPullrequests",
        "putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestId",
      ], "Per-PR reviewers are body fields; dedicated methods manage defaults."),
      codeberg: equivalent([
        "repoGetReviewers",
        "repoCreatePullReviewRequests",
        "repoDeletePullReviewRequests",
      ]),
      gitea: equivalent([
        "repoGetReviewers",
        "repoCreatePullReviewRequests",
        "repoDeletePullReviewRequests",
      ]),
      github: equivalent([
        "pullsListRequestedReviewers",
        "pullsRequestReviewers",
        "pullsRemoveRequestedReviewers",
      ]),
      gitlab: partial([
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidReviewers",
        "putApiV4ProjectsIdMergeRequestsMergeRequestIid",
      ], "Reviewer assignment is a merge-request update field."),
    },
  },
  {
    id: "pull-request.review.v1",
    domain: "Pull and merge requests",
    title: "Submit review or approval decision",
    contract: "Record an authenticated review decision on a pull or merge request.",
    mapping:
      "Review entities only exist on Codeberg/Gitea/GitHub; Azure votes, Bitbucket participant state, and GitLab approvals are partial mappings.",
    members: {
      "azure-devops": partial(
        ["pullRequestReviewersUpdatePullRequestReviewer"],
        "Numeric reviewer vote rather than a review entity.",
      ),
      bitbucket: partial([
        "postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove",
        "postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdRequestChanges",
        "deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove",
      ], "Mutates authenticated participant state without a review object."),
      codeberg: equivalent([
        "repoListPullReviews",
        "repoCreatePullReview",
        "repoGetPullReview",
        "repoSubmitPullReview",
        "repoDismissPullReview",
      ]),
      gitea: equivalent([
        "repoListPullReviews",
        "repoCreatePullReview",
        "repoGetPullReview",
        "repoSubmitPullReview",
        "repoDismissPullReview",
      ]),
      github: equivalent([
        "pullsListReviews",
        "pullsCreateReview",
        "pullsGetReview",
        "pullsSubmitReview",
        "pullsDismissReview",
      ]),
      gitlab: partial([
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidApprovals",
        "postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove",
        "postApiV4ProjectsIdMergeRequestsMergeRequestIidUnapprove",
      ], "Approval state has no GitHub-style review entity or request-changes decision."),
    },
  },
  {
    id: "pull-request.comments.v1",
    domain: "Pull and merge requests",
    title: "Manage pull request comments",
    contract: "Read and write conversation or inline comments on a pull request.",
    mapping:
      "Comment containers differ: Azure threads, Bitbucket comments, shared issue comments, GitHub review comments, and GitLab draft notes.",
    members: {
      "azure-devops": partial([
        "pullRequestThreadsList",
        "pullRequestThreadsCreate",
        "pullRequestThreadCommentsCreate",
        "pullRequestThreadCommentsUpdate",
        "pullRequestThreadCommentsDelete",
      ], "Thread-first model with nested comments."),
      bitbucket: equivalent([
        "getRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments",
        "postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdComments",
        "putRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentId",
        "deleteRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdCommentsCommentId",
      ]),
      codeberg: partial(
        ["issueGetComments", "issueCreateComment", "repoGetPullReviewComments"],
        "Conversation comments share issue routes; inline comments belong to reviews.",
      ),
      gitea: partial([
        "issueGetComments",
        "issueCreateComment",
        "repoGetPullReviewComments",
        "repoCreatePullReviewCommentReply",
      ], "Conversation comments share issue routes; inline comments belong to reviews."),
      github: partial([
        "issuesListComments",
        "issuesCreateComment",
        "pullsListReviewComments",
        "pullsCreateReviewComment",
      ], "Conversation and inline review comments are separate resources."),
      gitlab: partial([
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes",
        "postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotes",
        "postApiV4ProjectsIdMergeRequestsMergeRequestIidDraftNotesBulkPublish",
      ], "Only draft positional notes are present; ordinary published notes are absent."),
    },
  },
  {
    id: "notification.read-state.v1",
    domain: "Notifications and search",
    title: "Read and update notifications",
    contract: "List notification threads and update their read or completion state.",
    mapping: "Only Codeberg, Gitea, and GitHub expose a notification inbox in these snapshots.",
    members: {
      codeberg: equivalent([
        "notifyGetList",
        "notifyGetRepoList",
        "notifyReadList",
        "notifyReadThread",
      ]),
      gitea: equivalent([
        "notifyGetList",
        "notifyGetRepoList",
        "notifyReadList",
        "notifyReadThread",
      ]),
      github: partial([
        "activityListNotificationsForAuthenticatedUser",
        "activityListRepoNotificationsForAuthenticatedUser",
        "activityMarkNotificationsAsRead",
        "activityMarkThreadAsRead",
        "activityMarkThreadAsDone",
      ], "GitHub adds a distinct done state and subscriptions."),
    },
  },
  {
    id: "snippet.crud.v1",
    domain: "Notifications and search",
    title: "Manage snippets or gists",
    contract:
      "Manage a small provider-hosted multi-file code snippet independent of a normal repository checkout.",
    mapping:
      "Ownership, project association, revision, fork, star, watch, and comment semantics differ.",
    members: {
      bitbucket: partial([
        "getSnippetsWorkspace",
        "postSnippetsWorkspace",
        "getSnippetsWorkspaceEncodedId",
        "putSnippetsWorkspaceEncodedId",
        "deleteSnippetsWorkspaceEncodedId",
      ], "Workspace snippets have revisions/watchers and Bitbucket-specific identity."),
      github: partial(
        ["gistsList", "gistsCreate", "gistsGet", "gistsUpdate", "gistsDelete"],
        "Gists have forks, stars, revisions, and public discovery.",
      ),
      gitlab: partial([
        "getApiV4Snippets",
        "postApiV4Snippets",
        "getApiV4SnippetsId",
        "putApiV4SnippetsId",
        "deleteApiV4SnippetsId",
        "getApiV4ProjectsIdSnippets",
        "postApiV4ProjectsIdSnippets",
      ], "Global/personal and project snippets are separate scopes."),
    },
  },
  {
    id: "wiki.crud.v1",
    domain: "Notifications and search",
    title: "Manage repository wiki pages",
    contract:
      "List, read, create, update, and delete wiki pages attached to a repository or namespace.",
    mapping: "GitHub Pages and GitLab Pages are static hosting, not accepted wiki equivalents.",
    members: {
      codeberg: equivalent([
        "repoGetWikiPages",
        "repoGetWikiPage",
        "repoCreateWikiPage",
        "repoEditWikiPage",
        "repoDeleteWikiPage",
      ]),
      gitea: equivalent([
        "repoGetWikiPages",
        "repoGetWikiPage",
        "repoCreateWikiPage",
        "repoEditWikiPage",
        "repoDeleteWikiPage",
      ]),
      gitlab: equivalent([
        "getApiV4ProjectsIdWikis",
        "getApiV4ProjectsIdWikisSlug",
        "postApiV4ProjectsIdWikis",
        "putApiV4ProjectsIdWikisSlug",
        "deleteApiV4ProjectsIdWikisSlug",
      ]),
    },
  },
  {
    id: "search.code.v1",
    domain: "Notifications and search",
    title: "Search repository code",
    contract: "Search indexed source content across repositories in a provider-defined scope.",
    mapping:
      "Query languages and result schemas are incompatible; Bitbucket methods are deprecated and GitLab results are untyped.",
    members: {
      bitbucket: partial(
        ["searchAccount", "searchTeam", "searchWorkspace"],
        "Code-only methods are deprecated effective November 2026.",
      ),
      github: equivalent(["searchCode"]),
      gitlab: partial(
        ["getApiV4Search", "getApiV4GroupsIdSearch", "getApiV4ProjectsIdSearch"],
        "Requires blobs scope and generated success bodies are undefined.",
      ),
    },
  },
  {
    id: "ci.run.v1",
    domain: "CI, artifacts, and runners",
    title: "Trigger, inspect, and control CI run",
    contract: "Trigger or inspect a repository CI execution and cancel or retry it.",
    mapping:
      "Workflow, pipeline, run, task, bridge, and target models differ; Azure build/pipeline APIs are outside its Git-only snapshot.",
    members: {
      bitbucket: partial([
        "createPipelineForRepository",
        "getPipelineForRepository",
        "getPipelinesForRepository",
        "stopPipeline",
      ], "Pipeline targets are a Bitbucket-specific discriminated union."),
      codeberg: partial(
        ["dispatchWorkflow", "getActionsRun", "listActionRuns", "cancelActionRun"],
        "Forgejo run/task model and token-context operation differ.",
      ),
      gitea: partial([
        "actionsDispatchWorkflow",
        "getWorkflowRun",
        "actionsListWorkflowRuns",
        "cancelWorkflowRun",
        "rerunWorkflowRun",
      ], "Actions-like but not wire-compatible with GitHub."),
      github: partial([
        "actionsCreateWorkflowDispatch",
        "actionsGetWorkflowRun",
        "actionsListWorkflowRunsForRepo",
        "actionsCancelWorkflowRun",
        "actionsReRunWorkflow",
      ], "Workflow/run hierarchy and GitHub trust controls are provider-specific."),
      gitlab: partial([
        "postApiV4ProjectsIdPipeline",
        "getApiV4ProjectsIdPipelines",
        "getApiV4ProjectsIdPipelinesPipelineId",
        "postApiV4ProjectsIdPipelinesPipelineIdCancel",
        "postApiV4ProjectsIdPipelinesPipelineIdRetry",
      ], "Pipeline graphs include jobs and bridges/downstream pipelines."),
    },
  },
  {
    id: "ci.jobs-logs.v1",
    domain: "CI, artifacts, and runners",
    title: "Read CI jobs and logs",
    contract: "List execution jobs/tasks and retrieve their logs or traces.",
    mapping: "Job identity, attempts, containers, and log archive/stream formats differ.",
    members: {
      bitbucket: partial([
        "getPipelineStepsForRepository",
        "getPipelineStepForRepository",
        "getPipelineStepLogForRepository",
        "getPipelineContainerLog",
      ], "Step/container model rather than jobs."),
      codeberg: partial([
        "listActionRunJobs",
        "listActionTasks",
        "repoGetActionJobLogs",
        "repoGetActionRunLogs",
      ], "Forgejo jobs/tasks are separate resources."),
      gitea: partial(
        ["listWorkflowRunJobs", "downloadActionsRunJobLogs", "getWorkflowRunLogs"],
        "Supports run attempts and Gitea-specific jobs.",
      ),
      github: partial([
        "actionsListJobsForWorkflowRun",
        "actionsDownloadJobLogsForWorkflowRun",
        "actionsDownloadWorkflowRunLogs",
      ], "Logs are download archives tied to workflow runs/jobs."),
      gitlab: partial([
        "getApiV4ProjectsIdPipelinesPipelineIdJobs",
        "getApiV4ProjectsIdJobsJobId",
        "getApiV4ProjectsIdJobsJobIdTrace",
      ], "Jobs are pipeline/deployable resources with trace text."),
    },
  },
  {
    id: "ci.artifacts.v1",
    domain: "CI, artifacts, and runners",
    title: "Read and delete CI artifacts",
    contract: "List/download outputs produced by a CI execution and remove them where supported.",
    mapping:
      "Bitbucket Downloads and Azure PR attachments are explicitly rejected as CI artifacts.",
    members: {
      codeberg: partial([
        "listActionArtifacts",
        "listActionRunArtifacts",
        "getActionArtifact",
        "downloadActionArtifact",
        "deleteActionArtifact",
      ], "Forgejo archive and quota lifecycle."),
      gitea: partial([
        "getArtifacts",
        "getArtifactsOfRun",
        "getArtifact",
        "downloadArtifact",
        "deleteArtifact",
      ], "Gitea run artifact model."),
      github: partial([
        "actionsListWorkflowRunArtifacts",
        "actionsDownloadArtifact",
        "actionsDeleteArtifact",
      ], "GitHub artifacts are named run-level archives with retention."),
      gitlab: partial([
        "getApiV4ProjectsIdJobsJobIdArtifacts",
        "getApiV4ProjectsIdJobsJobIdArtifactsArtifactPath",
        "deleteApiV4ProjectsIdJobsJobIdArtifacts",
        "postApiV4ProjectsIdJobsJobIdArtifactsKeep",
      ], "GitLab artifacts are job-scoped and support path/tree access and keep/erase."),
    },
  },
  {
    id: "ci.runners.v1",
    domain: "CI, artifacts, and runners",
    title: "Manage self-hosted CI runners",
    contract: "List, register/configure, and remove execution agents attached to a provider scope.",
    mapping:
      "Scope, registration secret lifecycle, runner manager, labels, groups, and hosted runner concepts differ.",
    members: {
      bitbucket: partial([
        "createRepositoryRunner",
        "getRepositoryRunners",
        "updateRepositoryRunner",
        "deleteRepositoryRunner",
        "createWorkspaceRunner",
        "getWorkspaceRunners",
      ], "Repository/workspace runners include one-time OAuth credentials and cordoning."),
      codeberg: partial([
        "registerAdminRunner",
        "registerOrgRunner",
        "registerRepoRunner",
        "registerUserRunner",
      ], "Admin/org/repository/user scopes and registration token model."),
      gitea: partial(
        ["getAdminRunners", "getOrgRunners", "getRepoRunners", "getUserRunners"],
        "Admin/org/repository/user scopes and registration tokens.",
      ),
      github: partial([
        "actionsListSelfHostedRunnersForOrg",
        "actionsListSelfHostedRunnersForRepo",
        "actionsGenerateRunnerJitconfigForOrg",
        "actionsDeleteSelfHostedRunnerFromOrg",
      ], "Adds runner groups, hosted runners, images, and JIT configuration."),
      gitlab: partial([
        "getApiV4RunnersAll",
        "getApiV4RunnersId",
        "getApiV4GroupsIdRunners",
        "getApiV4ProjectsIdRunners",
        "postApiV4ProjectsIdRunners",
        "deleteApiV4ProjectsIdRunnersRunnerId",
      ], "Instance/group/project runners and runner managers."),
    },
  },
  {
    id: "packages.metadata.v1",
    domain: "Packages and deployments",
    title: "Read or manage package metadata",
    contract: "List package/version metadata and delete or restore package records.",
    mapping:
      "GitLab protocol endpoints and container registry are not equivalent to metadata CRUD; Bitbucket and Azure have no accepted package methods.",
    members: {
      codeberg: partial(
        ["listPackages", "getPackage", "listPackageFiles", "deletePackage"],
        "Forgejo metadata and repository linking; narrower version surface.",
      ),
      gitea: partial([
        "listPackages",
        "getPackage",
        "listPackageVersions",
        "getLatestPackageVersion",
        "listPackageFiles",
        "deletePackage",
        "deletePackageVersion",
      ], "Gitea metadata/version/file lifecycle and repository linking."),
      github: partial([
        "packagesListPackagesForOrganization",
        "packagesGetAllPackageVersionsForPackageOwnedByOrg",
        "packagesDeletePackageVersionForOrg",
        "packagesRestorePackageVersionForOrg",
      ], "Package metadata lifecycle after publication."),
      gitlab: partial([
        "getApiV4ProjectsIdPackages",
        "getApiV4ProjectsIdPackagesPackageId",
        "getApiV4ProjectsIdPackagesPackageIdPackageFiles",
        "deleteApiV4ProjectsIdPackagesPackageId",
      ], "Metadata subset only; ecosystem wire protocols remain provider-specific."),
    },
  },
  {
    id: "deployment.environment.v1",
    domain: "Packages and deployments",
    title: "Read or manage deployments and environments",
    contract: "Represent deployment history and named target environments for repository code.",
    mapping:
      "GitHub uses deployment plus status history; GitLab is CI-job linked; Bitbucket exposes environment CRUD and deployment reads.",
    members: {
      bitbucket: partial([
        "createEnvironment",
        "getEnvironmentForRepository",
        "getEnvironmentsForRepository",
        "updateEnvironmentForRepository",
        "getDeploymentForRepository",
        "getDeploymentsForRepository",
      ], "No generated deployment-create operation; pipeline owns deployment records."),
      github: partial([
        "reposCreateDeployment",
        "reposCreateDeploymentStatus",
        "reposGetAllEnvironments",
        "reposCreateOrUpdateEnvironment",
      ], "Deployment requests and append-only statuses plus environment protection."),
      gitlab: partial([
        "postApiV4ProjectsIdDeployments",
        "getApiV4ProjectsIdDeployments",
        "putApiV4ProjectsIdDeploymentsDeploymentId",
        "postApiV4ProjectsIdEnvironments",
        "postApiV4ProjectsIdEnvironmentsEnvironmentIdStop",
      ], "Deployments are CI/deployable-centered and have approvals/review-app lifecycle."),
    },
  },
] as const;

export const rejectedMappings: readonly RejectedMapping[] = [
  {
    title: "Project resources",
    methods: {
      bitbucket: ["getWorkspacesWorkspaceProjects"],
      gitea: ["repoListProjects"],
      github: ["projectsListForOrg"],
      gitlab: ["getApiV4Projects"],
    },
    reason:
      "Bitbucket projects group repositories, Gitea projects are issue boards, GitHub Projects are planning databases, and GitLab projects are repository-bearing application units.",
  },
  {
    title: "Checks, Code Insights, and commit statuses",
    methods: {
      bitbucket: ["createOrUpdateReport", "bulkCreateOrUpdateAnnotations"],
      github: ["checksCreate", "checksCreateSuite", "checksListAnnotations"],
    },
    reason:
      "GitHub Checks have app-owned suites/runs and rerequest behavior; Bitbucket Code Insights stores caller-authored reports/annotations. Only their narrower commit-status projections are portable.",
  },
  {
    title: "Wiki pages and static Pages hosting",
    methods: {
      codeberg: ["repoGetWikiPages"],
      gitea: ["repoGetWikiPages"],
      github: ["reposGetPages"],
      gitlab: ["getApiV4ProjectsIdWikis", "getApiV4ProjectsIdPages"],
    },
    reason:
      "Wiki CRUD edits collaborative pages; Pages APIs configure static site hosting and deployments. Similar names do not imply a shared resource.",
  },
  {
    title: "Release assets, GitLab asset links, and Bitbucket Downloads",
    methods: {
      bitbucket: ["getRepositoriesWorkspaceRepoSlugDownloads"],
      codeberg: ["repoListReleaseAttachments"],
      gitea: ["repoListReleaseAttachments"],
      github: ["reposListReleaseAssets"],
      gitlab: ["getApiV4ProjectsIdReleasesTagNameAssetsLinks"],
    },
    reason:
      "Binary release objects, external release links, arbitrary repository Downloads, and separate project uploads have different ownership and lifecycle.",
  },
  {
    title: "Review entities and approval state",
    methods: {
      "azure-devops": ["pullRequestReviewersUpdatePullRequestReviewer"],
      bitbucket: ["postRepositoriesWorkspaceRepoSlugPullrequestsPullRequestIdApprove"],
      codeberg: ["repoCreatePullReview"],
      gitea: ["repoCreatePullReview"],
      github: ["pullsCreateReview"],
      gitlab: ["postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove"],
    },
    reason:
      "Azure votes, Bitbucket participant state, GitLab approvals, and first-class review records must remain distinct even though all can signal acceptance.",
  },
  {
    title: "Webhook and server-side Git hook",
    methods: {
      codeberg: ["repoCreateHook", "repoEditGitHook"],
      gitea: ["repoCreateHook", "repoEditGitHook"],
    },
    reason:
      "A webhook is an outbound HTTP callback; a server-side Git hook executes privileged forge-side code/configuration and is not a webhook subtype.",
  },
] as const;

export const uniqueSurfaces: readonly UniqueSurface[] = [
  {
    id: "azure.recycle-bin",
    provider: "azure-devops",
    title: "Repository recycle bin",
    methods: [
      "repositoriesGetDeletedRepositories",
      "repositoriesGetRecycleBinRepositories",
      "repositoriesRestoreRepositoryFromRecycleBin",
      "repositoriesDeleteRepositoryFromRecycleBin",
    ],
    description:
      "Azure exposes discovery, restoration, and permanent deletion of soft-deleted Git repositories as an explicit lifecycle.",
    nearest:
      "GitLab delayed deletion has restoration policy, but its generated repository API does not expose the same recycle-bin inventory model.",
  },
  {
    id: "azure.ref-lock",
    provider: "azure-devops",
    title: "Git ref locking",
    methods: ["refsUpdateRef"],
    description: "Locks or unlocks one Git ref independently of branch protection policy.",
    nearest:
      "Branch protection elsewhere controls permissions/rules and is not an equivalent mutable lock bit.",
  },
  {
    id: "azure.pr-iterations",
    provider: "azure-devops",
    title: "Pull request iteration and work-item model",
    methods: [
      "pullRequestIterationsList",
      "pullRequestIterationChangesGet",
      "pullRequestWorkItemsList",
    ],
    description: "Tracks PR updates as explicit iterations and links Azure work-item references.",
    nearest:
      "Other providers expose commits/diffs and issue links, but not this exact iteration/work-item contract in these clients.",
  },
  {
    id: "bitbucket.connect",
    provider: "bitbucket",
    title: "Bitbucket Connect add-on lifecycle",
    methods: ["getAddonAddonKeyClientKey", "putAddon", "deleteAddon"],
    description:
      "Manages installed Connect add-ons and their provider-hosted identity/configuration.",
    nearest:
      "GitHub Apps and GitLab integrations have different installation, token, descriptor, and permission models.",
  },
  {
    id: "bitbucket.code-insights",
    provider: "bitbucket",
    title: "Code Insights reports and annotations",
    methods: [
      "createOrUpdateReport",
      "getReportsForCommit",
      "bulkCreateOrUpdateAnnotations",
      "getAnnotationsForReport",
    ],
    description: "Stores caller-authored reports and line annotations against a commit.",
    nearest:
      "GitHub Checks are app-owned suites/runs with a different lifecycle; security alerts are provider-owned findings.",
  },
  {
    id: "bitbucket.pipeline-ssh-oidc",
    provider: "bitbucket",
    title: "Pipeline SSH and OIDC configuration",
    methods: [
      "createRepositoryPipelineKnownHost",
      "getRepositoryPipelineSshKeyPair",
      "getOidcConfiguration",
      "getOidcKeys",
    ],
    description:
      "Exposes pipeline known-host/key-pair configuration and OIDC discovery/JWKS directly.",
    nearest:
      "GitHub customizes OIDC subject claims; GitLab configures cloud workload integrations. Those are not discovery-key endpoints.",
  },
  {
    id: "codeberg.activitypub",
    provider: "codeberg",
    title: "ActivityPub federation",
    methods: [
      "activitypubInstanceActor",
      "activitypubPerson",
      "activitypubPersonInbox",
      "activitypubRepository",
      "activitypubRepositoryInbox",
      "userCurrentActivityPubFollow",
    ],
    description:
      "Exposes federated actor, inbox, outbox, feed, repository actor, and remote-follow protocol operations.",
    nearest:
      "Local follows and webhooks do not model federated actor URIs, signed activities, or inbox delivery.",
  },
  {
    id: "codeberg.quotas",
    provider: "codeberg",
    title: "Quota rules, groups, and resource accounting",
    methods: [
      "adminCreateQuotaRule",
      "adminCreateQuotaGroup",
      "adminAddRuleToQuotaGroup",
      "adminSetUserQuotaGroups",
      "userGetQuota",
      "userCheckQuota",
      "orgGetQuota",
    ],
    description:
      "Composes enforceable quota rules/groups and reports effective usage by artifact, attachment, and package consumer.",
    nearest:
      "GitHub billing budgets and GitLab plan limits measure different dimensions and do not share this enforcement model.",
  },
  {
    id: "codeberg.action-token-context",
    provider: "codeberg",
    title: "Forgejo Actions token-context lookup",
    methods: ["getActionsRun", "adminSearchRunJobs"],
    description:
      "Retrieves the run associated with an automatic job token and provides Forgejo-specific run-job administration/search.",
    nearest: "Other CI APIs inspect runs by explicit repository/run identifiers.",
  },
  {
    id: "gitea.project-boards",
    provider: "gitea",
    title: "Issue-to-column project boards",
    methods: [
      "repoCreateProject",
      "repoCreateProjectColumn",
      "repoAddIssueToProjectColumn",
      "repoMoveProjectIssue",
      "repoSetDefaultProjectColumn",
    ],
    description:
      "Provides direct issue placement and movement across simple project columns at repository, organization, and user scopes.",
    nearest:
      "GitHub Projects V2 has typed fields/views/draft items and cannot be represented as a column board.",
  },
  {
    id: "gitea.instance-maintenance",
    provider: "gitea",
    title: "Instance repository adoption and cron execution",
    methods: ["adminAdoptRepository", "adminUnadoptedList", "adminCronList", "adminCronRun"],
    description:
      "Adopts repositories found on the forge filesystem and invokes instance maintenance tasks.",
    nearest:
      "Cloud-hosted provider administration does not expose filesystem adoption or arbitrary instance cron execution.",
  },
  {
    id: "gitea.issue-stopwatch",
    provider: "gitea",
    title: "Issue stopwatch and tracked time",
    methods: ["issueStartStopWatch", "issueStopStopWatch", "issueTrackedTimes"],
    description:
      "Models active per-user timers and accumulated issue time as explicit REST resources.",
    nearest:
      "GitLab has issue time estimates/spent time but no accepted active stopwatch mapping in this snapshot.",
  },
  {
    id: "github.security",
    provider: "github",
    title: "Native scanning, advisory, and remediation lifecycle",
    methods: [
      "codeScanningListAlertsForRepo",
      "codeScanningUploadSarif",
      "codeScanningCreateAutofix",
      "secretScanningListAlertsForRepo",
      "dependencyGraphExportSbom",
      "securityAdvisoriesCreateRepositoryAdvisory",
    ],
    description:
      "Owns alert identity, locations, dismissal/remediation, SARIF ingestion, autofix, SBOM, and repository advisory/CVE workflows.",
    nearest:
      "Bitbucket Code Insights stores caller-authored reports; the generated GitLab snapshot lacks native vulnerability CRUD.",
  },
  {
    id: "github.codespaces-copilot-agents",
    provider: "github",
    title: "Codespaces, Copilot, and coding agents",
    methods: [
      "codespacesCreateWithRepoForAuthenticatedUser",
      "codespacesStartForAuthenticatedUser",
      "copilotAddCopilotSeatsForUsers",
      "copilotSpacesCreateForOrg",
      "agentTasksCreateTaskInRepo",
    ],
    description:
      "Manages cloud development environments, AI product seats/spaces, and repository coding-agent tasks.",
    nearest: "No corresponding generated resources exist in the other five clients.",
  },
  {
    id: "github.app-installations",
    provider: "github",
    title: "GitHub App installation and token model",
    methods: [
      "appsCreateFromManifest",
      "appsListInstallations",
      "appsCreateInstallationAccessToken",
      "appsListReposAccessibleToInstallation",
      "appsSuspendInstallation",
    ],
    description:
      "Installs permission-scoped apps on selected accounts/repositories and issues short-lived installation tokens.",
    nearest:
      "OAuth client registrations and Bitbucket Connect descriptors use incompatible identity and authorization models.",
  },
  {
    id: "github.billing",
    provider: "github",
    title: "Billing budgets and premium usage reports",
    methods: [
      "billingCreateOrganizationBudget",
      "billingGetAllBudgetsOrg",
      "billingGetGithubBillingUsageReportOrg",
      "billingGetGithubBillingAiCreditUsageReportOrg",
    ],
    description: "Configures spending budgets and retrieves billable/premium/AI usage dimensions.",
    nearest: "Forgejo storage quotas and GitLab plan limits are not monetary budget resources.",
  },
  {
    id: "gitlab.package-protocols",
    provider: "gitlab",
    title: "Package ecosystem wire protocols",
    methods: [
      "getApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName",
      "putApiV4ProjectsIdPackagesMavenPathFileName",
      "putApiV4ProjectsIdPackagesNpmPackageName",
      "putApiV4ProjectsIdPackagesNuget",
      "getApiV4ProjectsIdPackagesPypiSimplePackageName",
    ],
    description:
      "Implements ecosystem-specific upload, download, metadata, and index protocols across many package formats.",
    nearest:
      "Other generated package clients primarily manage package metadata after publication, not ecosystem wire protocols.",
  },
  {
    id: "gitlab.terraform-kubernetes",
    provider: "gitlab",
    title: "Terraform state/module and Kubernetes agent resources",
    methods: [
      "getApiV4ProjectsIdTerraformStateName",
      "postApiV4ProjectsIdTerraformStateNameLock",
      "getApiV4ProjectsIdClusterAgents",
      "postApiV4ProjectsIdClusterAgents",
    ],
    description:
      "Hosts lockable Terraform state/module registries and manages Kubernetes connectivity agents/tokens.",
    nearest:
      "CI runners and OIDC cloud credentials do not provide state locking or Kubernetes agent resources.",
  },
  {
    id: "gitlab.feature-flags",
    provider: "gitlab",
    title: "Runtime and instance feature flags",
    methods: [
      "getApiV4ProjectsIdFeatureFlags",
      "postApiV4ProjectsIdFeatureFlags",
      "getApiV4FeatureFlagsUnleashProjectIdClientFeatures",
      "getApiV4Features",
      "postApiV4FeaturesName",
    ],
    description:
      "Separately manages project runtime flags with Unleash compatibility and self-managed instance feature gates.",
    nearest:
      "Repository variables and environment configuration are not feature-evaluation services.",
  },
  {
    id: "gitlab.geo-admin",
    provider: "gitlab",
    title: "Geo and self-managed operational administration",
    methods: [
      "postApiV4GeoStatus",
      "getApiV4AdminBatchedBackgroundMigrations",
      "putApiV4AdminBatchedBackgroundMigrationsIdPause",
      "getApiV4AdminDatabasesDatabaseNameDictionaryTablesTableName",
    ],
    description:
      "Exposes Geo replication/proxy status and database/background-migration operations for self-managed instances.",
    nearest:
      "No other generated client exposes equivalent forge database or Geo operational controls.",
  },
  {
    id: "gitlab.integrations",
    provider: "gitlab",
    title: "Typed product integration catalog",
    methods: [
      "putApiV4ProjectsIdIntegrationsJenkins",
      "putApiV4ProjectsIdIntegrationsJira",
      "putApiV4ProjectsIdIntegrationsSlack",
      "putApiV4ProjectsIdIntegrationsGoogleCloudPlatformArtifactRegistry",
    ],
    description:
      "Configures product-specific credentials, events, and bidirectional behavior through dedicated integration resources.",
    nearest:
      "A generic webhook cannot preserve each integration's typed configuration or behavior.",
  },
] as const;
