import type {
  ActionRun as ActionWorkflowRun15,
  ActionRunJob as ActionWorkflowJob15,
  ContentsResponse as ActionWorkflow15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  ActionArtifact as ActionArtifact16,
  ActionRun as ActionWorkflowRun16,
  ActionRunJob as ActionWorkflowJob16,
  ContentsResponse as ActionWorkflow16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoCiEntityKind = "workflow" | "run" | "job" | "artifact";

type Forgejo15CiPayloads = {
  workflow: ActionWorkflow15;
  run: ActionWorkflowRun15;
  job: ActionWorkflowJob15;
  artifact: never;
};

type Forgejo16CiPayloads = {
  workflow: ActionWorkflow16;
  run: ActionWorkflowRun16;
  job: ActionWorkflowJob16;
  artifact: ActionArtifact16;
};

/** Exact generated Actions payload selected by entity kind and Forgejo version. */
export type ForgejoCiEntityPayload<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoCiEntityKind,
> = TVersion extends "15.0.7" ? Forgejo15CiPayloads[TKind] : Forgejo16CiPayloads[TKind];

export type ForgejoCiEntityNativeContext<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoCiEntityKind,
> = Readonly<
  & { client: ForgejoClient<TVersion> }
  & { [TKey in TKind]: ForgejoCiEntityPayload<TVersion, TKind> }
>;

/** Forgejo-only native door for one workflow, run, job, or artifact. */
export interface ForgejoCiEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoCiEntityKind,
> {
  forgejo<TResult>(
    use: (context: ForgejoCiEntityNativeContext<TVersion, TKind>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Retain an exact Actions payload without another provider request. */
export function createForgejoCiEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoCiEntityKind,
>(
  kind: TKind,
  client: ForgejoClient<TVersion>,
  payload: ForgejoCiEntityPayload<TVersion, TKind>,
): ForgejoCiEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as ForgejoCiEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoCiEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
