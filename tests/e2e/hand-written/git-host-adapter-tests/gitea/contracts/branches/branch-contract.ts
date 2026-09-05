import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  ConflictError,
  NotFoundError,
  OperationAbortedError,
  ValidationError,
} from "../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { BranchContractFixtures } from "../../../../fluent-api-contracts/branches/branch-contract-fixtures.ts";

type BranchContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: BranchContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise the direct branch lifecycle and exact bounded divergence contract. */
export async function runBranchContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: BranchContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/branches", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const owner = await git.container(input.fixtures.repository.owner);
    const repository = await owner.repository(input.fixtures.repository.name);

    const page = await prove(
      "listBranches",
      ["repoListBranches"],
      () => repository.branches.list({ limit: 2 }),
    );
    assert(page.items.length <= 2, "Branch list exceeded the requested page limit");
    assert(page.items.some((branch) => branch.name === input.fixtures.base), "Base branch missing");

    const filtered = await prove(
      "listBranches.filtered",
      ["repoListBranches"],
      () => repository.branches.list({ limit: 10, query: input.fixtures.head }),
    );
    assert(
      filtered.items.every((branch) => branch.name.includes(input.fixtures.head)),
      "Branch filter returned a nonmatching branch",
    );
    assertions.push("branch listing is one page and version-specific filtering stays bounded");

    const head = await prove(
      "getBranch",
      ["repoGetBranch"],
      () => repository.branches.get(input.fixtures.head),
    );
    assert(head.sha === input.fixtures.headSha, "Direct branch lookup returned the wrong SHA");
    assert(
      await prove(
        "branchExists",
        ["repoGetBranch"],
        () => repository.branches.exists(input.fixtures.head),
      ),
      "Direct branch existence missed the fixture",
    );
    assert(
      !await prove(
        "branchExists.missing",
        ["repoGetBranch"],
        () => repository.branches.exists(`${input.fixtures.head}-missing`),
      ),
      "Missing branch was reported present",
    );
    let missing = false;
    try {
      await prove(
        "getBranch.missing",
        ["repoGetBranch"],
        () => repository.branches.get(`${input.fixtures.head}-missing`),
      );
    } catch (error) {
      missing = error instanceof NotFoundError;
    }
    assert(missing, "Required missing branch did not throw NotFoundError");
    assertions.push("branch get and exists use one direct request with 404-only absence");

    const created = await prove(
      "createBranch",
      ["repoCreateBranch"],
      () =>
        repository.branches.create({
          name: input.fixtures.mutationBranch,
          source: input.fixtures.baseSha,
        }),
    );
    assert(created.sha === input.fixtures.baseSha, "Created branch points at the wrong commit");
    let conflict = false;
    try {
      await prove(
        "createBranch.duplicate",
        ["repoCreateBranch"],
        () =>
          repository.branches.create({
            name: input.fixtures.mutationBranch,
            source: input.fixtures.baseSha,
          }),
      );
    } catch (error) {
      conflict = error instanceof ConflictError;
    }
    assert(conflict, "Duplicate branch creation did not preserve conflict semantics");

    const renamedName = `${input.fixtures.mutationBranch}-renamed`;
    await prove(
      "renameBranch",
      ["repoRenameBranch"],
      () => repository.branches.rename(created, renamedName),
    );
    const renamed = await prove(
      "getRenamedBranch",
      ["repoGetBranch"],
      () => repository.branches.get(renamedName),
    );
    await prove(
      "deleteBranch",
      ["repoDeleteBranch"],
      () => repository.branches.delete(renamed),
    );
    assertions.push("branch create, conflict, rename, and delete use direct operations");

    const defaultBranch = await repository.branches.get(input.fixtures.base);
    for (
      const [operation, action] of [
        ["renameBranch.default", () => repository.branches.rename(defaultBranch, "not-allowed")],
        ["deleteBranch.default", () => repository.branches.delete(defaultBranch)],
      ] as const
    ) {
      let rejected = false;
      const capture = await recorder.capture(async () => {
        try {
          await action();
        } catch (error) {
          rejected = error instanceof ValidationError;
        }
      });
      const proof = proveRequestSequence(operation, [], capture);
      requestEvidence.push(proof.evidence);
      assert(rejected, `${operation} did not reject locally`);
    }
    assertions.push("default-branch mutation guards make zero provider requests");

    const divergence = await prove(
      "getDivergence",
      ["repoGetAllCommits", "repoGetAllCommits"],
      () => repository.branches.divergence(input.fixtures.base, input.fixtures.head),
    );
    assert(
      divergence.ahead === input.fixtures.expectedAhead &&
        divergence.behind === input.fixtures.expectedBehind && divergence.complete,
      `Unexpected divergence ${JSON.stringify(divergence)}`,
    );
    assertions.push("divergence is exact from two count-only provider probes");

    const divergenceCapture = await recorder.capture(() =>
      repository.branches.listDivergences({
        base: input.fixtures.base,
        limit: 2,
        maxItems: 2,
        concurrency: 2,
      })
    );
    const expectedDivergenceRequests = [
      "repoListBranches",
      ...Array.from(
        { length: divergenceCapture.value.items.length * 2 },
        () => "repoGetAllCommits",
      ),
    ];
    const divergenceProof = proveRequestSequence(
      "listBranchDivergences",
      expectedDivergenceRequests,
      divergenceCapture,
    );
    requestEvidence.push(divergenceProof.evidence);
    assertions.push("divergence pages obey one page plus two probes per returned branch");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortedCapture = await recorder.capture(async () => {
      try {
        await repository.branches.get(input.fixtures.head, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("getBranch.preflightAbort", [], abortedCapture).evidence,
    );
    assert(aborted, "Branch cancellation was not normalized");
  });

  return Object.freeze({
    id: "core/branches",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
