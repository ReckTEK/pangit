import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import { NotFoundError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { CiArtifactData } from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import {
  call,
  context,
  invalid,
  numericId,
  object,
  page,
  path,
  unavailable,
} from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { door } from "../native/door.ts";
import { artifact, job, run } from "./normalize.ts";

export function ciRunDiscovery<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
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
  const ops: Pick<
    Adapter<V>,
    | "ciRunDiscoverySupport"
    | "getCiWorkflow"
    | "listCiRuns"
    | "getCiRun"
    | "listCiRunJobs"
    | "getCiJob"
    | "findCiRunArtifact"
    | "getCiArtifact"
  > = {
    ciRunDiscoverySupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        "get-workflow": "direct",
        "list-runs": "one-page",
        "get-run": "direct",
        "list-run-jobs": "one-page",
        "get-job": "direct",
        "find-run-artifact": "bounded",
        "get-artifact": "direct",
      }),
      workflowListing: "native-only-unbounded",
      artifactListing: "native-only-unbounded",
      mutations: "native-only",
    }),
    getCiWorkflow: async (r, workflowId, o) => {
      const p = object(
        c,
        "getCiWorkflow",
        (await call(c, "getCiWorkflow", "getApiV4ProjectsIdRepositoryFilesFilePath", {
          path: { ...path(r), file_path: workflowId },
          query: { ref: r.defaultBranch ?? "HEAD" },
        }, o)).body,
      );
      return Object.freeze({
        id: workflowId,
        path: workflowId,
        name: workflowId,
        state: "unknown" as const,
        native: await door(c, "workflow", p),
      });
    },
    listCiRuns: (r, q) => {
      if (q.workflowPath) {
        unavailable(
          c,
          "listCiRuns",
          "GitLab cannot filter historical pipelines by CI configuration path",
        );
      }
      return page(
        c,
        "listCiRuns",
        "getApiV4ProjectsIdPipelines",
        {
          path: path(r),
          query: {
            ref: q.branch,
            sha: q.headSha,
            source: q.event as
              | "push"
              | "web"
              | "api"
              | "schedule"
              | "merge_request_event"
              | undefined,
            status: q.status === "failure"
              ? "failed"
              : q.status === "queued"
              ? "created"
              : q.status,
          },
        },
        q,
        (p) => run(c, p),
      );
    },
    getCiRun: async (r, n, o) =>
      run(
        c,
        object(
          c,
          "getCiRun",
          (await call(c, "getCiRun", "getApiV4ProjectsIdPipelinesPipelineId", {
            path: { ...path(r), pipeline_id: numericId(c, "getCiRun", n) },
          }, o)).body,
        ),
      ),
    listCiRunJobs: (r, n, q) =>
      page(
        c,
        "listCiRunJobs",
        "getApiV4ProjectsIdPipelinesPipelineIdJobs",
        {
          path: { ...path(r), pipeline_id: numericId(c, "listCiRunJobs", n) },
          query: {
            scope: q.status === "failure" ? "failed" : q.status === "queued" ? "created" : q.status,
          },
        },
        q,
        (p) => job(c, p),
      ),
    getCiJob: async (r, n, o) =>
      job(
        c,
        object(
          c,
          "getCiJob",
          (await call(c, "getCiJob", "getApiV4ProjectsIdJobsJobId", {
            path: { id: numericId(c, "getCiJob", r.id), job_id: numericId(c, "getCiJob", n) },
          }, o)).body,
        ),
      ),
    findCiRunArtifact: async (r, n, name, o) => {
      let cursor: string | undefined;
      let count = 0;
      let found: CiArtifactData<"gitlab", V> | undefined;
      do {
        const values = await page(
          c,
          "findCiRunArtifact",
          "getApiV4ProjectsIdPipelinesPipelineIdJobs",
          { path: { ...path(r), pipeline_id: numericId(c, "findCiRunArtifact", n) } },
          { limit: 100, cursor, ...o },
          (p) => artifact(c, p),
        );
        const matches = values.items.filter((p) => p?.name === name);
        if (matches.length > 1 || matches.length && found) {
          invalid(c, "findCiRunArtifact", "Artifact name is ambiguous within the pipeline");
        }
        if (matches.length) found = matches[0];
        count += values.items.length;
        cursor = values.nextCursor;
        if (count >= 1000 && cursor) {
          invalid(c, "findCiRunArtifact", "Artifact lookup exceeds 1000 jobs");
        }
      } while (cursor);
      return found;
    },
    getCiArtifact: async (r, n, o) => {
      if (!/^job:\d+$/.test(n)) {
        invalid(c, "getCiArtifact", "GitLab artifact IDs have the form job:<job ID>");
      }
      const p = object(
        c,
        "getCiArtifact",
        (await call(c, "getCiArtifact", "getApiV4ProjectsIdJobsJobId", {
          path: {
            id: numericId(c, "getCiJob", r.id),
            job_id: numericId(c, "getCiArtifact", n.slice(4)),
          },
        }, o)).body,
      );
      const value = await artifact(c, p);
      if (!value) {
        throw new NotFoundError("Job has no artifact archive", context(c, "getCiArtifact"));
      }
      return value;
    },
  };
  return ops;
}
