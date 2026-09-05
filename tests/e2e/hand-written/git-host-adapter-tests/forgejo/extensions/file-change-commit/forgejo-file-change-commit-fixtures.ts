/** Known repository destination for the Forgejo-only atomic file-change option contract. */
export type ForgejoFileChangeCommitFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly branch: string;
  readonly createdPath: string;
};
