import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  CiJobData,
  ListCiJobsRequest,
} from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import {
  NotFoundError,
  OperationTimeoutError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoCiEntityNative,
  type ForgejoCiEntityPayload,
} from "../native/ForgejoCiRunDiscoveryNative.ts";
import {
  decodeForgejoPageCursor,
  encodeForgejoPageCursor,
  requestForgejoBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import { requireJobArtifactClient } from "./support.ts";
import { type AnyJob, isJobPayload, parseForgejoId } from "./validate-payload.ts";
import {
  normalizeConclusion,
  normalizeExecutionStatus,
  toForgejoStatuses,
} from "./execution-state.ts";

/** Forgejo returns all jobs of one run. Bound the result and paginate that exact run locally. */
async function readRunJobs<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V, ForgejoProviderTypes>,
  runId: string,
  operation: string,
  signal?: AbortSignal,
): Promise<readonly AnyJob[]> {
  const client = await requireJobArtifactClient(context, operation);
  const payload = await requestForgejoBody<readonly AnyJob[], V>(
    context,
    { universal: operation, native: "ListActionRunJobs" },
    () =>
      client.listActionRunJobs({
        path: { ...repositoryPath(repository), run_id: parseForgejoId(runId, "run id") },
      }, requestOptions(signal)),
    signal,
    (value): value is readonly AnyJob[] => Array.isArray(value) && value.every(isJobPayload),
  );
  if (payload.length > 1000) {
    throw new OperationTimeoutError("Run job discovery exceeds 1000 jobs", {
      provider: "forgejo",
      version: context.version,
      operation,
    });
  }
  return payload;
}

export async function listForgejoCiRunJobs<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V, ForgejoProviderTypes>,
  runId: string,
  request: ListCiJobsRequest,
): Promise<Page<CiJobData<"forgejo", V, ForgejoProviderTypes>>> {
  const operation = { universal: "listCiRunJobs", native: "ListActionRunJobs" } as const;
  const cursor = decodeForgejoPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const jobs = (await readRunJobs(context, repository, runId, operation.universal, request.signal))
    .filter((job) =>
      request.status === undefined ||
      toForgejoStatuses(request.status).some((status) => status === job.status)
    );
  const offset = (cursor.page - 1) * limit;
  const client = await context.client();
  return createPage(
    jobs.slice(offset, offset + limit).map((job) => normalizeForgejoCiJob(client, job)),
    {
      totalCount: jobs.length,
      ...(offset + limit < jobs.length
        ? {
          nextCursor: encodeForgejoPageCursor({ page: cursor.page + 1, effectiveLimit: limit }, {
            version: context.version,
            operation,
          }),
        }
        : {}),
    },
  );
}

/** Run-qualified identities allow exact lookup without scanning unrelated runs. */
export async function getForgejoCiJob<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V, ForgejoProviderTypes>,
  jobId: string,
  options: OperationOptions = {},
): Promise<CiJobData<"forgejo", V, ForgejoProviderTypes>> {
  const match = /^run:([1-9][0-9]*):job:([1-9][0-9]*)$/.exec(jobId);
  if (!match) throw new TypeError("Forgejo job identity must be run:<run ID>:job:<job ID>");
  const jobs = await readRunJobs(context, repository, match[1], "getCiJob", options.signal);
  const job = jobs.find((job) => String(job.id) === match[2]);
  if (!job) {
    throw new NotFoundError(`Job ${jobId} was not found`, {
      provider: "forgejo",
      version: context.version,
      operation: "getCiJob",
    });
  }
  return normalizeForgejoCiJob(await context.client(), job);
}

export function normalizeForgejoCiJob<V extends ForgejoVersion>(
  client: ForgejoClient<V>,
  payload: ForgejoCiEntityPayload<V, "job">,
): CiJobData<"forgejo", V, ForgejoProviderTypes> {
  const conclusion = normalizeConclusion(payload.status);
  return Object.freeze({
    id: `run:${payload.run_id}:job:${payload.id}`,
    runId: String(payload.run_id),
    ...(payload.name === undefined ? {} : { name: payload.name }),
    status: normalizeExecutionStatus(payload.status),
    ...(conclusion === undefined ? {} : { conclusion }),
    ...(payload.status === undefined ? {} : { providerStatus: payload.status }),
    labels: Object.freeze([...(payload.runs_on ?? [])]),
    native: createForgejoCiEntityNative("job", client, payload),
  });
}
