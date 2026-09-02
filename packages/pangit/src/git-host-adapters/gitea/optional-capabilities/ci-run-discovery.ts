import type {
  CiArtifactData,
  CiExecutionConclusion,
  CiExecutionFilterStatus,
  CiExecutionStatus,
  CiJobData,
  CiRunData,
  CiRunDiscoveryCapabilitySupport,
  CiWorkflowData,
  CiWorkflowState,
  ListCiJobsRequest,
  ListCiRunsRequest,
} from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import {
  createGiteaCiEntityNative,
  type GiteaCiEntityPayload,
} from "../native/GiteaCiRunDiscoveryNative.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  encodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../response.ts";

type AnyWorkflow = GiteaCiEntityPayload<GiteaVersion, "workflow">;
type AnyRun = GiteaCiEntityPayload<GiteaVersion, "run">;
type AnyJob = GiteaCiEntityPayload<GiteaVersion, "job">;
type AnyArtifact = GiteaCiEntityPayload<GiteaVersion, "artifact">;

export const giteaCiRunDiscoverySupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    "get-workflow": "direct",
    "list-runs": "one-page",
    "get-run": "direct",
    "list-run-jobs": "one-page",
    "get-job": "direct",
    "find-run-artifact": "direct",
    "get-artifact": "direct",
  }),
  workflowListing: "native-only-unbounded",
  artifactListing: "native-only-unbounded",
  mutations: "native-only",
}) satisfies CiRunDiscoveryCapabilitySupport;

/** Directly read a known workflow ID or workflow path. */
export async function getGiteaCiWorkflow<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  workflowId: string,
  options: OperationOptions = {},
): Promise<CiWorkflowData<"gitea", TVersion>> {
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

/** Read one repository-wide provider page and filter only within that page. */
export async function listGiteaCiRuns<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ListCiRunsRequest,
): Promise<Page<CiRunData<"gitea", TVersion>>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  runId: string,
  options: OperationOptions = {},
): Promise<CiRunData<"gitea", TVersion>> {
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

/** Fetch exactly one requested page of jobs for a known run. */
export async function listGiteaCiRunJobs<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  runId: string,
  request: ListCiJobsRequest,
): Promise<Page<CiJobData<"gitea", TVersion>>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  jobId: string,
  options: OperationOptions = {},
): Promise<CiJobData<"gitea", TVersion>> {
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

/** Find a named artifact for one known run without scanning other runs or artifacts. */
export async function findGiteaCiRunArtifact<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  runId: string,
  name: string,
  options: OperationOptions = {},
): Promise<CiArtifactData<"gitea", TVersion> | undefined> {
  const operation = { universal: "findCiRunArtifact", native: "getArtifactsOfRun" } as const;
  const artifactName = requireIdentity(name, "artifact name");
  const id = parseGiteaId(runId, "workflow run id");
  const client = await context.client();
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.getArtifactsOfRun(
        {
          path: {
            ...repositoryPath(repository),
            run: id,
          },
          query: { name: artifactName },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  const wrapper = requireArtifactList(context, operation.universal, response.body);
  const exact = wrapper.items.filter((artifact) => artifact.name === artifactName);
  if (exact.length > 1) {
    throw invariant(context, operation.universal, "returned duplicate exact artifact names");
  }
  return exact[0] === undefined ? undefined : normalizeGiteaCiArtifact(client, exact[0]);
}

/** Directly read one artifact by exact ID. */
export async function getGiteaCiArtifact<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  artifactId: string,
  options: OperationOptions = {},
): Promise<CiArtifactData<"gitea", TVersion>> {
  const operation = { universal: "getCiArtifact", native: "getArtifact" } as const;
  const id = requireIdentity(artifactId, "artifact id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyArtifact, TVersion>(
    context,
    operation,
    () =>
      client.getArtifact(
        {
          path: {
            ...repositoryPath(repository),
            artifact_id: id,
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isArtifactPayload,
  );
  return normalizeGiteaCiArtifact(client, payload);
}

export function normalizeGiteaCiWorkflow<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "workflow">,
): CiWorkflowData<"gitea", TVersion> {
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

export function normalizeGiteaCiRun<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "run">,
): CiRunData<"gitea", TVersion> {
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

export function normalizeGiteaCiJob<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "job">,
): CiJobData<"gitea", TVersion> {
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

export function normalizeGiteaCiArtifact<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "artifact">,
): CiArtifactData<"gitea", TVersion> {
  if (!isArtifactPayload(payload)) throw new TypeError("malformed Gitea artifact payload");
  return Object.freeze({
    id: String(payload.id),
    ...(payload.workflow_run?.id === undefined ? {} : { runId: String(payload.workflow_run.id) }),
    ...(payload.name === undefined ? {} : { name: payload.name }),
    ...(payload.size_in_bytes === undefined
      ? {}
      : { size: safeInteger(payload.size_in_bytes, true) }),
    ...(payload.expired === undefined ? {} : { expired: payload.expired }),
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.expires_at === undefined ? {} : { expiresAt: payload.expires_at }),
    ...(payload.url === undefined ? {} : { url: payload.url }),
    native: createGiteaCiEntityNative("artifact", client, payload),
  });
}

function requireRunList<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { items: readonly AnyRun[]; totalCount?: number } {
  if (typeof value !== "object" || value === null) {
    throw invariant(context, operation, "returned a malformed run list");
  }
  const wrapper = value as { workflow_runs?: unknown; total_count?: unknown };
  if (!Array.isArray(wrapper.workflow_runs) || !wrapper.workflow_runs.every(isRunPayload)) {
    throw invariant(context, operation, "returned a malformed run list");
  }
  return {
    items: wrapper.workflow_runs,
    ...optionalTotal(context, operation, wrapper.total_count),
  };
}

function requireJobList<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { items: readonly AnyJob[]; totalCount?: number } {
  if (typeof value !== "object" || value === null) {
    throw invariant(context, operation, "returned a malformed job list");
  }
  const wrapper = value as { jobs?: unknown; total_count?: unknown };
  if (!Array.isArray(wrapper.jobs) || !wrapper.jobs.every(isJobPayload)) {
    throw invariant(context, operation, "returned a malformed job list");
  }
  return { items: wrapper.jobs, ...optionalTotal(context, operation, wrapper.total_count) };
}

function requireArtifactList<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { items: readonly AnyArtifact[] } {
  if (typeof value !== "object" || value === null) {
    throw invariant(context, operation, "returned a malformed artifact list");
  }
  const wrapper = value as { artifacts?: unknown };
  if (!Array.isArray(wrapper.artifacts) || !wrapper.artifacts.every(isArtifactPayload)) {
    throw invariant(context, operation, "returned a malformed artifact list");
  }
  return { items: wrapper.artifacts };
}

function isWorkflowPayload(value: unknown): value is AnyWorkflow {
  if (typeof value !== "object" || value === null) return false;
  const workflow = value as AnyWorkflow;
  return typeof workflow.id === "string" && workflow.id.length > 0;
}

function isRunPayload(value: unknown): value is AnyRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as AnyRun;
  return (typeof run.id === "number" || typeof run.id === "bigint") && run.id > 0 &&
    optionalSafeInteger(run.run_number, false) && optionalSafeInteger(run.run_attempt, true);
}

function isJobPayload(value: unknown): value is AnyJob {
  if (typeof value !== "object" || value === null) return false;
  const job = value as AnyJob;
  return (typeof job.id === "number" || typeof job.id === "bigint") && job.id > 0 &&
    (job.labels === undefined ||
      (Array.isArray(job.labels) && job.labels.every((label) => typeof label === "string")));
}

function isArtifactPayload(value: unknown): value is AnyArtifact {
  if (typeof value !== "object" || value === null) return false;
  const artifact = value as AnyArtifact;
  return (typeof artifact.id === "number" || typeof artifact.id === "bigint") && artifact.id > 0 &&
    optionalSafeInteger(artifact.size_in_bytes, true);
}

function normalizeWorkflowState(value?: string): CiWorkflowState {
  const state = value?.toLowerCase();
  if (state === "active") return "active";
  if (state === "disabled" || state === "disabled_manually") return "disabled";
  return "unknown";
}

function normalizeExecutionStatus(status?: string, conclusion?: string): CiExecutionStatus {
  const value = status?.toLowerCase();
  if (value === "pending") return "pending";
  if (value === "queued" || value === "waiting" || value === "blocked") return "queued";
  if (value === "running" || value === "in_progress") return "running";
  if (
    value === "completed" || conclusion !== undefined || value === "success" ||
    value === "failure" || value === "cancelled" || value === "canceled" || value === "skipped"
  ) return "completed";
  return "unknown";
}

function normalizeConclusion(
  conclusion?: string,
  status?: string,
): CiExecutionConclusion | undefined {
  const value = (conclusion ?? status)?.toLowerCase().replaceAll("_", "-");
  if (
    value === undefined || value === "pending" || value === "queued" || value === "running" ||
    value === "in-progress"
  ) return undefined;
  if (value === "canceled") return "cancelled";
  if (
    value === "success" || value === "failure" || value === "cancelled" || value === "skipped" ||
    value === "neutral" || value === "timed-out" || value === "action-required"
  ) return value;
  return "unknown";
}

function toGiteaStatus(status: CiExecutionFilterStatus): string {
  return status === "running" ? "in_progress" : status;
}

function optionalTotal<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { totalCount?: number } {
  if (value === undefined) return {};
  try {
    return { totalCount: safeInteger(value, true) };
  } catch {
    throw invariant(context, operation, "returned an invalid total count");
  }
}

function safeInteger(value: unknown, allowZero = false): number {
  const number = typeof value === "bigint" ? Number(value) : value;
  if (
    typeof number !== "number" || !Number.isSafeInteger(number) ||
    (allowZero ? number < 0 : number < 1)
  ) {
    throw new TypeError("Gitea returned an invalid integer");
  }
  return number;
}

function optionalSafeInteger(value: unknown, allowZero: boolean): boolean {
  if (value === undefined) return true;
  try {
    safeInteger(value, allowZero);
    return true;
  } catch {
    return false;
  }
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  detail: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${detail}`, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}

function wrappedPagination<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: Parameters<typeof giteaPagination<TVersion>>[2],
  cursor: ReturnType<typeof decodeGiteaPageCursor>,
  requestedLimit: number,
  itemCount: number,
  wrappedTotal?: number,
): { nextCursor?: string; totalCount?: number } {
  const headerMetadata = giteaPagination(
    context,
    operation,
    response,
    cursor,
    requestedLimit,
    itemCount,
  );
  const totalCount = headerMetadata.totalCount ?? wrappedTotal;
  if (headerMetadata.nextCursor !== undefined || totalCount === undefined) {
    return { ...headerMetadata, ...(totalCount === undefined ? {} : { totalCount }) };
  }
  const effectiveLimit = cursor.effectiveLimit ??
    (itemCount > 0 && itemCount < requestedLimit && totalCount > itemCount
      ? itemCount
      : requestedLimit);
  const consumed = (cursor.page - 1) * effectiveLimit + itemCount;
  return {
    ...(consumed < totalCount && itemCount > 0
      ? {
        nextCursor: encodeGiteaPageCursor(
          { page: cursor.page + 1, effectiveLimit },
          { version: context.version, operation },
        ),
      }
      : {}),
    totalCount,
  };
}

function normalizeWorkflowPath(value: string): string {
  const path = requireIdentity(value, "workflow path").replace(/^\/+/, "");
  const revisionMarker = path.lastIndexOf("@refs/");
  const sourcePath = revisionMarker < 0 ? path : path.slice(0, revisionMarker);
  return sourcePath.startsWith(".gitea/workflows/") ? sourcePath : `.gitea/workflows/${sourcePath}`;
}

function parseGiteaId(value: string, name: string): bigint {
  const normalized = requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(normalized)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(normalized);
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}
