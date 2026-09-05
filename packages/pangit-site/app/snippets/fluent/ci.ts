import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
if (repo.ciRuns.support.supported) {
  const page = await repo.ciRuns.runs({ branch: "main", limit: 10 });
  for (const run of page.items) {
    const jobs = await repo.ciRuns.jobs(run.id, { limit: 20 });
    console.log(run.id, run.status, jobs.items.map((job) => job.name));
  }
}
