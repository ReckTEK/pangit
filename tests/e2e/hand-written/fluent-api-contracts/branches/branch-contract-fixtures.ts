/** Provider-created identities needed by the universal branch contract. */
export type BranchContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly base: string;
  readonly head: string;
  readonly baseSha: string;
  readonly headSha: string;
  readonly expectedAhead: number;
  readonly expectedBehind: number;
  readonly mutationBranch: string;
};
