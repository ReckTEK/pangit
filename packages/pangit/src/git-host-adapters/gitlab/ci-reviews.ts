import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import { NotFoundError } from "../../fluent-api/adapter-contract/errors.ts";
import type {
  CiArtifactData,
  CiExecutionConclusion,
  CiExecutionStatus,
  CiJobData,
  CiRunData,
} from "../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import {
  type Adapter,
  call,
  context,
  door,
  type Dto,
  id,
  invalid,
  numericId,
  object,
  page,
  path,
  text,
  unavailable,
} from "./shared.ts";
function state(
  p: Dto,
): {
  status: CiExecutionStatus;
  conclusion?: CiExecutionConclusion;
  providerStatus?: string;
  providerConclusion?: string;
} {
  const raw = text(p.status) ?? "unknown";
  const conclusions: Record<string, CiExecutionConclusion> = {
    success: "success",
    failed: "failure",
    canceled: "cancelled",
    skipped: "skipped",
  };
  return {
    status: conclusions[raw]
      ? "completed"
      : raw === "running"
      ? "running"
      : raw === "pending"
      ? "pending"
      : ["created", "waiting_for_resource", "preparing", "scheduled"].includes(raw)
      ? "queued"
      : "unknown",
    conclusion: conclusions[raw],
    providerStatus: raw,
    providerConclusion: conclusions[raw] ? raw : undefined,
  };
}
async function run<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<CiRunData<"gitlab", V>> {
  return Object.freeze({
    id: id(c, "normalizeCiRun", p.id),
    ...state(p),
    title: text(p.name),
    branch: text(p.ref),
    sha: text(p.sha),
    event: text(p.source),
    actor: p.user ? text(object(c, "normalizeCiRun", p.user).username) : undefined,
    startedAt: text(p.started_at),
    completedAt: text(p.finished_at),
    url: text(p.web_url),
    native: await door(c, "run", p),
  });
}
async function job<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<CiJobData<"gitlab", V>> {
  return Object.freeze({
    id: id(c, "normalizeCiJob", p.id),
    runId: p.pipeline
      ? id(c, "normalizeCiJob", object(c, "normalizeCiJob", p.pipeline).id)
      : undefined,
    name: text(p.name),
    ...state(p),
    sha: p.commit ? text(object(c, "normalizeCiJob", p.commit).id) : undefined,
    labels: Object.freeze(
      Array.isArray(p.tag_list) ? p.tag_list.filter((v): v is string => typeof v === "string") : [],
    ),
    runnerName: p.runner ? text(object(c, "normalizeCiJob", p.runner).description) : undefined,
    startedAt: text(p.started_at),
    completedAt: text(p.finished_at),
    url: text(p.web_url),
    native: await door(c, "job", p),
  });
}
async function artifact<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<CiArtifactData<"gitlab", V> | undefined> {
  if (!p.artifacts_file) return undefined;
  const file = object(c, "normalizeCiArtifact", p.artifacts_file);
  if (!file.filename) return undefined;
  return Object.freeze({
    id: `job:${id(c, "normalizeCiArtifact", p.id)}`,
    runId: p.pipeline
      ? id(c, "normalizeCiArtifact", object(c, "normalizeCiArtifact", p.pipeline).id)
      : undefined,
    name: text(file.filename),
    size: typeof file.size === "number" ? file.size : undefined,
    createdAt: text(p.finished_at),
    expiresAt: text(p.artifacts_expire_at),
    native: await door(c, "artifact", p),
  });
}
export function ciReviews<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
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
    | "pullRequestReviewSupport"
    | "listPullRequestReviews"
    | "getPullRequestReview"
    | "createPullRequestReview"
    | "submitPullRequestReview"
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
    // GitLab draft notes disappear on publication; approvals have no persistent review-object ID.
    // Advertising this contract would falsely promise Gitea's stable pending/submitted identity.
    pullRequestReviewSupport: Object.freeze({
      supported: false,
      operations: Object.freeze({
        list: "one-page",
        get: "direct",
        create: "direct",
        submit: "direct",
      }),
      dismissal: "provider-extension-or-native",
      replies: "provider-extension-or-native",
      resolution: "provider-extension-or-native",
      richPositions: "provider-extension-or-native",
    }),
    listPullRequestReviews: () =>
      unavailable(
        c,
        "listPullRequestReviews",
        "GitLab exposes draft notes and approvals, not persistent review objects; use native access",
      ),
    getPullRequestReview: () =>
      unavailable(
        c,
        "getPullRequestReview",
        "GitLab has no stable pending/submitted review-object identity",
      ),
    createPullRequestReview: () =>
      unavailable(
        c,
        "createPullRequestReview",
        "Use GitLab's native draft-note API or core comments and approvals",
      ),
    submitPullRequestReview: () =>
      unavailable(
        c,
        "submitPullRequestReview",
        "GitLab draft notes and approvals cannot preserve the portable review identity",
      ),
  };
  return ops;
}
