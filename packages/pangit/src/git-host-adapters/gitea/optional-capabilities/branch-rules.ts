import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  BranchRuleCapabilitySupport,
  BranchRuleData,
  BranchRuleFields,
  BranchRuleOrderOptions,
  CreateBranchRuleInput,
  EffectiveBranchProtectionData,
  ListBranchRulesOptions,
  UpdateBranchRuleInput,
} from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import {
  createGiteaBranchRuleEntityNative,
  type GiteaBranchRuleEntityPayload,
} from "../native/GiteaBranchRuleNative.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGitea, requestGiteaBody } from "../response.ts";

type AnyGiteaRule = GiteaBranchRuleEntityPayload<GiteaVersion, "configuredRule">;
type AnyGiteaBranch = GiteaBranchRuleEntityPayload<GiteaVersion, "effectiveProtection">;

export const giteaBranchRuleSupport = Object.freeze({
  configuredRules: Object.freeze({
    supported: true,
    operations: Object.freeze({
      list: "direct-bounded-result",
      get: "direct",
      create: "direct",
      update: "direct",
      delete: "direct",
    }),
  }),
  effectiveProtection: Object.freeze({ supported: true, get: "direct" }),
  orderedPriority: "gitea-extension",
}) satisfies BranchRuleCapabilitySupport;

/** Read Gitea's unpaginated configured-rule result once and enforce the caller's hard bound. */
export async function listGiteaBranchRules<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  options: ListBranchRulesOptions,
): Promise<readonly BranchRuleData<"gitea", TVersion>[]> {
  const operation = {
    universal: "listBranchRules",
    native: "repoListBranchProtection",
  } as const;
  const maxRules = requirePositiveInteger(options.maxRules, "maximum branch rules");
  const client = await context.client();
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoListBranchProtection(
        { path: repositoryPath(repository) },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  const rules = requireRuleArray(context, operation.universal, response.body);
  if (rules.length > maxRules) {
    throw new ValidationError(
      `repoListBranchProtection returned ${rules.length} rules, exceeding the ${maxRules} item limit`,
      {
        provider: "gitea",
        version: context.version,
        operation: operation.universal,
        cause: response,
      },
    );
  }
  return Object.freeze(rules.map((rule) => normalizeGiteaBranchRule(client, rule)));
}

/** Fetch one configured rule directly by its name or pattern. */
export async function getGiteaBranchRule<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<BranchRuleData<"gitea", TVersion>> {
  const operation = { universal: "getBranchRule", native: "repoGetBranchProtection" } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRule, TVersion>(
    context,
    operation,
    () =>
      client.repoGetBranchProtection(
        {
          path: { ...repositoryPath(repository), name: requireIdentity(name, "branch rule name") },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isRulePayload,
  );
  return normalizeGiteaBranchRule(client, payload);
}

/** Create one configured rule directly. */
export async function createGiteaBranchRule<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreateBranchRuleInput,
  options: OperationOptions = {},
): Promise<BranchRuleData<"gitea", TVersion>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  rule: BranchRuleData<"gitea", TVersion>,
  input: UpdateBranchRuleInput,
  options: OperationOptions = {},
): Promise<BranchRuleData<"gitea", TVersion>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  rule: BranchRuleData<"gitea", TVersion>,
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

/** Ask Gitea for effective enforcement on one concrete branch; never infer it from rule fields. */
export async function getGiteaEffectiveBranchProtection<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  branch: string,
  options: OperationOptions = {},
): Promise<EffectiveBranchProtectionData<"gitea", TVersion>> {
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

/** Apply the Gitea-only exact configured-rule order in one request. */
export async function setGiteaBranchRuleOrder<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  options: BranchRuleOrderOptions<"gitea">,
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

export function normalizeGiteaEffectiveBranchProtection<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaBranch,
): EffectiveBranchProtectionData<"gitea", TVersion> {
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

function requireRuleArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyGiteaRule[] {
  if (!Array.isArray(value) || !value.every(isRulePayload)) {
    throw invariant(context, operation, "returned a malformed branch-rule list");
  }
  return value;
}

function isRulePayload(value: unknown): value is AnyGiteaRule {
  return typeof value === "object" && value !== null &&
    typeof (value as AnyGiteaRule).rule_name === "string" &&
    (value as AnyGiteaRule).rule_name!.length > 0;
}

function isBranchPayload(value: unknown): value is AnyGiteaBranch {
  return typeof value === "object" && value !== null &&
    typeof (value as AnyGiteaBranch).name === "string" &&
    (value as AnyGiteaBranch).name!.length > 0 &&
    typeof (value as AnyGiteaBranch).protected === "boolean";
}

function optionalBoolean<TKey extends string>(key: TKey, value: unknown) {
  return typeof value === "boolean" ? { [key]: value } as { readonly [K in TKey]: boolean } : {};
}

function requiredBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${name} is missing`);
  return value;
}

function validTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => typeof item === "string" ? [item] : [])
    : [];
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "bigint") return undefined;
  const number = typeof value === "bigint" ? Number(value) : value;
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function requiredText(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} is missing`);
  }
  return value;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${message}`, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}
