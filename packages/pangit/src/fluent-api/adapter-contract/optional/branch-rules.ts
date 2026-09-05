import type { Provider, ProviderTypeRegistry, ProviderVersion } from "../provider.ts";
import type { ProviderExtensionOptions } from "../../provider-extensions/ProviderExtensionRegistry.ts";

import type { ProviderBranchRuleEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderBranchRuleEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

/** Configured rule values whose meaning is shared across provider implementations. */
export interface BranchRuleData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
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
  readonly native: ProviderBranchRuleEntityNative<TProvider, TVersion, "configuredRule", TRegistry>;
}

/** Effective enforcement resolved by the provider for one concrete branch. */
export interface EffectiveBranchProtectionData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly branch: string;
  readonly protected: boolean;
  readonly ruleName?: string;
  readonly statusChecksRequired?: boolean;
  readonly statusCheckContexts: readonly string[];
  readonly requiredApprovals?: number;
  readonly currentUserCanPush?: boolean;
  readonly currentUserCanMerge?: boolean;
  readonly native: ProviderBranchRuleEntityNative<
    TProvider,
    TVersion,
    "effectiveProtection",
    TRegistry
  >;
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

export type BranchRuleOrderExtension<
  TProvider extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ProviderExtensionOptions<
  "branchRules.setOrder",
  TProvider,
  TRegistry
>;

export interface BranchRuleOrderOptions<
  TProvider extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends OperationOptions {
  readonly extension?: BranchRuleOrderExtension<TProvider, TRegistry>;
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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly branchRuleSupport: BranchRuleCapabilitySupport;
  listBranchRules(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    options: ListBranchRulesOptions,
  ): Promise<readonly BranchRuleData<TProvider, TVersion, TRegistry>[]>;
  getBranchRule(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<BranchRuleData<TProvider, TVersion, TRegistry>>;
  createBranchRule(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: CreateBranchRuleInput,
    options?: OperationOptions,
  ): Promise<BranchRuleData<TProvider, TVersion, TRegistry>>;
  updateBranchRule(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    rule: BranchRuleData<TProvider, TVersion, TRegistry>,
    input: UpdateBranchRuleInput,
    options?: OperationOptions,
  ): Promise<BranchRuleData<TProvider, TVersion, TRegistry>>;
  deleteBranchRule(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    rule: BranchRuleData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
  getEffectiveBranchProtection(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    branch: string,
    options?: OperationOptions,
  ): Promise<EffectiveBranchProtectionData<TProvider, TVersion, TRegistry>>;
  setBranchRuleOrder(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    options: BranchRuleOrderOptions<TProvider, TRegistry>,
  ): Promise<void>;
}
