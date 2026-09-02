/** Provider-created identities needed by the universal tag contract. */
export type TagContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly targetSha: string;
  readonly existingTag: string;
  readonly mutationTag: string;
};
