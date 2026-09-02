/** Disposable branch and rule identities prepared for branch-rule contracts. */
export type BranchRuleContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly branch: string;
  readonly ruleName: string;
};

/** Two configured-rule identities used to prove the Gitea-only priority extension. */
export type BranchRulePriorityContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly orderedRuleNames: readonly [string, string];
};
