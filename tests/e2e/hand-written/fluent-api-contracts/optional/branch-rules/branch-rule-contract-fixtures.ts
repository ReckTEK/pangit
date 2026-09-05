/** Disposable branch and rule identities prepared for branch-rule contracts. */
export type BranchRuleContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly branch: string;
  readonly ruleName: string;
};
