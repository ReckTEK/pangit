import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import type {
  BranchRuleData,
  EffectiveBranchProtectionData,
  ProviderBranchRuleEntityNative,
} from "../../adapter-contract/optional/branch-rules.ts";

export interface BranchRule<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> extends Omit<BranchRuleData<TProvider, TVersion>, "native" | "statusCheckContexts"> {
  readonly statusCheckContexts: readonly string[];
  readonly native: ProviderBranchRuleEntityNative<TProvider, TVersion, "configuredRule">;
}

export interface EffectiveBranchProtection<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> extends
  Omit<
    EffectiveBranchProtectionData<TProvider, TVersion>,
    "native" | "statusCheckContexts"
  > {
  readonly statusCheckContexts: readonly string[];
  readonly native: ProviderBranchRuleEntityNative<TProvider, TVersion, "effectiveProtection">;
}

export function createBranchRule<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: BranchRuleData<TProvider, TVersion>): BranchRule<TProvider, TVersion> {
  return Object.freeze({
    ...data,
    statusCheckContexts: Object.freeze([...data.statusCheckContexts]),
    native: data.native,
  });
}

export function createEffectiveBranchProtection<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  data: EffectiveBranchProtectionData<TProvider, TVersion>,
): EffectiveBranchProtection<TProvider, TVersion> {
  return Object.freeze({
    ...data,
    statusCheckContexts: Object.freeze([...data.statusCheckContexts]),
    native: data.native,
  });
}
