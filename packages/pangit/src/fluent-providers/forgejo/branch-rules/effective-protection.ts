import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { EffectiveBranchProtectionData } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import {
  createForgejoBranchRuleEntityNative,
  type ForgejoBranchRuleEntityPayload,
} from "../native/ForgejoBranchRuleNative.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyForgejoBranch,
  isBranchPayload,
  optionalBoolean,
  optionalNonNegativeInteger,
  optionalText,
  requiredBoolean,
  requiredText,
  validTextArray,
} from "./validate-payload.ts";

/** Ask Forgejo for effective enforcement on one concrete branch; never infer it from rule fields. */
export async function getForgejoEffectiveBranchProtection<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  branch: string,
  options: OperationOptions = {},
): Promise<EffectiveBranchProtectionData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = {
    universal: "getEffectiveBranchProtection",
    native: "repoGetBranch",
  } as const;
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoBranch, TVersion>(
    context,
    operation,
    () =>
      client.repoGetBranch(
        {
          path: {
            ...repositoryPath(repository),
            branch: requireIdentity(branch, "branch name"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isBranchPayload,
  );
  return normalizeForgejoEffectiveBranchProtection(client, payload);
}

export function normalizeForgejoEffectiveBranchProtection<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: AnyForgejoBranch,
): EffectiveBranchProtectionData<"forgejo", TVersion, ForgejoProviderTypes> {
  return Object.freeze({
    branch: requiredText(payload.name, "branch name"),
    protected: requiredBoolean(payload.protected, "effective branch protection"),
    ...(optionalText(payload.effective_branch_protection_name) === undefined
      ? {}
      : { ruleName: optionalText(payload.effective_branch_protection_name) }),
    ...optionalBoolean("statusChecksRequired", payload.enable_status_check),
    statusCheckContexts: Object.freeze(validTextArray(payload.status_check_contexts)),
    ...(optionalNonNegativeInteger(payload.required_approvals) === undefined
      ? {}
      : { requiredApprovals: optionalNonNegativeInteger(payload.required_approvals) }),
    ...optionalBoolean("currentUserCanPush", payload.user_can_push),
    ...optionalBoolean("currentUserCanMerge", payload.user_can_merge),
    native: createForgejoBranchRuleEntityNative(
      "effectiveProtection",
      client,
      payload as ForgejoBranchRuleEntityPayload<TVersion, "effectiveProtection">,
    ),
  });
}
