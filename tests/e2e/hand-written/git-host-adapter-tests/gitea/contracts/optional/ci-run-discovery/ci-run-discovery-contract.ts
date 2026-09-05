import {
  createClient,
  errors,
  type ProviderVersion,
} from "../../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../../fluent-api-contracts/request-recorder.ts";
import type { CiRunDiscoveryContractFixtures } from "../../../../../fluent-api-contracts/optional/ci-run-discovery/ci-run-discovery-contract-fixtures.ts";

export type CiRunDiscoveryContractInput<
  TProvider extends "gitea",
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: CiRunDiscoveryContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise read-only workflow, run, job, and artifact discovery by known identity. */
export async function runCiRunDiscoveryContract<
  const TProvider extends "gitea",
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: CiRunDiscoveryContractInput<TProvider, TVersion>,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();
  const prove = async <TValue>(
    operation: string,
    expected: readonly string[],
    action: () => Promise<TValue>,
  ): Promise<TValue> => {
    const proof = proveRequestSequence(operation, expected, await recorder.capture(action));
    requestEvidence.push(proof.evidence);
    return proof.value;
  };

  const passed = await t.step("shared-capability/ci-run-discovery", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const ci = repository.ciRuns;

    const support = await prove(
      "repository.ciRuns.support",
      [],
      () => Promise.resolve(ci.support),
    );
    assert(support.supported, "CI run discovery is not advertised as supported");
    assert(support.operations["get-workflow"] === "direct", "Workflow lookup is not direct");
    assert(support.operations["list-runs"] === "one-page", "Run listing is not one-page bounded");
    assert(
      support.operations["list-run-jobs"] === "one-page",
      "Job listing is not one-page bounded",
    );
    assert(
      support.mutations === "native-only",
      "CI mutations leaked into the read-only capability",
    );
    assertions.push("CI discovery support is static, read-only, bounded, and request-free");

    const workflow = await prove(
      "repository.ciRuns.workflow",
      ["ActionsGetWorkflow"],
      () => ci.workflow(input.fixtures.workflow.id),
    );
    assert(
      workflow.id === input.fixtures.workflow.id,
      "Workflow lookup returned the wrong workflow",
    );
    assert(workflow.path === input.fixtures.workflow.path, "Workflow lookup changed its path");
    assert(Object.isFrozen(workflow), "Workflow entity is mutable");

    const runs = await prove(
      "repository.ciRuns.runs",
      ["getWorkflowRuns"],
      () =>
        ci.runs({
          limit: 5,
          workflowPath: input.fixtures.workflow.path,
          headSha: input.fixtures.run.sha,
          branch: input.fixtures.run.branch,
        }),
    );
    assert(runs.items.length <= 5, "CI run page exceeded its requested limit");
    assert(
      runs.items.some((run) => run.id === input.fixtures.run.id),
      "Bounded CI run page omitted the known run",
    );

    const run = await prove(
      "repository.ciRuns.run",
      ["GetWorkflowRun"],
      () => ci.run(input.fixtures.run.id),
    );
    assert(run.id === input.fixtures.run.id, "Direct CI run lookup returned the wrong run");
    assert(run.sha === input.fixtures.run.sha, "CI run changed its head SHA");
    assert(run.branch === input.fixtures.run.branch, "CI run changed its branch");
    assert(run.status === input.fixtures.run.status, "CI run status was not normalized");
    assert(
      run.conclusion === input.fixtures.run.conclusion,
      "CI run conclusion was not normalized",
    );
    assert(Object.isFrozen(run), "CI run entity is mutable");
    assertions.push("known workflow/run reads and one filtered run page each use one request");

    const jobs = await prove(
      "repository.ciRuns.jobs",
      ["listWorkflowRunJobs"],
      () => ci.jobs(input.fixtures.run.id, { limit: 5 }),
    );
    assert(jobs.items.length <= 5, "CI job page exceeded its requested limit");
    assert(
      jobs.items.some((job) => job.id === input.fixtures.job.id),
      "Bounded CI job page omitted the known job",
    );

    const job = await prove(
      "repository.ciRuns.job",
      ["getWorkflowJob"],
      () => ci.job(input.fixtures.job.id),
    );
    assert(job.id === input.fixtures.job.id, "Direct CI job lookup returned the wrong job");
    assert(job.status === input.fixtures.job.status, "CI job status was not normalized");
    assert(
      job.conclusion === input.fixtures.job.conclusion,
      "CI job conclusion was not normalized",
    );
    assert(Object.isFrozen(job), "CI job entity is mutable");
    assert(Object.isFrozen(job.labels), "CI job labels are mutable");
    assertions.push("known job list/get operations each inspect one provider page or identity");

    const foundArtifact = await prove(
      "repository.ciRuns.findArtifact",
      ["getArtifactsOfRun"],
      () => ci.findArtifact(input.fixtures.run.id, input.fixtures.artifact.name),
    );
    assert(foundArtifact !== undefined, "Known CI artifact was not found");
    assert(
      foundArtifact.id === input.fixtures.artifact.id,
      "Artifact search returned the wrong ID",
    );

    const artifact = await prove(
      "repository.ciRuns.artifact",
      ["getArtifact"],
      () => ci.artifact(input.fixtures.artifact.id),
    );
    assert(
      artifact.id === input.fixtures.artifact.id,
      "Direct artifact lookup returned the wrong ID",
    );
    assert(
      artifact.name === input.fixtures.artifact.name,
      "Direct artifact lookup changed its name",
    );
    assert(Object.isFrozen(artifact), "CI artifact entity is mutable");

    const missingArtifact = await prove(
      "repository.ciRuns.findArtifact.missing",
      ["getArtifactsOfRun"],
      () => ci.findArtifact(input.fixtures.run.id, input.fixtures.missingArtifactName),
    );
    assert(missingArtifact === undefined, "Missing CI artifact did not return undefined");

    const nativeRunId = await prove(
      "ciRun.native.gitea",
      [],
      () => run.native.gitea(({ run: nativeRun }) => nativeRun.id),
    );
    assert(String(nativeRunId) === run.id, "CI run native payload was not retained");
    const nativeArtifactId = await prove(
      "ciArtifact.native.gitea",
      [],
      () => artifact.native.gitea(({ artifact: nativeArtifact }) => nativeArtifact.id),
    );
    assert(String(nativeArtifactId) === artifact.id, "CI artifact native payload was not retained");
    assertions.push("artifact find/get/absence are direct and native access adds zero requests");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await ci.workflow(" ");
      } catch (error) {
        invalid = error instanceof errors.ValidationError && error.operation === "getCiWorkflow";
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.ciRuns.workflow.invalidId", [], invalidCapture).evidence,
    );
    assert(invalid, "Blank workflow identity was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await ci.run(input.fixtures.run.id, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof errors.OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.ciRuns.run.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "CI run cancellation was not normalized");
    assertions.push("invalid and cancelled CI discovery operations perform zero provider requests");
  });

  return Object.freeze({
    id: "shared-capability/ci-run-discovery",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
