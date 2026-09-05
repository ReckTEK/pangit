export { giteaBranchRuleSupport } from "./support.ts";
export { getGiteaBranchRule, listGiteaBranchRules } from "./read-rules.ts";

export {
  createGiteaBranchRule,
  deleteGiteaBranchRule,
  setGiteaBranchRuleOrder,
  updateGiteaBranchRule,
} from "./mutate-rules.ts";

export {
  getGiteaEffectiveBranchProtection,
  normalizeGiteaEffectiveBranchProtection,
} from "./effective-protection.ts";

export { normalizeGiteaBranchRule } from "./normalize.ts";

export { createOperations } from "./adapter.ts";
