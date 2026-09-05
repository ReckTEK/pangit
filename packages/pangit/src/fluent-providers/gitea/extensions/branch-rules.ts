/** Gitea-only exact ordering for configured branch rules, highest priority first. */
export interface GiteaBranchRuleOrderExtension {
  readonly orderedRuleNames: readonly string[];
}

export interface GiteaBranchRuleOrderExtensionContext {
  readonly repositoryFullName: string;
}
