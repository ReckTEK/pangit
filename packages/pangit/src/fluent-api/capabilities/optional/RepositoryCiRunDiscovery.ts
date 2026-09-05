import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type { ValidationErrorContext } from "../../adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../../adapter-contract/pagination.ts";

import type {
  CiExecutionFilterStatus,
  CiRunDiscoveryAdapter,
  CiRunDiscoveryCapabilitySupport,
} from "../../adapter-contract/optional/ci-run-discovery.ts";
import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import {
  type CiArtifact,
  type CiJob,
  type CiRun,
  type CiWorkflow,
  createCiArtifact,
  createCiJob,
  createCiRun,
  createCiWorkflow,
} from "../../entities/optional/CiRunDiscovery.ts";

export interface ListCiRunsOptions extends PageRequest {
  readonly workflowPath?: string;
  readonly headSha?: string;
  readonly branch?: string;
  readonly event?: string;
  readonly status?: CiExecutionFilterStatus;
}

export interface ListCiJobsOptions extends PageRequest {
  readonly status?: CiExecutionFilterStatus;
}

export interface RepositoryCiRunDiscovery<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly support: CiRunDiscoveryCapabilitySupport;
  workflow(
    id: string,
    options?: OperationOptions,
  ): Promise<CiWorkflow<TProvider, TVersion, TRegistry>>;
  runs(options?: ListCiRunsOptions): Promise<Page<CiRun<TProvider, TVersion, TRegistry>>>;
  run(id: string, options?: OperationOptions): Promise<CiRun<TProvider, TVersion, TRegistry>>;
  jobs(
    runId: string,
    options?: ListCiJobsOptions,
  ): Promise<Page<CiJob<TProvider, TVersion, TRegistry>>>;
  job(id: string, options?: OperationOptions): Promise<CiJob<TProvider, TVersion, TRegistry>>;
  findArtifact(
    runId: string,
    name: string,
    options?: OperationOptions,
  ): Promise<CiArtifact<TProvider, TVersion, TRegistry> | undefined>;
  artifact(
    id: string,
    options?: OperationOptions,
  ): Promise<CiArtifact<TProvider, TVersion, TRegistry>>;
}

export function createRepositoryCiRunDiscovery<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: CiRunDiscoveryAdapter<TProvider, TVersion, TRegistry>,
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryCiRunDiscovery<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    support: adapter.ciRunDiscoverySupport,
    async workflow(id: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "getCiWorkflow");
      return createCiWorkflow(
        await adapter.getCiWorkflow(
          repository,
          requireIdentity(id, "workflow id", context),
          options,
        ),
      );
    },
    async runs(options: ListCiRunsOptions = {}) {
      const context = adapterValidationContext(adapter, "listCiRuns");
      validatePageLimit(options, context);
      const page = await adapter.listCiRuns(repository, {
        ...resolvePageRequest(options, 50, context),
        ...(options.workflowPath === undefined
          ? {}
          : { workflowPath: requireIdentity(options.workflowPath, "workflow path", context) }),
        ...(options.headSha === undefined
          ? {}
          : { headSha: requireIdentity(options.headSha, "workflow head SHA", context) }),
        ...(options.branch === undefined
          ? {}
          : { branch: requireIdentity(options.branch, "workflow branch", context) }),
        ...(options.event === undefined
          ? {}
          : { event: requireIdentity(options.event, "workflow event", context) }),
        ...(options.status === undefined ? {} : { status: options.status }),
      });
      return createPage(page.items.map(createCiRun), page);
    },
    async run(id: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "getCiRun");
      return createCiRun(
        await adapter.getCiRun(
          repository,
          requireIdentity(id, "workflow run id", context),
          options,
        ),
      );
    },
    async jobs(runId: string, options: ListCiJobsOptions = {}) {
      const context = adapterValidationContext(adapter, "listCiRunJobs");
      validatePageLimit(options, context);
      const page = await adapter.listCiRunJobs(
        repository,
        requireIdentity(runId, "workflow run id", context),
        {
          ...resolvePageRequest(options, 50, context),
          ...(options.status === undefined ? {} : { status: options.status }),
        },
      );
      return createPage(page.items.map(createCiJob), page);
    },
    async job(id: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "getCiJob");
      return createCiJob(
        await adapter.getCiJob(
          repository,
          requireIdentity(id, "workflow job id", context),
          options,
        ),
      );
    },
    async findArtifact(runId: string, name: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "findCiRunArtifact");
      const found = await adapter.findCiRunArtifact(
        repository,
        requireIdentity(runId, "workflow run id", context),
        requireIdentity(name, "artifact name", context),
        options,
      );
      return found === undefined ? undefined : createCiArtifact(found);
    },
    async artifact(id: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "getCiArtifact");
      return createCiArtifact(
        await adapter.getCiArtifact(
          repository,
          requireIdentity(id, "artifact id", context),
          options,
        ),
      );
    },
  });
}

function adapterValidationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: CiRunDiscoveryAdapter<TProvider, TVersion, TRegistry>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  const identity = adapter as CiRunDiscoveryAdapter<TProvider, TVersion, TRegistry> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  };
  return {
    operation,
    ...(identity.provider === undefined ? {} : { provider: identity.provider }),
    ...(identity.version === undefined ? {} : { version: identity.version }),
  };
}

function validatePageLimit(request: PageRequest, context: ValidationErrorContext): void {
  if (request.limit !== undefined) {
    requirePositiveInteger(request.limit, "page limit", context);
  }
}
