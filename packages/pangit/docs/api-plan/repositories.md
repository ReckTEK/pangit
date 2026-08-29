# Repositories API plan

PanGit exposes one common repository API across the selected provider and version. Provider-native
requests may differ; the public PanGit contract does not.

## Common repository contract

- `listRepositories(container)` lists repositories in one explicit owning container. The container
  is a user or organization, GitHub organization, GitLab group, Bitbucket workspace, Azure DevOps
  project, or equivalent. PanGit preserves provider-returned order and makes no ordering guarantee.
- `getRepository` gets one repository.
- `createRepository` creates an empty repository or an initialized repository with a named
  initial/default branch and arbitrary caller-supplied files. README and `.gitignore` are ordinary
  files. An initialized repository resolves only after its initial commit, default branch, and
  usable repository state exist. A materialized branch has a commit.
- `renameRepository` renames a repository. `deleteRepository` deletes it.
- `createFork` resolves only with a usable fork. Gitea and Codeberg `202` fork responses are
  immediately verified with `getRepository`, then retried with small bounded delays only when
  absent.
- `listBranches`, `getBranch`, and `branchExists` are common. `branchExists` is false only for a
  confirmed not-found result; access failures remain errors.
- `createBranch`, `renameBranch`, and `deleteBranch` are common. PanGit rejects renaming or deleting
  the current default branch. A missing native rename may be implemented as create-at-current-commit
  followed by delete.
- `getDivergence` and `listBranchDivergences` provide arbitrary branch-to-branch ahead/behind
  counts. Azure DevOps uses `Diffs_Get` with `baseVersion` and `targetVersion`, not only
  default-branch stats.
- Tags, commits, comparisons, ancestry, references, contributors, file and directory reads, Git
  links, file writes, pull requests, reviews, comments, and statuses all have common core contracts.

## Operation-specific provider branches

Every common operation can expose native-only behavior without weakening its common contract.

```ts
pangit.tags.create(common)
  .github((githubTag) => {
    // GitHub tag-specific options
  })
  .codeberg((codebergTag) => {
    // Codeberg tag-specific options
  });
```

Each branch receives the selected provider's context for that specific operation, not a generic
provider client. Only the branch matching the configured provider executes. The same shape applies
to every operation: PR branches receive PR-specific contexts, file-write branches receive
file-write-specific contexts, and so on.

## Tag rule

The common tag model is an annotated tag: name, target, and message. Provider-only behavior such as
signing, arbitrary tagger identity, and lightweight-tag mode lives in the operation-specific branch.
