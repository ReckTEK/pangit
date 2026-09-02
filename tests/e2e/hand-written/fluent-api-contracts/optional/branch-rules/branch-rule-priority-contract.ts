import {
  createClient,
  type ProviderVersion,
} from "../../../../../../packages/pangit/src/fluent-api/mod.ts";
import { ValidationError } from "../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../../request-recorder.ts";
import type { BranchRulePriorityContractFixtures } from "./branch-rule-contract-fixtures.ts";

export type BranchRulePriorityContractInput<TVersion extends ProviderVersion<"gitea">> = {
  readonly provider: "gitea";
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: BranchRulePriorityContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise Gitea's ordered branch-rule priority without widening the shared rule contract. */
export async function runBranchRulePriorityContract<
  const TVersion extends ProviderVersion<"gitea">,
>(
  t: Deno.TestContext,
  input: BranchRulePriorityContractInput<TVersion>,
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

  const passed = await t.step("gitea-extension/branch-rule-priority", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const rules = repository.branchRules;
    const [firstName, secondName] = input.fixtures.orderedRuleNames;

    const first = await prove(
      "branchRulePriority.create.first",
      ["repoCreateBranchProtection"],
      () => rules.create({ name: firstName, pushAllowed: true }),
    );
    const second = await prove(
      "branchRulePriority.create.second",
      ["repoCreateBranchProtection"],
      () => rules.create({ name: secondName, pushAllowed: true }),
    );

    let callbackCount = 0;
    await prove(
      "branchRules.setOrder.gitea",
      ["repoUpdateBranchProtectionPriories"],
      () =>
        rules.setOrder().gitea((context) => {
          callbackCount++;
          assert(Object.isFrozen(context), "Branch-rule order extension context is mutable");
          assert(
            context.repositoryFullName === repository.fullName,
            "Branch-rule order extension received the wrong repository",
          );
          assert(
            Object.keys(context).join("|") === "repositoryFullName",
            "Branch-rule order extension exposed more than its operation context",
          );
          return { orderedRuleNames: [firstName, secondName] };
        }).execute(),
    );
    assert(callbackCount === 1, "Branch-rule priority extension callback did not run exactly once");

    const ordered = await prove(
      "branchRules.list.afterSetOrder",
      ["repoListBranchProtection"],
      () => rules.list({ maxRules: 2 }),
    );
    assert(
      ordered.map((rule) => rule.name).join("|") === `${firstName}|${secondName}`,
      "Gitea did not retain the requested configured-rule order",
    );
    assertions.push("Gitea priority callback is scoped and executes one direct ordering mutation");

    let missingExtension = false;
    const missingCapture = await recorder.capture(async () => {
      try {
        await rules.setOrder().execute();
      } catch (error) {
        missingExtension = error instanceof ValidationError &&
          error.operation === "setBranchRuleOrder";
      }
    });
    requestEvidence.push(
      proveRequestSequence("branchRules.setOrder.missingExtension", [], missingCapture).evidence,
    );
    assert(missingExtension, "Branch-rule order executed without a Gitea extension");

    let duplicate = false;
    const duplicateCapture = await recorder.capture(async () => {
      try {
        await rules.setOrder().gitea(() => ({ orderedRuleNames: [firstName, firstName] }))
          .execute();
      } catch (error) {
        duplicate = error instanceof ValidationError &&
          error.operation === "setBranchRuleOrder";
      }
    });
    requestEvidence.push(
      proveRequestSequence("branchRules.setOrder.duplicate", [], duplicateCapture).evidence,
    );
    assert(duplicate, "Duplicate branch-rule ordering was not rejected locally");
    assertions.push("missing and invalid priority extensions perform zero provider requests");

    await prove(
      "branchRulePriority.delete.first",
      ["repoDeleteBranchProtection"],
      () => rules.delete(first),
    );
    await prove(
      "branchRulePriority.delete.second",
      ["repoDeleteBranchProtection"],
      () => rules.delete(second),
    );
  });

  return Object.freeze({
    id: "gitea-extension/branch-rule-priority",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
