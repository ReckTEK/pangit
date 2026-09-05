import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  findGiteaCiRunArtifact,
  getGiteaCiArtifact,
  getGiteaCiJob,
  getGiteaCiRun,
  getGiteaCiWorkflow,
  listGiteaCiRunJobs,
  listGiteaCiRuns,
} from "./mod.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

async function assertRejects(
  execute: () => unknown | Promise<unknown>,
  errorType: new (...args: never[]) => Error,
): Promise<void> {
  try {
    await execute();
  } catch (error) {
    assert(error instanceof errorType, `Expected ${errorType.name}, received ${String(error)}`);
    return;
  }
  throw new Error(`Expected ${errorType.name}`);
}

const repository = {
  id: "1",
  owner: "acme",
  name: "demo",
  fullName: "acme/demo",
  native: {},
} as unknown as RepositoryData<"gitea", "1.26.4">;

const workflow = {
  id: "build.yml",
  name: "Build",
  path: ".gitea/workflows/build.yml",
  state: "active",
  html_url: "https://gitea.example.invalid/acme/demo/actions",
};

const run = {
  id: 21,
  path: ".gitea/workflows/build.yml",
  display_title: "build fixture",
  run_number: 3,
  run_attempt: 1,
  head_branch: "main",
  head_sha: "abc123",
  status: "in_progress",
  actor: { login: "fixture" },
};

const job = {
  id: 31,
  run_id: 21,
  name: "test",
  head_sha: "abc123",
  status: "success",
  conclusion: "success",
  labels: ["docker", "linux"],
  runner_name: "fixture-runner",
};

const artifact = {
  id: 41,
  name: "bundle",
  size_in_bytes: 512,
  expired: false,
  workflow_run: { id: 21 },
};

Deno.test("Gitea CI discovery uses direct identities and one requested provider page", async () => {
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.26.4", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const path = new URL(request.url).pathname;
      if (path.endsWith("/actions/workflows/build.yml")) {
        return Promise.resolve(Response.json(workflow));
      }
      if (path.endsWith("/actions/runs/21/jobs")) {
        return Promise.resolve(Response.json({ total_count: 2, jobs: [job] }));
      }
      if (path.endsWith("/actions/runs/21/artifacts")) {
        return Promise.resolve(Response.json({ total_count: 1, artifacts: [artifact] }));
      }
      if (path.endsWith("/actions/runs/21")) return Promise.resolve(Response.json(run));
      if (path.endsWith("/actions/runs")) {
        return Promise.resolve(Response.json({ total_count: 3, workflow_runs: [run] }));
      }
      if (path.endsWith("/actions/jobs/31")) return Promise.resolve(Response.json(job));
      if (path.endsWith("/actions/artifacts/41")) return Promise.resolve(Response.json(artifact));
      return Promise.resolve(new Response(null, { status: 404 }));
    },
  });

  const fetchedWorkflow = await getGiteaCiWorkflow(context, repository, "build.yml");
  const runs = await listGiteaCiRuns(context, repository, {
    limit: 2,
    workflowPath: ".gitea/workflows/build.yml",
    headSha: "abc123",
    status: "running",
  });
  const fetchedRun = await getGiteaCiRun(context, repository, "21");
  const jobs = await listGiteaCiRunJobs(context, repository, "21", {
    limit: 2,
    status: "running",
  });
  const fetchedJob = await getGiteaCiJob(context, repository, "31");
  const foundArtifact = await findGiteaCiRunArtifact(context, repository, "21", "bundle");
  const fetchedArtifact = await getGiteaCiArtifact(context, repository, "41");

  assertEquals(requests.length, 7, "CI discovery request count changed");
  assertEquals(fetchedWorkflow.state, "active", "workflow state normalization changed");
  assertEquals(runs.items.length, 1, "workflow-path page filter changed");
  assertEquals(runs.nextCursor, "gitea-page:2:1", "run continuation changed");
  assertEquals(runs.totalCount, undefined, "local workflow filter exposed an unfiltered total");
  assertEquals(fetchedRun.status, "running", "run state normalization changed");
  assertEquals(jobs.nextCursor, "gitea-page:2:1", "job continuation changed");
  assertEquals(fetchedJob.conclusion, "success", "job conclusion normalization changed");
  assert(Object.isFrozen(fetchedJob.labels), "job labels are mutable");
  assertEquals(foundArtifact?.runId, "21", "artifact run identity changed");
  assertEquals(fetchedArtifact.size, 512, "artifact size normalization changed");

  const runsUrl = new URL(requests[1].url);
  assertEquals(runsUrl.searchParams.get("head_sha"), "abc123", "head SHA filter changed");
  assertEquals(runsUrl.searchParams.get("status"), "in_progress", "run status mapping changed");
  const jobsUrl = new URL(requests[3].url);
  assertEquals(jobsUrl.searchParams.get("page"), "1", "job page changed");
  assertEquals(jobsUrl.searchParams.get("limit"), "2", "job limit changed");
  const artifactUrl = new URL(requests[5].url);
  assertEquals(artifactUrl.searchParams.get("name"), "bundle", "artifact direct filter changed");
  const nativeWorkflowId = await fetchedWorkflow.native.gitea(({ workflow }) => workflow.id);
  assertEquals(nativeWorkflowId, "build.yml", "workflow native payload changed");
});

Deno.test("Gitea CI discovery validates known numeric IDs before HTTP", async () => {
  let requests = 0;
  const context = new GiteaAdapterContext("1.26.4", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: () => {
      requests++;
      return Promise.resolve(Response.json(run));
    },
  });
  await assertRejects(() => getGiteaCiRun(context, repository, "all"), TypeError);
  await assertRejects(
    () => listGiteaCiRunJobs(context, repository, "0", { limit: 1 }),
    TypeError,
  );
  await assertRejects(
    () => findGiteaCiRunArtifact(context, repository, "latest", "bundle"),
    TypeError,
  );
  assertEquals(requests, 0, "invalid CI identity reached Gitea");
});
