import type { GiteaProviderTypes } from "../provider-types.ts";
import type { CiWorkflowData } from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";

import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaCiEntityNative,
  type GiteaCiEntityPayload,
} from "../native/GiteaCiRunDiscoveryNative.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyWorkflow, isWorkflowPayload } from "./validate-payload.ts";

import { normalizeWorkflowState } from "./execution-state.ts";

/** Directly read a known workflow ID or workflow path. */
export async function getGiteaCiWorkflow<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  workflowId: string,
  options: OperationOptions = {},
): Promise<CiWorkflowData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getCiWorkflow", native: "ActionsGetWorkflow" } as const;
  const id = requireIdentity(workflowId, "workflow id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyWorkflow, TVersion>(
    context,
    operation,
    () =>
      client.actionsGetWorkflow(
        {
          path: {
            ...repositoryPath(repository),
            workflow_id: id,
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isWorkflowPayload,
  );
  return normalizeGiteaCiWorkflow(client, payload);
}

export function normalizeGiteaCiWorkflow<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "workflow">,
): CiWorkflowData<"gitea", TVersion, GiteaProviderTypes> {
  if (!isWorkflowPayload(payload)) throw new TypeError("malformed Gitea workflow payload");
  return Object.freeze({
    id: payload.id!,
    ...(payload.name === undefined ? {} : { name: payload.name }),
    ...(payload.path === undefined ? {} : { path: normalizeWorkflowPath(payload.path) }),
    state: normalizeWorkflowState(payload.state),
    ...(payload.state === undefined ? {} : { providerState: payload.state }),
    ...(payload.html_url === undefined ? {} : { url: payload.html_url }),
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.updated_at === undefined ? {} : { updatedAt: payload.updated_at }),
    native: createGiteaCiEntityNative("workflow", client, payload),
  });
}

export function normalizeWorkflowPath(value: string): string {
  const path = requireIdentity(value, "workflow path").replace(/^\/+/, "");
  const revisionMarker = path.lastIndexOf("@refs/");
  const sourcePath = revisionMarker < 0 ? path : path.slice(0, revisionMarker);
  return sourcePath.startsWith(".gitea/workflows/") ? sourcePath : `.gitea/workflows/${sourcePath}`;
}
