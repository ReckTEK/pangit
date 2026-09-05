import type {} from "../registration.ts";
import { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import { listForgejoCiRuns } from "./runs.ts";
import { listForgejoCiRunJobs } from "./jobs.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

for (const version of ["15.0.7", "16.0.3"] as const) {
  Deno.test(`Forgejo ${version} queued discovery includes waiting and blocked executions`, async () => {
    const executions = [
      { id: 1, run_id: 1, status: "waiting" },
      { id: 2, run_id: 1, status: "blocked" },
      { id: 3, run_id: 1, status: "running" },
    ];
    const context = new ForgejoAdapterContext(version, {
      baseUrl: "https://forgejo.invalid/api/v1",
      fetch(input, init) {
        const url = new URL(new Request(input, init).url);
        if (url.pathname.endsWith("/jobs")) return Promise.resolve(Response.json(executions));
        const statuses = url.searchParams.getAll("status");
        const runs = executions.filter((item) => statuses.includes(item.status));
        return Promise.resolve(Response.json({ workflow_runs: runs, total_count: runs.length }));
      },
    });
    const repo = {
      id: "1",
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      native: null as never,
    } satisfies RepositoryData<"forgejo", typeof version>;
    const runs = await listForgejoCiRuns(context, repo, { limit: 10, status: "queued" });
    if (runs.items.length !== 2 || runs.items.some((run) => run.status !== "queued")) {
      throw new Error("Queued run discovery omitted blocked executions");
    }
    if (version === "16.0.3") {
      const jobs = await listForgejoCiRunJobs(context, repo, "1", { limit: 10, status: "queued" });
      if (jobs.items.length !== 2 || jobs.items.some((job) => job.status !== "queued")) {
        throw new Error("Queued job discovery omitted blocked executions");
      }
    }
  });
}
