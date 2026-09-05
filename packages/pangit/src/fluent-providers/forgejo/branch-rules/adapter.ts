import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  createForgejoBranchRule,
  deleteForgejoBranchRule,
  setForgejoBranchRuleOrder,
  updateForgejoBranchRule,
} from "./mutate-rules.ts";

import { getForgejoBranchRule, listForgejoBranchRules } from "./read-rules.ts";
import { getForgejoEffectiveBranchProtection } from "./effective-protection.ts";
import { forgejoBranchRuleSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "branchRuleSupport"
  | "listBranchRules"
  | "getBranchRule"
  | "createBranchRule"
  | "updateBranchRule"
  | "deleteBranchRule"
  | "getEffectiveBranchProtection"
  | "setBranchRuleOrder"
> {
  return {
    branchRuleSupport: forgejoBranchRuleSupport,
    listBranchRules: (repository, options) => listForgejoBranchRules(context, repository, options),
    getBranchRule: (repository, name, options) =>
      getForgejoBranchRule(context, repository, name, options),
    createBranchRule: (repository, input, options) =>
      createForgejoBranchRule(context, repository, input, options),
    updateBranchRule: (repository, rule, input, options) =>
      updateForgejoBranchRule(context, repository, rule, input, options),
    deleteBranchRule: (repository, rule, options) =>
      deleteForgejoBranchRule(context, repository, rule, options),
    getEffectiveBranchProtection: (
      repository,
      branch,
      options,
    ) => getForgejoEffectiveBranchProtection(context, repository, branch, options),
    setBranchRuleOrder: (repository, options) =>
      setForgejoBranchRuleOrder(context, repository, options),
  };
}
