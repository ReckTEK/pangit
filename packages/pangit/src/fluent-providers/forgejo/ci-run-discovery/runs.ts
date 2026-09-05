import type {
  CiRunData,
  ListCiRunsRequest,
} from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoCiEntityNative,
  type ForgejoCiEntityPayload,
} from "../native/ForgejoCiRunDiscoveryNative.ts";
import {
  decodeForgejoPageCursor,
  requestForgejo,
  requestForgejoBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  normalizeConclusion,
  normalizeExecutionStatus,
  toForgejoStatus,
} from "./execution-state.ts";
import {
  type AnyRun,
  isRecord,
  isRunPayload,
  parseForgejoId,
  safeInteger,
} from "./validate-payload.ts";
import { wrappedPagination } from "./pagination.ts";
import { normalizeWorkflowPath } from "./workflows.ts";

export async function listForgejoCiRuns<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V>,
  request: ListCiRunsRequest,
): Promise<Page<CiRunData<"forgejo", V>>> {
  const operation = { universal: "listCiRuns", native: "ListActionRuns" } as const;
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(context, operation, () =>
    client.listActionRuns({
      path: repositoryPath(repository),
      query: {
        page: cursor.page,
        limit,
        ...(request.workflowPath === undefined ? {} : {
          workflow_id: normalizeWorkflowPath(request.workflowPath).split("/").at(-1)!,
        }),
        ...(request.headSha === undefined ? {} : { head_sha: request.headSha }),
        ...(request.branch === undefined ? {} : {
          ref: request.branch.startsWith("refs/") ? request.branch : `refs/heads/${request.branch}`,
        }),
        ...(request.event === undefined ? {} : { event: [request.event] }),
        ...(request.status === undefined ? {} : { status: [toForgejoStatus(request.status)] }),
      },
    }, requestOptions(request.signal)), request.signal);
  const body = response.body;
  if (
    !isRecord(body) || !Array.isArray(body.workflow_runs) || !body.workflow_runs.every(isRunPayload)
  ) throw new TypeError("Malformed Forgejo run list");
  const total = body.total_count === undefined ? undefined : safeInteger(body.total_count, true);
  return createPage(
    body.workflow_runs.map((run) => normalizeForgejoCiRun(client, run)),
    wrappedPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      body.workflow_runs.length,
      total,
    ),
  );
}

export async function getForgejoCiRun<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V>,
  runId: string,
  options: OperationOptions = {},
): Promise<CiRunData<"forgejo", V>> {
  const client = await context.client();
  const payload = await requestForgejoBody<AnyRun, V>(
    context,
    { universal: "getCiRun", native: "ActionRun" },
    () =>
      client.actionRun({
        path: { ...repositoryPath(repository), run_id: parseForgejoId(runId, "run id") },
      }, requestOptions(options.signal)),
    options.signal,
    isRunPayload,
  );
  return normalizeForgejoCiRun(client, payload);
}

export function normalizeForgejoCiRun<V extends ForgejoVersion>(
  client: ForgejoClient<V>,
  payload: ForgejoCiEntityPayload<V, "run">,
): CiRunData<"forgejo", V> {
  const conclusion = normalizeConclusion(payload.status);
  return Object.freeze({
    id: String(payload.id),
    // The API normally supplies only a filename; do not invent its repository directory.
    ...(payload.workflow_id?.includes("/") ? { workflowPath: payload.workflow_id } : {}),
    ...(payload.title === undefined ? {} : { title: payload.title }),
    ...(payload.index_in_repo === undefined
      ? {}
      : { runNumber: safeInteger(payload.index_in_repo) }),
    ...(payload.event === undefined ? {} : { event: payload.event }),
    ...(payload.prettyref === undefined
      ? {}
      : { branch: payload.prettyref.replace(/^refs\/heads\//, "") }),
    ...(payload.commit_sha === undefined ? {} : { sha: payload.commit_sha }),
    status: normalizeExecutionStatus(payload.status),
    ...(conclusion === undefined ? {} : { conclusion }),
    ...(payload.status === undefined ? {} : { providerStatus: payload.status }),
    ...(payload.trigger_user?.login === undefined ? {} : { actor: payload.trigger_user.login }),
    ...(payload.started === undefined ? {} : { startedAt: payload.started }),
    ...(payload.stopped === undefined ? {} : { completedAt: payload.stopped }),
    ...(payload.html_url === undefined ? {} : { url: payload.html_url }),
    native: createForgejoCiEntityNative("run", client, payload),
  });
}
