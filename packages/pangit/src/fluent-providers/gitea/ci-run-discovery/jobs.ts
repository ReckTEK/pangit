import type { GiteaProviderTypes } from "../provider-types.ts";
import type {
  CiJobData,
  ListCiJobsRequest,
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
import { type AnyJob, isJobPayload, parseGiteaId, requireJobList } from "./validate-payload.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import { normalizeConclusion, normalizeExecutionStatus, toGiteaStatus } from "./execution-state.ts";

import { wrappedPagination } from "./pagination.ts";

/** Fetch exactly one requested page of jobs for a known run. */
export async function listGiteaCiRunJobs<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  runId: string,
  request: ListCiJobsRequest,
): Promise<Page<CiJobData<"gitea", TVersion, GiteaProviderTypes>>> {
  const operation = { universal: "listCiRunJobs", native: "listWorkflowRunJobs" } as const;
  const id = parseGiteaId(runId, "workflow run id");
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.listWorkflowRunJobs(
        {
          path: {
            ...repositoryPath(repository),
            run: id,
          },
          query: {
            page: cursor.page,
            limit,
            ...(request.status === undefined ? {} : { status: toGiteaStatus(request.status) }),
          },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const wrapper = requireJobList(context, operation.universal, response.body);
  return createPage(
    wrapper.items.map((payload) => normalizeGiteaCiJob(client, payload)),
    wrappedPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      wrapper.items.length,
      wrapper.totalCount,
    ),
  );
}

/** Directly read one job by exact ID. */
export async function getGiteaCiJob<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  jobId: string,
  options: OperationOptions = {},
): Promise<CiJobData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getCiJob", native: "getWorkflowJob" } as const;
  const id = requireIdentity(jobId, "workflow job id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyJob, TVersion>(
    context,
    operation,
    () =>
      client.getWorkflowJob(
        {
          path: {
            ...repositoryPath(repository),
            job_id: id,
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isJobPayload,
  );
  return normalizeGiteaCiJob(client, payload);
}

export function normalizeGiteaCiJob<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "job">,
): CiJobData<"gitea", TVersion, GiteaProviderTypes> {
  if (!isJobPayload(payload)) throw new TypeError("malformed Gitea workflow job payload");
  const conclusion = normalizeConclusion(payload.conclusion, payload.status);
  return Object.freeze({
    id: String(payload.id),
    ...(payload.run_id === undefined ? {} : { runId: String(payload.run_id) }),
    ...(payload.name === undefined ? {} : { name: payload.name }),
    ...(payload.head_sha === undefined ? {} : { sha: payload.head_sha }),
    status: normalizeExecutionStatus(payload.status, payload.conclusion),
    ...(conclusion === undefined ? {} : { conclusion }),
    ...(payload.status === undefined ? {} : { providerStatus: payload.status }),
    ...(payload.conclusion === undefined ? {} : { providerConclusion: payload.conclusion }),
    ...(payload.runner_name === undefined ? {} : { runnerName: payload.runner_name }),
    labels: Object.freeze([...(payload.labels ?? [])]),
    ...(payload.started_at === undefined ? {} : { startedAt: payload.started_at }),
    ...(payload.completed_at === undefined ? {} : { completedAt: payload.completed_at }),
    ...(payload.html_url === undefined ? {} : { url: payload.html_url }),
    native: createGiteaCiEntityNative("job", client, payload),
  });
}
