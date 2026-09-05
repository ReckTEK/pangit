import { waitForFixture } from "./wait-for-fixture.ts";
import { unwrapRestResponse } from "../../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { ForgejoE2EFixtureDriver } from "../ForgejoE2EFixtureDriver.ts";
import type { ForgejoCiFixtures, ForgejoClient, ForgejoVersion } from "./types.ts";
import { positiveIdString, requiredString } from "./values.ts";
export async function createCiRunDiscoveryFixtures<TVersion extends ForgejoVersion>(
  driver: ForgejoE2EFixtureDriver<TVersion>,
  client: ForgejoClient<TVersion>,
  timeoutMs: number,
): Promise<ForgejoCiFixtures> {
  const repository = await driver.createInitializedRepository("ci-run-discovery");
  const workflowId = "optional-ci.yaml";
  const workflowPath = `.forgejo/workflows/${workflowId}`;
  const workflowSource = [
    "name: PanGit optional CI",
    "on:",
    "  push:",
    "jobs:",
    "  artifact:",
    "    runs-on: sandbox",
    "    steps:",
    "      - run: bash /fixtures/upload-artifact.sh",
    "",
  ].join("\n");
  const sha = await driver.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "add optional CI fixture",
    changes: [{ operation: "create", path: workflowPath, content: workflowSource }],
  });
  const path = { owner: repository.owner, repo: repository.name };

  const workflow = { id: workflowPath, path: workflowPath };

  const run = await waitForFixture("successful workflow run", timeoutMs, async () => {
    const payload = unwrapRestResponse(
      await client.listActionRuns(
        {
          path,
          query: {
            page: 1,
            limit: 2,
            ref: `refs/heads/${repository.defaultBranch}`,
            event: ["push"],
            head_sha: sha,
          },
        },
        { signal: AbortSignal.timeout(timeoutMs) },
      ),
    ) as { readonly workflow_runs?: unknown };
    if (!Array.isArray(payload.workflow_runs)) {
      throw new Error("Forgejo fixture returned malformed workflow runs");
    }
    const candidate = payload.workflow_runs.find((value) =>
      value !== null && typeof value === "object" &&
      (value as { commit_sha?: unknown }).commit_sha === sha
    ) as Record<string, unknown> | undefined;
    if (candidate === undefined) return undefined;
    const status = typeof candidate.status === "string" ? candidate.status : undefined;
    const conclusion = typeof candidate.conclusion === "string" ? candidate.conclusion : undefined;
    if (
      [status, conclusion].some((value) =>
        value === "failure" || value === "cancelled" || value === "canceled"
      )
    ) {
      throw new Error(`Forgejo fixture workflow failed with ${conclusion ?? status}`);
    }
    if (status !== "success" && conclusion !== "success") return undefined;
    return {
      id: positiveIdString(candidate.id, "workflow run id"),
      branch: requiredString(candidate.prettyref, "workflow run branch").replace(
        /^refs\/heads\//,
        "",
      ),
      sha: requiredString(candidate.commit_sha, "workflow run SHA"),
    };
  });

  const common = {
    repository: Object.freeze({ owner: repository.owner, name: repository.name }),
    workflow: Object.freeze(workflow),
    run: Object.freeze({ ...run, status: "completed" as const, conclusion: "success" as const }),
    missingArtifactName: `${driver.prefix}-missing-artifact`,
  };
  if (driver.version === "15.0.7") return Object.freeze(common);
  const modernClient = client as ForgejoClient<"16.0.3">;
  const jobs = unwrapRestResponse(
    await modernClient.listActionRunJobs({ path: { ...path, run_id: Number(run.id) } }, {
      signal: AbortSignal.timeout(timeoutMs),
    }),
  );
  if (!Array.isArray(jobs) || !jobs.length || jobs[0].status !== "success") {
    throw new Error("Forgejo CI fixture has no successful job");
  }
  const job = {
    id: `run:${run.id}:job:${positiveIdString(jobs[0].id, "job id")}`,
    status: "completed" as const,
    conclusion: "success" as const,
  };
  const artifacts = unwrapRestResponse(
    await modernClient.listActionRunArtifacts({ path: { ...path, run_id: Number(run.id) } }, {
      signal: AbortSignal.timeout(timeoutMs),
    }),
  );
  if (!Array.isArray(artifacts)) throw new Error("Malformed Forgejo artifact list");
  const artifact = artifacts.find((item) => item.name === "e2e-artifact");
  if (!artifact) throw new Error("Forgejo CI fixture did not upload its artifact");
  return Object.freeze({
    ...common,
    job: Object.freeze(job),
    artifact: Object.freeze({
      id: positiveIdString(artifact.id, "artifact id"),
      name: "e2e-artifact",
    }),
  });
}
