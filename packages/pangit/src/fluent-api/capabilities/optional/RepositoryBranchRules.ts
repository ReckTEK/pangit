import type { ProviderExtensions } from "../../provider-extensions/ExtensionSupport.ts";
import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import type {
  BranchRuleAdapter,
  BranchRuleCapabilitySupport,
  BranchRuleData,
  BranchRuleOrderOptions,
  CreateBranchRuleInput,
  ListBranchRulesOptions,
  UpdateBranchRuleInput,
} from "../../adapter-contract/optional/branch-rules.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";
import { ValidationError, type ValidationErrorContext } from "../../adapter-contract/errors.ts";

import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import {
  type BranchRule,
  createBranchRule,
  createEffectiveBranchProtection,
  type EffectiveBranchProtection,
} from "../../entities/optional/BranchRule.ts";
import {
  createOperationExtension,
  type OperationExtension,
} from "../../provider-extensions/OperationExtension.ts";

export type BranchRuleOrderOperation<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = OperationExtension<
  "branchRules.setOrder",
  TProvider,
  TVersion,
  void
>;

export interface RepositoryBranchRules<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: BranchRuleCapabilitySupport;
  list(options: ListBranchRulesOptions): Promise<readonly BranchRule<TProvider, TVersion>[]>;
  get(name: string, options?: OperationOptions): Promise<BranchRule<TProvider, TVersion>>;
  create(
    input: CreateBranchRuleInput,
    options?: OperationOptions,
  ): Promise<BranchRule<TProvider, TVersion>>;
  update(
    rule: BranchRule<TProvider, TVersion>,
    input: UpdateBranchRuleInput,
    options?: OperationOptions,
  ): Promise<BranchRule<TProvider, TVersion>>;
  delete(rule: BranchRule<TProvider, TVersion>, options?: OperationOptions): Promise<void>;
  effective(
    branch: string,
    options?: OperationOptions,
  ): Promise<EffectiveBranchProtection<TProvider, TVersion>>;
  setOrder(): BranchRuleOrderOperation<TProvider, TVersion>;
}

export function createRepositoryBranchRules<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  adapter: BranchRuleAdapter<TProvider, TVersion> & {
    readonly extensions: ProviderExtensions<TProvider>;
  },
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryBranchRules<TProvider, TVersion> {
  const data = (rule: BranchRule<TProvider, TVersion>): BranchRuleData<TProvider, TVersion> => ({
    ...rule,
    statusCheckContexts: [...rule.statusCheckContexts],
    native: rule.native,
  });
  return Object.freeze({
    support: adapter.branchRuleSupport,
    async list(options: ListBranchRulesOptions) {
      const context = { provider, version, operation: "listBranchRules" } as const;
      requirePositiveInteger(options.maxRules, "maximum branch rules", context);
      return Object.freeze(
        (await adapter.listBranchRules(repository, options)).map(createBranchRule),
      );
    },
    async get(name: string, options: OperationOptions = {}) {
      const context = { provider, version, operation: "getBranchRule" } as const;
      return createBranchRule(
        await adapter.getBranchRule(
          repository,
          requireIdentity(name, "branch rule name", context),
          options,
        ),
      );
    },
    async create(input: CreateBranchRuleInput, options: OperationOptions = {}) {
      const context = { provider, version, operation: "createBranchRule" } as const;
      return createBranchRule(
        await adapter.createBranchRule(repository, validateCreateInput(input, context), options),
      );
    },
    async update(
      rule: BranchRule<TProvider, TVersion>,
      input: UpdateBranchRuleInput,
      options: OperationOptions = {},
    ) {
      const context = { provider, version, operation: "updateBranchRule" } as const;
      return createBranchRule(
        await adapter.updateBranchRule(
          repository,
          data(rule),
          validateUpdateInput(input, context),
          options,
        ),
      );
    },
    delete(rule: BranchRule<TProvider, TVersion>, options: OperationOptions = {}) {
      return adapter.deleteBranchRule(repository, data(rule), options);
    },
    async effective(branch: string, options: OperationOptions = {}) {
      const context = {
        provider,
        version,
        operation: "getEffectiveBranchProtection",
      } as const;
      return createEffectiveBranchProtection(
        await adapter.getEffectiveBranchProtection(
          repository,
          requireIdentity(branch, "branch name", context),
          options,
        ),
      );
    },
    setOrder() {
      const context = { provider, version, operation: "setBranchRuleOrder" } as const;
      return createOperationExtension<"branchRules.setOrder", TProvider, TVersion, void>({
        operation: "branchRules.setOrder",
        support: adapter.extensions["branchRules.setOrder"],
        validationContext: context,
        provider,
        version,
        context: Object.freeze({ repositoryFullName: repository.fullName }),
        execute: async (extension, options) => {
          if (extension === undefined) {
            throw new ValidationError(
              "branch-rule ordering requires a provider extension",
              context,
            );
          }
          await adapter.setBranchRuleOrder(
            repository,
            {
              ...options,
              extension,
            } as BranchRuleOrderOptions<TProvider>,
          );
        },
      });
    },
  });
}

function validateCreateInput(
  input: CreateBranchRuleInput,
  context: ValidationErrorContext,
): CreateBranchRuleInput {
  return Object.freeze({
    name: requireIdentity(input.name, "branch rule name", context),
    ...validateFields(input, context),
  });
}

function validateUpdateInput(
  input: UpdateBranchRuleInput,
  context: ValidationErrorContext,
): UpdateBranchRuleInput {
  const fields = validateFields(input, context);
  if (Object.keys(fields).length === 0) {
    throw new ValidationError("branch rule update requires at least one changed field", context);
  }
  return Object.freeze(fields);
}

function validateFields(
  input: UpdateBranchRuleInput,
  context: ValidationErrorContext,
): UpdateBranchRuleInput {
  if (input.requiredApprovals !== undefined) {
    if (!Number.isSafeInteger(input.requiredApprovals) || input.requiredApprovals < 0) {
      throw new ValidationError(
        "required approvals must be a non-negative safe integer",
        context,
      );
    }
  }
  const contexts = input.statusCheckContexts?.map((value) =>
    requireIdentity(value, "status check context", context)
  );
  return {
    ...(input.pushAllowed === undefined ? {} : { pushAllowed: input.pushAllowed }),
    ...(input.forcePushAllowed === undefined ? {} : { forcePushAllowed: input.forcePushAllowed }),
    ...(input.signedCommitsRequired === undefined
      ? {}
      : { signedCommitsRequired: input.signedCommitsRequired }),
    ...(input.statusChecksRequired === undefined
      ? {}
      : { statusChecksRequired: input.statusChecksRequired }),
    ...(contexts === undefined ? {} : { statusCheckContexts: Object.freeze(contexts) }),
    ...(input.requiredApprovals === undefined
      ? {}
      : { requiredApprovals: input.requiredApprovals }),
    ...(input.blockOnRejectedReviews === undefined
      ? {}
      : { blockOnRejectedReviews: input.blockOnRejectedReviews }),
    ...(input.blockOnOutdatedBranch === undefined
      ? {}
      : { blockOnOutdatedBranch: input.blockOnOutdatedBranch }),
    ...(input.dismissStaleApprovals === undefined
      ? {}
      : { dismissStaleApprovals: input.dismissStaleApprovals }),
  };
}
