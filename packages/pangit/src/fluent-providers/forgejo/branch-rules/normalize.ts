import type { BranchRuleData } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";

import {
  createForgejoBranchRuleEntityNative,
  type ForgejoBranchRuleEntityPayload,
} from "../native/ForgejoBranchRuleNative.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  type AnyForgejoRule,
  optionalBoolean,
  optionalNonNegativeInteger,
  optionalText,
  requiredText,
  validTextArray,
} from "./validate-payload.ts";

export function normalizeForgejoBranchRule<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: AnyForgejoRule,
): BranchRuleData<"forgejo", TVersion> {
  return Object.freeze({
    name: requiredText(payload.rule_name, "branch rule name"),
    ...optionalBoolean("pushAllowed", payload.enable_push),
    ...optionalBoolean("signedCommitsRequired", payload.require_signed_commits),
    ...optionalBoolean("statusChecksRequired", payload.enable_status_check),
    statusCheckContexts: Object.freeze(validTextArray(payload.status_check_contexts)),
    ...(optionalNonNegativeInteger(payload.required_approvals) === undefined
      ? {}
      : { requiredApprovals: optionalNonNegativeInteger(payload.required_approvals) }),
    ...optionalBoolean("blockOnRejectedReviews", payload.block_on_rejected_reviews),
    ...optionalBoolean("blockOnOutdatedBranch", payload.block_on_outdated_branch),
    ...optionalBoolean("dismissStaleApprovals", payload.dismiss_stale_approvals),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    ...(optionalText(payload.updated_at) === undefined
      ? {}
      : { updatedAt: optionalText(payload.updated_at) }),
    native: createForgejoBranchRuleEntityNative(
      "configuredRule",
      client,
      payload as ForgejoBranchRuleEntityPayload<TVersion, "configuredRule">,
    ),
  });
}
