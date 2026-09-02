import type {
  Branch as Branch126,
  BranchProtection as BranchProtection126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  Branch as Branch127,
  BranchProtection as BranchProtection127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaBranchRuleEntityKind = "configuredRule" | "effectiveProtection";

type Gitea126BranchRulePayloads = {
  configuredRule: BranchProtection126;
  effectiveProtection: Branch126;
};

type Gitea127BranchRulePayloads = {
  configuredRule: BranchProtection127;
  effectiveProtection: Branch127;
};

/** Exact generated branch-rule payload selected by kind and Gitea version. */
export type GiteaBranchRuleEntityPayload<
  TVersion extends GiteaVersion,
  TKind extends GiteaBranchRuleEntityKind,
> = TVersion extends "1.26.4" ? Gitea126BranchRulePayloads[TKind]
  : Gitea127BranchRulePayloads[TKind];

export type GiteaBranchRuleEntityNativeContext<
  TVersion extends GiteaVersion,
  TKind extends GiteaBranchRuleEntityKind,
> = Readonly<
  & { client: GiteaClient<TVersion> }
  & { [TKey in TKind]: GiteaBranchRuleEntityPayload<TVersion, TKind> }
>;

/** Exact native door retained by configured rules and effective branch protection. */
export interface GiteaBranchRuleEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaBranchRuleEntityKind,
> {
  gitea<TResult>(
    use: (
      context: GiteaBranchRuleEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaBranchRuleEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaBranchRuleEntityKind,
>(
  kind: TKind,
  client: GiteaClient<TVersion>,
  payload: GiteaBranchRuleEntityPayload<TVersion, TKind>,
): GiteaBranchRuleEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as GiteaBranchRuleEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaBranchRuleEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
