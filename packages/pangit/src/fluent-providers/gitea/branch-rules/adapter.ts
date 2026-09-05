import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  createGiteaBranchRule,
  deleteGiteaBranchRule,
  setGiteaBranchRuleOrder,
  updateGiteaBranchRule,
} from "./mutate-rules.ts";

import { getGiteaBranchRule, listGiteaBranchRules } from "./read-rules.ts";
import { getGiteaEffectiveBranchProtection } from "./effective-protection.ts";
import { giteaBranchRuleSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
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
    branchRuleSupport: giteaBranchRuleSupport,
    listBranchRules: (repository, options) => listGiteaBranchRules(context, repository, options),
    getBranchRule: (repository, name, options) =>
      getGiteaBranchRule(context, repository, name, options),
    createBranchRule: (repository, input, options) =>
      createGiteaBranchRule(context, repository, input, options),
    updateBranchRule: (repository, rule, input, options) =>
      updateGiteaBranchRule(context, repository, rule, input, options),
    deleteBranchRule: (repository, rule, options) =>
      deleteGiteaBranchRule(context, repository, rule, options),
    getEffectiveBranchProtection: (
      repository,
      branch,
      options,
    ) => getGiteaEffectiveBranchProtection(context, repository, branch, options),
    setBranchRuleOrder: (repository, options) =>
      setGiteaBranchRuleOrder(context, repository, options),
  };
}
