import type { ForgejoProviderTypes } from "../provider-types.ts";
import { unavailable } from "../unavailable.ts";
import type {
  BranchRuleData,
  BranchRuleFields,
  BranchRuleOrderOptions,
  CreateBranchRuleInput,
  UpdateBranchRuleInput,
} from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejo, requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyForgejoRule, isRulePayload } from "./validate-payload.ts";

import { normalizeForgejoBranchRule } from "./normalize.ts";

/** Create one configured rule directly. */
export async function createForgejoBranchRule<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: CreateBranchRuleInput,
  options: OperationOptions = {},
): Promise<BranchRuleData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = {
    universal: "createBranchRule",
    native: "repoCreateBranchProtection",
  } as const;
  const fields = forgejoRuleFields(input, context.version, operation.universal);
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRule, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateBranchProtection(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              rule_name: requireIdentity(input.name, "branch rule name"),
              ...fields,
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isRulePayload,
  );
  return normalizeForgejoBranchRule(client, payload);
}

/** Update one known configured rule without a lookup. */
export async function updateForgejoBranchRule<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  rule: BranchRuleData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: UpdateBranchRuleInput,
  options: OperationOptions = {},
): Promise<BranchRuleData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = {
    universal: "updateBranchRule",
    native: "repoEditBranchProtection",
  } as const;
  const fields = forgejoRuleFields(input, context.version, operation.universal);
  if (Object.keys(fields).length === 0) {
    throw new TypeError("branch rule update requires at least one changed field");
  }
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRule, TVersion>(
    context,
    operation,
    () =>
      client.repoEditBranchProtection(
        {
          path: {
            ...repositoryPath(repository),
            name: requireIdentity(rule.name, "branch rule name"),
          },
          body: { mediaType: "application/json", value: fields },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isRulePayload,
  );
  return normalizeForgejoBranchRule(client, payload);
}

/** Delete one known configured rule directly. */
export async function deleteForgejoBranchRule<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  rule: BranchRuleData<"forgejo", TVersion, ForgejoProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "deleteBranchRule",
    native: "repoDeleteBranchProtection",
  } as const;
  const client = await context.client();
  await requestForgejo(
    context,
    operation,
    () =>
      client.repoDeleteBranchProtection(
        {
          path: {
            ...repositoryPath(repository),
            name: requireIdentity(rule.name, "branch rule name"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Reject unsupported rule ordering before any request. */
export function setForgejoBranchRuleOrder<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  _repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  _options: BranchRuleOrderOptions<"forgejo", ForgejoProviderTypes>,
): Promise<void> {
  return unavailable(
    context.version,
    "setBranchRuleOrder",
    "Forgejo orders matching rules internally and has no rule-priority API",
  );
}

function forgejoRuleFields(input: BranchRuleFields, version: ForgejoVersion, operation: string) {
  if (input.forcePushAllowed !== undefined) {
    unavailable(
      version,
      operation,
      "Forgejo branch rules do not expose a force-push permission field",
    );
  }
  const contexts = input.statusCheckContexts?.map((value) =>
    requireIdentity(value, "status check context")
  );
  if (
    input.requiredApprovals !== undefined &&
    (!Number.isSafeInteger(input.requiredApprovals) || input.requiredApprovals < 0)
  ) {
    throw new RangeError("required approvals must be a non-negative safe integer");
  }
  return {
    ...(input.pushAllowed === undefined ? {} : { enable_push: input.pushAllowed }),
    ...(input.signedCommitsRequired === undefined
      ? {}
      : { require_signed_commits: input.signedCommitsRequired }),
    ...(input.statusChecksRequired === undefined
      ? {}
      : { enable_status_check: input.statusChecksRequired }),
    ...(contexts === undefined ? {} : { status_check_contexts: contexts }),
    ...(input.requiredApprovals === undefined
      ? {}
      : { required_approvals: input.requiredApprovals }),
    ...(input.blockOnRejectedReviews === undefined
      ? {}
      : { block_on_rejected_reviews: input.blockOnRejectedReviews }),
    ...(input.blockOnOutdatedBranch === undefined
      ? {}
      : { block_on_outdated_branch: input.blockOnOutdatedBranch }),
    ...(input.dismissStaleApprovals === undefined
      ? {}
      : { dismiss_stale_approvals: input.dismissStaleApprovals }),
  };
}
