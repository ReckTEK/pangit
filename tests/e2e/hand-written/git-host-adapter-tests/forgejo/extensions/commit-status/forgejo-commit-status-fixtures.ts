/** One known ref used to publish Forgejo-only status vocabulary. */
export type ForgejoCommitStatusFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly ref: string;
};
