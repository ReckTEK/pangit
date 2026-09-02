/** Known comparison with one changed path for raw diff/patch output proof. */
export type GiteaCompareDiffPatchFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly base: string;
  readonly head: string;
  readonly changedPath: string;
};
