import type { GiteaProviderTypes } from "../provider-types.ts";
import type { EffectiveBranchProtectionData } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaBranchRuleEntityNative,
  type GiteaBranchRuleEntityPayload,
} from "../native/GiteaBranchRuleNative.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyGiteaBranch,
  isBranchPayload,
  optionalBoolean,
  optionalNonNegativeInteger,
  optionalText,
  requiredBoolean,
  requiredText,
  validTextArray,
} from "./validate-payload.ts";

/** Ask Gitea for effective enforcement on one concrete branch; never infer it from rule fields. */
export async function getGiteaEffectiveBranchProtection<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  branch: string,
  options: OperationOptions = {},
): Promise<EffectiveBranchProtectionData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = {
    universal: "getEffectiveBranchProtection",
    native: "repoGetBranch",
  } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaBranch, TVersion>(
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
  return normalizeGiteaEffectiveBranchProtection(client, payload);
}

export function normalizeGiteaEffectiveBranchProtection<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaBranch,
): EffectiveBranchProtectionData<"gitea", TVersion, GiteaProviderTypes> {
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
    native: createGiteaBranchRuleEntityNative(
      "effectiveProtection",
      client,
      payload as GiteaBranchRuleEntityPayload<TVersion, "effectiveProtection">,
    ),
  });
}
