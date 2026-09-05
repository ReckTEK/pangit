import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { findGiteaCiRunArtifact, getGiteaCiArtifact } from "./artifacts.ts";

import { getGiteaCiJob, listGiteaCiRunJobs } from "./jobs.ts";
import { getGiteaCiRun, listGiteaCiRuns } from "./runs.ts";
import { getGiteaCiWorkflow } from "./workflows.ts";
import { giteaCiRunDiscoverySupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
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
    ciRunDiscoverySupport: giteaCiRunDiscoverySupport,
    getCiWorkflow: (repository, workflowId, options) =>
      getGiteaCiWorkflow(context, repository, workflowId, options),
    listCiRuns: (repository, request) => listGiteaCiRuns(context, repository, request),
    getCiRun: (repository, runId, options) => getGiteaCiRun(context, repository, runId, options),
    listCiRunJobs: (repository, runId, request) =>
      listGiteaCiRunJobs(context, repository, runId, request),
    getCiJob: (repository, jobId, options) => getGiteaCiJob(context, repository, jobId, options),
    findCiRunArtifact: (
      repository,
      runId,
      name,
      options,
    ) => findGiteaCiRunArtifact(context, repository, runId, name, options),
    getCiArtifact: (repository, artifactId, options) =>
      getGiteaCiArtifact(context, repository, artifactId, options),
  };
}
