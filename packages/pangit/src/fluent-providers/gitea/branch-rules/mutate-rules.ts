import type { GiteaProviderTypes } from "../provider-types.ts";
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
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGitea, requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyGiteaRule, isRulePayload } from "./validate-payload.ts";

import { normalizeGiteaBranchRule } from "./normalize.ts";

/** Create one configured rule directly. */
export async function createGiteaBranchRule<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  input: CreateBranchRuleInput,
  options: OperationOptions = {},
): Promise<BranchRuleData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = {
    universal: "createBranchRule",
    native: "repoCreateBranchProtection",
  } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRule, TVersion>(
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
              ...giteaRuleFields(input),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isRulePayload,
  );
  return normalizeGiteaBranchRule(client, payload);
}

/** Update one known configured rule without a lookup. */
export async function updateGiteaBranchRule<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  rule: BranchRuleData<"gitea", TVersion, GiteaProviderTypes>,
  input: UpdateBranchRuleInput,
  options: OperationOptions = {},
): Promise<BranchRuleData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = {
    universal: "updateBranchRule",
    native: "repoEditBranchProtection",
  } as const;
  const fields = giteaRuleFields(input);
  if (Object.keys(fields).length === 0) {
    throw new TypeError("branch rule update requires at least one changed field");
  }
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRule, TVersion>(
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
  return normalizeGiteaBranchRule(client, payload);
}

/** Delete one known configured rule directly. */
export async function deleteGiteaBranchRule<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  rule: BranchRuleData<"gitea", TVersion, GiteaProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "deleteBranchRule",
    native: "repoDeleteBranchProtection",
  } as const;
  const client = await context.client();
  await requestGitea(
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

/** Apply the Gitea-only exact configured-rule order in one request. */
export async function setGiteaBranchRuleOrder<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  options: BranchRuleOrderOptions<"gitea", GiteaProviderTypes>,
): Promise<void> {
  const operation = {
    universal: "setBranchRuleOrder",
    native: "repoUpdateBranchProtectionPriories",
  } as const;
  const orderedRuleNames = options.extension?.orderedRuleNames;
  if (orderedRuleNames === undefined) {
    throw new TypeError("branch-rule ordering requires a Gitea extension");
  }
  const ruleNames = orderedRuleNames.map((name) => requireIdentity(name, "branch rule name"));
  if (ruleNames.length === 0) throw new RangeError("ordered branch rules cannot be empty");
  if (new Set(ruleNames).size !== ruleNames.length) {
    throw new TypeError("ordered branch rules cannot contain duplicates");
  }
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoUpdateBranchProtectionPriories(
        {
          path: repositoryPath(repository),
          body: { mediaType: "application/json", value: { rule_names: ruleNames } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

function giteaRuleFields(input: BranchRuleFields) {
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
    ...(input.forcePushAllowed === undefined ? {} : { enable_force_push: input.forcePushAllowed }),
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
