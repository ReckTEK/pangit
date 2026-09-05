import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type {
  BranchRuleData,
  EffectiveBranchProtectionData,
  ProviderBranchRuleEntityNative,
} from "../../adapter-contract/optional/branch-rules.ts";

export interface BranchRule<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends Omit<BranchRuleData<TProvider, TVersion, TRegistry>, "native" | "statusCheckContexts"> {
  readonly statusCheckContexts: readonly string[];
  readonly native: ProviderBranchRuleEntityNative<TProvider, TVersion, "configuredRule", TRegistry>;
}

export interface EffectiveBranchProtection<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends
  Omit<
    EffectiveBranchProtectionData<TProvider, TVersion, TRegistry>,
    "native" | "statusCheckContexts"
  > {
  readonly statusCheckContexts: readonly string[];
  readonly native: ProviderBranchRuleEntityNative<
    TProvider,
    TVersion,
    "effectiveProtection",
    TRegistry
  >;
}

export function createBranchRule<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: BranchRuleData<TProvider, TVersion, TRegistry>,
): BranchRule<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    ...data,
    statusCheckContexts: Object.freeze([...data.statusCheckContexts]),
    native: data.native,
  });
}

export function createEffectiveBranchProtection<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: EffectiveBranchProtectionData<TProvider, TVersion, TRegistry>,
): EffectiveBranchProtection<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    ...data,
    statusCheckContexts: Object.freeze([...data.statusCheckContexts]),
    native: data.native,
  });
}
