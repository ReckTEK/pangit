/** Disposable repository used by the shared issue and Gitea concurrency contracts. */
export type IssueContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
};
