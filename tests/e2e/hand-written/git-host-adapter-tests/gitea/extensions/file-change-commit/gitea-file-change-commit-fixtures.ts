/** Known repository destination for the Gitea-only atomic file-change option contract. */
export type GiteaFileChangeCommitFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly branch: string;
  readonly createdPath: string;
};
