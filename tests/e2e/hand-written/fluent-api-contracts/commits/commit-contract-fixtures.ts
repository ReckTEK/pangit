/** Provider-created DAG and ref identities needed by the universal commit contract. */
export type CommitContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly rootSha: string;
  readonly base: string;
  readonly baseSha: string;
  readonly head: string;
  readonly headSha: string;
  readonly baseChangedPath: string;
  readonly headTag: string;
};
