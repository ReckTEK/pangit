import type { ProviderExtensionOptions } from "../../provider-extensions/ProviderExtensionRegistry.ts";
import type { Provider, ProviderVersion } from "../provider.ts";
import type { ProviderBranchRuleEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderBranchRuleEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

/** Configured rule values whose meaning is shared across provider implementations. */
export interface BranchRuleData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly name: string;
  readonly pushAllowed?: boolean;
  readonly forcePushAllowed?: boolean;
  readonly signedCommitsRequired?: boolean;
  readonly statusChecksRequired?: boolean;
  readonly statusCheckContexts: readonly string[];
  readonly requiredApprovals?: number;
  readonly blockOnRejectedReviews?: boolean;
  readonly blockOnOutdatedBranch?: boolean;
  readonly dismissStaleApprovals?: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly native: ProviderBranchRuleEntityNative<TProvider, TVersion, "configuredRule">;
}

/** Effective enforcement resolved by the provider for one concrete branch. */
export interface EffectiveBranchProtectionData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly branch: string;
  readonly protected: boolean;
  readonly ruleName?: string;
  readonly statusChecksRequired?: boolean;
  readonly statusCheckContexts: readonly string[];
  readonly requiredApprovals?: number;
  readonly currentUserCanPush?: boolean;
  readonly currentUserCanMerge?: boolean;
  readonly native: ProviderBranchRuleEntityNative<TProvider, TVersion, "effectiveProtection">;
}

export interface BranchRuleFields {
  readonly pushAllowed?: boolean;
  readonly forcePushAllowed?: boolean;
  readonly signedCommitsRequired?: boolean;
  readonly statusChecksRequired?: boolean;
  readonly statusCheckContexts?: readonly string[];
  readonly requiredApprovals?: number;
  readonly blockOnRejectedReviews?: boolean;
  readonly blockOnOutdatedBranch?: boolean;
  readonly dismissStaleApprovals?: boolean;
}

export interface CreateBranchRuleInput extends BranchRuleFields {
  readonly name: string;
}

export interface UpdateBranchRuleInput extends BranchRuleFields {}

/** An list endpoint is direct but unpaginated, so the caller supplies a hard bound. */
export interface ListBranchRulesOptions extends OperationOptions {
  readonly maxRules: number;
}

export type BranchRuleOrderExtension<TProvider extends Provider> = ProviderExtensionOptions<
  "branchRules.setOrder",
  TProvider
>;

export interface BranchRuleOrderOptions<TProvider extends Provider> extends OperationOptions {
  readonly extension?: BranchRuleOrderExtension<TProvider>;
}

export type BranchRuleOperation = "list" | "get" | "create" | "update" | "delete";

export interface BranchRuleCapabilitySupport {
  readonly configuredRules: Readonly<{
    readonly supported: boolean;
    readonly operations: Readonly<
      Record<BranchRuleOperation, "direct" | "direct-bounded-result" | "bounded">
    >;
  }>;
  readonly effectiveProtection: Readonly<{
    readonly supported: boolean;
    readonly get: "direct";
  }>;
  readonly orderedPriority: "provider-extension" | "unsupported";
}

/** Optional configured-rule and effective-enforcement adapter contracts. */
export interface BranchRuleAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly branchRuleSupport: BranchRuleCapabilitySupport;
  listBranchRules(
    repository: RepositoryData<TProvider, TVersion>,
    options: ListBranchRulesOptions,
  ): Promise<readonly BranchRuleData<TProvider, TVersion>[]>;
  getBranchRule(
    repository: RepositoryData<TProvider, TVersion>,
    name: string,
    options?: OperationOptions,
  ): Promise<BranchRuleData<TProvider, TVersion>>;
  createBranchRule(
    repository: RepositoryData<TProvider, TVersion>,
    input: CreateBranchRuleInput,
    options?: OperationOptions,
  ): Promise<BranchRuleData<TProvider, TVersion>>;
  updateBranchRule(
    repository: RepositoryData<TProvider, TVersion>,
    rule: BranchRuleData<TProvider, TVersion>,
    input: UpdateBranchRuleInput,
    options?: OperationOptions,
  ): Promise<BranchRuleData<TProvider, TVersion>>;
  deleteBranchRule(
    repository: RepositoryData<TProvider, TVersion>,
    rule: BranchRuleData<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<void>;
  getEffectiveBranchProtection(
    repository: RepositoryData<TProvider, TVersion>,
    branch: string,
    options?: OperationOptions,
  ): Promise<EffectiveBranchProtectionData<TProvider, TVersion>>;
  setBranchRuleOrder(
    repository: RepositoryData<TProvider, TVersion>,
    options: BranchRuleOrderOptions<TProvider>,
  ): Promise<void>;
}
