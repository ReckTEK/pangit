/** Provider-created identities needed by the universal fork contract. */
export type ForkContractFixtures = {
  readonly source: { readonly owner: string; readonly repository: string };
  readonly destination: { readonly name: string };
  readonly forkName: string;
};
