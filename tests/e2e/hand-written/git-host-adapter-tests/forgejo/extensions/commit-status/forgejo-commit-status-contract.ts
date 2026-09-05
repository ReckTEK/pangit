import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { ForgejoCommitStatusExtensionState } from "../../../../../../../packages/pangit/src/fluent-providers/forgejo/extensions/commit-statuses.ts";

import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { ForgejoCommitStatusFixtures } from "./forgejo-commit-status-fixtures.ts";

export type ForgejoCommitStatusContractInput = {
  readonly version: ProviderVersion<"forgejo">;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: ForgejoCommitStatusFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove Forgejo-only states remain typed extensions and truthful read snapshots. */
export async function runForgejoCommitStatusContract(
  t: Deno.TestContext,
  input: ForgejoCommitStatusContractInput,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();

  const passed = await t.step("forgejo-extension/commit-status", async () => {
    const git = await (await createClient("forgejo", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    for (
      const state of [
        "error",
        "warning",
        "skipped",
      ] as const satisfies readonly ForgejoCommitStatusExtensionState[]
    ) {
      const context = `pangit/forgejo-${state}`;
      let callbackCount = 0;
      let extensionContext: unknown;
      const capture = await recorder.capture(() =>
        repository.statuses.set({ kind: "commit", sha: input.fixtures.ref }, {
          context,
          state: "pending",
          description: `Forgejo ${state} state`,
        }).forgejo((value) => {
          callbackCount++;
          extensionContext = value;
          return { state };
        }).execute()
      );
      const proof = proveRequestSequence(
        `setCommitStatus.forgejoExtension.${state}`,
        ["repoCreateStatus"],
        capture,
      );
      requestEvidence.push(proof.evidence);
      assert(callbackCount === 1, `${state} extension callback did not run exactly once`);
      assert(
        JSON.stringify(extensionContext) === JSON.stringify({
          repositoryFullName: repository.fullName,
          reference: { kind: "commit", sha: input.fixtures.ref },
          context,
          portableState: "pending",
        }),
        `${state} extension received an unsafe or incorrect context`,
      );
      assert(
        proof.value.state === undefined && proof.value.providerState === state,
        `${state} was collapsed into the portable status vocabulary`,
      );
      assert(Object.isFrozen(proof.value), `${state} status snapshot is mutable`);
    }
    assertions.push(
      "error, warning, and skipped each use one typed extension callback and one direct mutation",
    );
    assertions.push("provider-only states remain verbatim and outside the portable state union");
  });

  return Object.freeze({
    id: "forgejo-extension/commit-status",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
