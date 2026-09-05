import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityCiRunDiscovery = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const sha = await f.commit(
    repo.id,
    "main",
    ".gitlab-ci.yml",
    "fixture:\n  tags: [pangit-e2e]\n  script:\n    - echo artifact-body > result.txt\n  artifacts:\n    paths: [result.txt]\n",
  );
  const raw = await f.raw("POST", `/projects/${repo.id}/pipeline`, { ref: "main" });
  const run = await f.eventually(
    () => repo.ciRuns.run(String(raw.id)),
    (r) => r.status === "completed",
    "real CI shell job",
    180,
  );
  f.equal(run.conclusion, "success", "Real runner executes pipeline successfully");
  f.equal(run.sha, sha, "Pipeline head SHA");
  f.equal(
    (await repo.ciRuns.workflow(".gitlab-ci.yml")).path,
    ".gitlab-ci.yml",
    "CI configuration workflow",
  );
  const jobs = await repo.ciRuns.jobs(run.id);
  f.equal(jobs.items[0].conclusion, "success", "CI job conclusion");
  f.equal(
    (await f.prove(
      "CI job lookup is direct",
      ["getApiV4ProjectsIdJobsJobId"],
      () => repo.ciRuns.job(jobs.items[0].id),
    )).name,
    "fixture",
    "Direct job lookup",
  );
  const artifact = await repo.ciRuns.findArtifact(run.id, "artifacts.zip");
  f.assert(artifact && artifact.size! > 0, "Actual job artifact discovered");
  f.equal(
    (await repo.ciRuns.artifact(artifact!.id)).id,
    artifact!.id,
    "Stable job archive identity",
  );
  f.assert(
    (await repo.ciRuns.runs({ branch: "main", headSha: sha })).items.some((r) => r.id === run.id),
    "Pipeline filtered discovery",
  );
};
