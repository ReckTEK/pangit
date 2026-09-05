import type { Provider, ProviderVersion } from "../provider.ts";
import type { ProviderCiEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest } from "../pagination.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderCiEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

export type CiWorkflowState = "active" | "disabled" | "unknown";
export type CiExecutionStatus = "pending" | "queued" | "running" | "completed" | "unknown";
export type CiExecutionConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "neutral"
  | "timed-out"
  | "action-required"
  | "unknown";

export interface CiWorkflowData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly name?: string;
  readonly path?: string;
  readonly state: CiWorkflowState;
  readonly providerState?: string;
  readonly url?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly native: ProviderCiEntityNative<TProvider, TVersion, "workflow">;
}

export interface CiRunData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly workflowPath?: string;
  readonly title?: string;
  readonly runNumber?: number;
  readonly attempt?: number;
  readonly event?: string;
  readonly branch?: string;
  readonly sha?: string;
  readonly status: CiExecutionStatus;
  readonly conclusion?: CiExecutionConclusion;
  readonly providerStatus?: string;
  readonly providerConclusion?: string;
  readonly actor?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly url?: string;
  readonly native: ProviderCiEntityNative<TProvider, TVersion, "run">;
}

export interface CiJobData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly runId?: string;
  readonly name?: string;
  readonly sha?: string;
  readonly status: CiExecutionStatus;
  readonly conclusion?: CiExecutionConclusion;
  readonly providerStatus?: string;
  readonly providerConclusion?: string;
  readonly runnerName?: string;
  readonly labels: readonly string[];
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly url?: string;
  readonly native: ProviderCiEntityNative<TProvider, TVersion, "job">;
}

export interface CiArtifactData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly runId?: string;
  readonly name?: string;
  readonly size?: number;
  readonly expired?: boolean;
  readonly createdAt?: string;
  readonly expiresAt?: string;
  readonly url?: string;
  readonly native: ProviderCiEntityNative<TProvider, TVersion, "artifact">;
}

export type CiExecutionFilterStatus =
  | "pending"
  | "queued"
  | "running"
  | "failure"
  | "success"
  | "skipped";

export interface ListCiRunsRequest extends ResolvedPageRequest {
  readonly workflowPath?: string;
  readonly headSha?: string;
  readonly branch?: string;
  readonly event?: string;
  readonly status?: CiExecutionFilterStatus;
}

export interface ListCiJobsRequest extends ResolvedPageRequest {
  readonly status?: CiExecutionFilterStatus;
}

export type CiRunDiscoveryOperation =
  | "get-workflow"
  | "list-runs"
  | "get-run"
  | "list-run-jobs"
  | "get-job"
  | "find-run-artifact"
  | "get-artifact";

/** Static support metadata; omitted unbounded endpoints remain native-only. */
export interface CiRunDiscoveryCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<
    Record<CiRunDiscoveryOperation, "direct" | "one-page" | "bounded">
  >;
  readonly workflowListing: "native-only-unbounded";
  readonly artifactListing: "native-only-unbounded";
  readonly mutations: "native-only";
}

/** Optional read-only workflow/run/job/artifact discovery contract. */
export interface CiRunDiscoveryAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly ciRunDiscoverySupport: CiRunDiscoveryCapabilitySupport;
  getCiWorkflow(
    repository: RepositoryData<TProvider, TVersion>,
    workflowId: string,
    options?: OperationOptions,
  ): Promise<CiWorkflowData<TProvider, TVersion>>;
  listCiRuns(
    repository: RepositoryData<TProvider, TVersion>,
    request: ListCiRunsRequest,
  ): Promise<Page<CiRunData<TProvider, TVersion>>>;
  getCiRun(
    repository: RepositoryData<TProvider, TVersion>,
    runId: string,
    options?: OperationOptions,
  ): Promise<CiRunData<TProvider, TVersion>>;
  listCiRunJobs(
    repository: RepositoryData<TProvider, TVersion>,
    runId: string,
    request: ListCiJobsRequest,
  ): Promise<Page<CiJobData<TProvider, TVersion>>>;
  getCiJob(
    repository: RepositoryData<TProvider, TVersion>,
    jobId: string,
    options?: OperationOptions,
  ): Promise<CiJobData<TProvider, TVersion>>;
  findCiRunArtifact(
    repository: RepositoryData<TProvider, TVersion>,
    runId: string,
    name: string,
    options?: OperationOptions,
  ): Promise<CiArtifactData<TProvider, TVersion> | undefined>;
  getCiArtifact(
    repository: RepositoryData<TProvider, TVersion>,
    artifactId: string,
    options?: OperationOptions,
  ): Promise<CiArtifactData<TProvider, TVersion>>;
}
