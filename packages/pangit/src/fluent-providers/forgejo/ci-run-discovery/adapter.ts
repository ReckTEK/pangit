import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { findForgejoCiRunArtifact, getForgejoCiArtifact } from "./artifacts.ts";

import { getForgejoCiJob, listForgejoCiRunJobs } from "./jobs.ts";
import { getForgejoCiRun, listForgejoCiRuns } from "./runs.ts";
import { getForgejoCiWorkflow } from "./workflows.ts";
import { forgejoCiRunDiscoverySupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "ciRunDiscoverySupport"
  | "getCiWorkflow"
  | "listCiRuns"
  | "getCiRun"
  | "listCiRunJobs"
  | "getCiJob"
  | "findCiRunArtifact"
  | "getCiArtifact"
> {
  return {
    ciRunDiscoverySupport: forgejoCiRunDiscoverySupport(context.version),
    getCiWorkflow: (repository, workflowId, options) =>
      getForgejoCiWorkflow(context, repository, workflowId, options),
    listCiRuns: (repository, request) => listForgejoCiRuns(context, repository, request),
    getCiRun: (repository, runId, options) => getForgejoCiRun(context, repository, runId, options),
    listCiRunJobs: (repository, runId, request) =>
      listForgejoCiRunJobs(context, repository, runId, request),
    getCiJob: (repository, jobId, options) => getForgejoCiJob(context, repository, jobId, options),
    findCiRunArtifact: (
      repository,
      runId,
      name,
      options,
    ) => findForgejoCiRunArtifact(context, repository, runId, name, options),
    getCiArtifact: (repository, artifactId, options) =>
      getForgejoCiArtifact(context, repository, artifactId, options),
  };
}
