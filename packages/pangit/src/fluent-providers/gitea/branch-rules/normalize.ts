import type { BranchRuleData } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";

import {
  createGiteaBranchRuleEntityNative,
  type GiteaBranchRuleEntityPayload,
} from "../native/GiteaBranchRuleNative.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  type AnyGiteaRule,
  optionalBoolean,
  optionalNonNegativeInteger,
  optionalText,
  requiredText,
  validTextArray,
} from "./validate-payload.ts";

export function normalizeGiteaBranchRule<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaRule,
): BranchRuleData<"gitea", TVersion> {
  return Object.freeze({
    name: requiredText(payload.rule_name, "branch rule name"),
    ...optionalBoolean("pushAllowed", payload.enable_push),
    ...optionalBoolean("forcePushAllowed", payload.enable_force_push),
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
    native: createGiteaBranchRuleEntityNative(
      "configuredRule",
      client,
      payload as GiteaBranchRuleEntityPayload<TVersion, "configuredRule">,
    ),
  });
}
