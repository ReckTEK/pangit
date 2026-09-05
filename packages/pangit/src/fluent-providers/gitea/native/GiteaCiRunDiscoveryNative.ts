import type {
  ActionArtifact as ActionArtifact126,
  ActionWorkflow as ActionWorkflow126,
  ActionWorkflowJob as ActionWorkflowJob126,
  ActionWorkflowRun as ActionWorkflowRun126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  ActionArtifact as ActionArtifact127,
  ActionWorkflow as ActionWorkflow127,
  ActionWorkflowJob as ActionWorkflowJob127,
  ActionWorkflowRun as ActionWorkflowRun127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaCiEntityKind = "workflow" | "run" | "job" | "artifact";

type Gitea126CiPayloads = {
  workflow: ActionWorkflow126;
  run: ActionWorkflowRun126;
  job: ActionWorkflowJob126;
  artifact: ActionArtifact126;
};

type Gitea127CiPayloads = {
  workflow: ActionWorkflow127;
  run: ActionWorkflowRun127;
  job: ActionWorkflowJob127;
  artifact: ActionArtifact127;
};

/** Exact generated Actions payload selected by entity kind and Gitea version. */
export type GiteaCiEntityPayload<
  TVersion extends GiteaVersion,
  TKind extends GiteaCiEntityKind,
> = TVersion extends "1.26.4" ? Gitea126CiPayloads[TKind] : Gitea127CiPayloads[TKind];

export type GiteaCiEntityNativeContext<
  TVersion extends GiteaVersion,
  TKind extends GiteaCiEntityKind,
> = Readonly<
  & { client: GiteaClient<TVersion> }
  & { [TKey in TKind]: GiteaCiEntityPayload<TVersion, TKind> }
>;

/** Gitea-only native door for one workflow, run, job, or artifact. */
export interface GiteaCiEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaCiEntityKind,
> {
  gitea<TResult>(
    use: (context: GiteaCiEntityNativeContext<TVersion, TKind>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Retain an exact Actions payload without another provider request. */
export function createGiteaCiEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaCiEntityKind,
>(
  kind: TKind,
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, TKind>,
): GiteaCiEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as GiteaCiEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaCiEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
