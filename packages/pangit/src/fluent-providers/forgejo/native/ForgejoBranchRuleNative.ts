import type {
  Branch as Branch15,
  BranchProtection as BranchProtection15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  Branch as Branch16,
  BranchProtection as BranchProtection16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoBranchRuleEntityKind = "configuredRule" | "effectiveProtection";

type Forgejo15BranchRulePayloads = {
  configuredRule: BranchProtection15;
  effectiveProtection: Branch15;
};

type Forgejo16BranchRulePayloads = {
  configuredRule: BranchProtection16;
  effectiveProtection: Branch16;
};

/** Exact generated branch-rule payload selected by kind and Forgejo version. */
export type ForgejoBranchRuleEntityPayload<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoBranchRuleEntityKind,
> = TVersion extends "15.0.7" ? Forgejo15BranchRulePayloads[TKind]
  : Forgejo16BranchRulePayloads[TKind];

export type ForgejoBranchRuleEntityNativeContext<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoBranchRuleEntityKind,
> = Readonly<
  & { client: ForgejoClient<TVersion> }
  & { [TKey in TKind]: ForgejoBranchRuleEntityPayload<TVersion, TKind> }
>;

/** Exact native door retained by configured rules and effective branch protection. */
export interface ForgejoBranchRuleEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoBranchRuleEntityKind,
> {
  forgejo<TResult>(
    use: (
      context: ForgejoBranchRuleEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoBranchRuleEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoBranchRuleEntityKind,
>(
  kind: TKind,
  client: ForgejoClient<TVersion>,
  payload: ForgejoBranchRuleEntityPayload<TVersion, TKind>,
): ForgejoBranchRuleEntityNative<TVersion, TKind> {
  const context = Object.freeze({
    client,
    [kind]: payload,
  }) as ForgejoBranchRuleEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoBranchRuleEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
