/** Two configured-rule identities used to prove the Gitea priority extension. */
export type BranchRulePriorityContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly orderedRuleNames: readonly [string, string];
};
