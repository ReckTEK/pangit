import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import type {
  CiArtifactData,
  CiExecutionConclusion,
  CiExecutionStatus,
  CiJobData,
  CiRunData,
  CiWorkflowData,
  CiWorkflowState,
  ProviderCiEntityNative,
} from "../../adapter-contract/optional/ci-run-discovery.ts";

export interface CiWorkflow<
  TProvider extends FluentProvider,
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

export interface CiRun<
  TProvider extends FluentProvider,
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

export interface CiJob<
  TProvider extends FluentProvider,
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

export interface CiArtifact<
  TProvider extends FluentProvider,
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

export function createCiWorkflow<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: CiWorkflowData<TProvider, TVersion>): CiWorkflow<TProvider, TVersion> {
  return Object.freeze({ ...data });
}

export function createCiRun<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: CiRunData<TProvider, TVersion>): CiRun<TProvider, TVersion> {
  return Object.freeze({ ...data });
}

export function createCiJob<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: CiJobData<TProvider, TVersion>): CiJob<TProvider, TVersion> {
  return Object.freeze({ ...data, labels: Object.freeze([...data.labels]) });
}

export function createCiArtifact<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: CiArtifactData<TProvider, TVersion>): CiArtifact<TProvider, TVersion> {
  return Object.freeze({ ...data });
}
