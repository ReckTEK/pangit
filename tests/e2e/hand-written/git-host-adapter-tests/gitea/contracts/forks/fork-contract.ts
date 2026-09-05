import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import { OperationAbortedError } from "../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { ForkContractFixtures } from "../../../../fluent-api-contracts/forks/fork-contract-fixtures.ts";

type ForkContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: ForkContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise only the provider-neutral, bounded repository-fork capability. */
export async function runForkContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: ForkContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/forks", async () => {
    const connection = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    });
    const git = await connection.auth.token(input.token);
    const sourceOwner = await git.container(input.fixtures.source.owner);
    const source = await sourceOwner.repository(input.fixtures.source.repository);
    const destination = await git.container(input.fixtures.destination.name);

    const fork = await prove(
      "createFork",
      ["createFork", "repoGet"],
      () =>
        source.forks.create({
          destination,
          name: input.fixtures.forkName,
          timeoutMs: 10_000,
          pollIntervalMs: 50,
        }),
    );
    assert(
      fork.owner === input.fixtures.destination.name && fork.name === input.fixtures.forkName,
      "Fork creation returned the wrong destination",
    );
    assert(
      fork.parent?.fullName === `${source.owner}/${source.name}`,
      "Fork creation omitted its normalized parent identity",
    );
    assertions.push(
      "fork creation polls only the known direct destination and returns usable data",
    );

    const page = await prove("listForks", ["listForks"], () => source.forks.list({ limit: 1 }));
    assert(
      page.items.some((item) => item.fullName === fork.fullName),
      "Fork listing omitted the created fork",
    );
    assertions.push("fork listing reads one bounded provider page");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const capture = await recorder.capture(async () => {
      try {
        await source.forks.list({ signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    const proof = proveRequestSequence("listForks.preflightAbort", [], capture);
    requestEvidence.push(proof.evidence);
    assert(aborted, "Fork-list cancellation was not normalized");
    assertions.push("preflight cancellation performs no provider request");
  });

  return Object.freeze({
    id: "core/forks",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
