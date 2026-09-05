import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { GiteaCompareDiffPatchFixtures } from "./gitea-compare-diff-patch-fixtures.ts";

export type GiteaCompareDiffPatchContractInput = {
  readonly version: ProviderVersion<"gitea">;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: GiteaCompareDiffPatchFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove Gitea 1.27.2 raw compare modes remain complete, direct, and version-scoped. */
export async function runGiteaCompareDiffPatchContract(
  t: Deno.TestContext,
  input: GiteaCompareDiffPatchContractInput,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];

  const passed = await t.step("gitea-extension/compare-diff-patch", async () => {
    if (input.version !== "1.27.2") {
      assertions.push("raw comparison is intentionally absent before Gitea 1.27.2");
      return;
    }
    const recorder = new FluentApiRequestRecorder();
    const git = await (await createClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    for (const output of ["diff", "patch"] as const) {
      let callbackCount = 0;
      let extensionContext: unknown;
      const capture = await recorder.capture(() =>
        repository.commits.compare(input.fixtures.base, input.fixtures.head).gitea((context) => {
          callbackCount++;
          extensionContext = context;
          return { output };
        }).execute()
      );
      const proof = proveRequestSequence(
        `compareCommits.gitea.${output}`,
        ["repoCompareDiff"],
        capture,
      );
      requestEvidence.push(proof.evidence);
      assert(callbackCount === 1, `${output} extension callback did not run exactly once`);
      assert(
        JSON.stringify(extensionContext) === JSON.stringify({
          repositoryFullName: repository.fullName,
          base: input.fixtures.base,
          head: input.fixtures.head,
        }),
        `${output} extension received an incorrect context`,
      );
      assert(proof.value.output === output, `${output} result lost its format discriminator`);
      assert(
        proof.value.content.includes(input.fixtures.changedPath),
        `${output} output omitted the known changed path`,
      );
      assert(Object.isFrozen(proof.value), `${output} result is mutable`);
    }
    assertions.push("diff and patch each use one repoCompareDiff request and retain complete text");
  });

  return Object.freeze({
    id: "gitea-extension/compare-diff-patch",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
