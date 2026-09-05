import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const statuses = {
  title: "repo.statuses",
  source: "fluent-api/capabilities/RepositoryCommitStatuses.ts",
  methods: {
    "list":
      "list(reference, request?) \u2192 Page<CommitStatus>. Read one page of individual statuses.",
    "get":
      "get(reference, options?) \u2192 CombinedStatus. Read the combined state, individual statuses, and totalCount when available.",
    "set":
      "set(reference, { context, state, description?, targetUrl? }) \u2192 operation. Execute to return the recorded CommitStatus.",
  } satisfies MethodDescriptions<api.RepositoryCommitStatuses<"gitea", "1.27.2">>,
};

export const ci = {
  title: "repo.ciRuns",
  source: "fluent-api/capabilities/optional/RepositoryCiRunDiscovery.ts",
  methods: {
    "workflow": "workflow(id, options?) \u2192 CiWorkflow. Fetch workflow metadata.",
    "runs":
      "runs(options?) \u2192 Page<CiRun>. Filters: workflowPath, headSha, branch, event, status; also accepts limit, cursor, signal.",
    "run": "run(id, options?) \u2192 CiRun. Fetch a run by its returned ID.",
    "jobs":
      "jobs(runId, { status?, limit?, cursor?, signal? }) \u2192 Page<CiJob>. Read jobs belonging to a run.",
    "job": "job(id, options?) \u2192 CiJob. Fetch one job.",
    "findArtifact":
      "findArtifact(runId, name, options?) \u2192 CiArtifact | undefined. Resolve an artifact by name within a run.",
    "artifact":
      "artifact(id, options?) \u2192 CiArtifact. Fetch metadata; artifact bytes and downloads remain native.",
  } satisfies MethodDescriptions<api.RepositoryCiRunDiscovery<"gitea", "1.27.2">>,
};
