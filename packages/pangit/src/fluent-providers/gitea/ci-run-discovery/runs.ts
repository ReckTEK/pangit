import type { GiteaProviderTypes } from "../provider-types.ts";
import type {
  CiRunData,
  ListCiRunsRequest,
} from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";

import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaCiEntityNative,
  type GiteaCiEntityPayload,
} from "../native/GiteaCiRunDiscoveryNative.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  requestGitea,
  requestGiteaBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import { normalizeConclusion, normalizeExecutionStatus, toGiteaStatus } from "./execution-state.ts";

import {
  type AnyRun,
  isRunPayload,
  parseGiteaId,
  requireRunList,
  safeInteger,
} from "./validate-payload.ts";
import { normalizeWorkflowPath } from "./workflows.ts";
import { wrappedPagination } from "./pagination.ts";

/** Read one repository-wide provider page and filter only within that page. */
export async function listGiteaCiRuns<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  request: ListCiRunsRequest,
): Promise<Page<CiRunData<"gitea", TVersion, GiteaProviderTypes>>> {
  const operation = { universal: "listCiRuns", native: "getWorkflowRuns" } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.getWorkflowRuns(
        {
          path: repositoryPath(repository),
          query: {
            page: cursor.page,
            limit,
            ...(request.headSha === undefined
              ? {}
              : { head_sha: requireIdentity(request.headSha, "workflow head SHA") }),
            ...(request.branch === undefined
              ? {}
              : { branch: requireIdentity(request.branch, "workflow branch") }),
            ...(request.event === undefined
              ? {}
              : { event: requireIdentity(request.event, "workflow event") }),
            ...(request.status === undefined ? {} : { status: toGiteaStatus(request.status) }),
          },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const wrapper = requireRunList(context, operation.universal, response.body);
  const requestedPath = request.workflowPath === undefined
    ? undefined
    : normalizeWorkflowPath(requireIdentity(request.workflowPath, "workflow path"));
  const selected = requestedPath === undefined
    ? wrapper.items
    : wrapper.items.filter((run) =>
      run.path !== undefined && normalizeWorkflowPath(run.path) === requestedPath
    );
  const pageMetadata = wrappedPagination(
    context,
    operation,
    response,
    cursor,
    limit,
    wrapper.items.length,
    wrapper.totalCount,
  );
  return createPage(
    selected.map((payload) => normalizeGiteaCiRun(client, payload)),
    requestedPath === undefined ? pageMetadata : {
      ...(pageMetadata.nextCursor === undefined ? {} : { nextCursor: pageMetadata.nextCursor }),
    },
  );
}

/** Directly read one known workflow run. */
export async function getGiteaCiRun<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  runId: string,
  options: OperationOptions = {},
): Promise<CiRunData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getCiRun", native: "GetWorkflowRun" } as const;
  const id = parseGiteaId(runId, "workflow run id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyRun, TVersion>(
    context,
    operation,
    () =>
      client.getWorkflowRun(
        { path: { ...repositoryPath(repository), run: id } },
        requestOptions(options.signal),
      ),
    options.signal,
    isRunPayload,
  );
  return normalizeGiteaCiRun(client, payload);
}

export function normalizeGiteaCiRun<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "run">,
): CiRunData<"gitea", TVersion, GiteaProviderTypes> {
  if (!isRunPayload(payload)) throw new TypeError("malformed Gitea workflow run payload");
  const conclusion = normalizeConclusion(payload.conclusion, payload.status);
  return Object.freeze({
    id: String(payload.id),
    ...(payload.path === undefined ? {} : { workflowPath: normalizeWorkflowPath(payload.path) }),
    ...(payload.display_title === undefined ? {} : { title: payload.display_title }),
    ...(payload.run_number === undefined ? {} : { runNumber: safeInteger(payload.run_number) }),
    ...(payload.run_attempt === undefined
      ? {}
      : { attempt: safeInteger(payload.run_attempt, true) }),
    ...(payload.event === undefined ? {} : { event: payload.event }),
    ...(payload.head_branch === undefined ? {} : { branch: payload.head_branch }),
    ...(payload.head_sha === undefined ? {} : { sha: payload.head_sha }),
    status: normalizeExecutionStatus(payload.status, payload.conclusion),
    ...(conclusion === undefined ? {} : { conclusion }),
    ...(payload.status === undefined ? {} : { providerStatus: payload.status }),
    ...(payload.conclusion === undefined ? {} : { providerConclusion: payload.conclusion }),
    ...(payload.actor?.login === undefined ? {} : { actor: payload.actor.login }),
    ...(payload.started_at === undefined ? {} : { startedAt: payload.started_at }),
    ...(payload.completed_at === undefined ? {} : { completedAt: payload.completed_at }),
    ...(payload.html_url === undefined ? {} : { url: payload.html_url }),
    native: createGiteaCiEntityNative("run", client, payload),
  });
}
