import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  NotFoundError,
  OperationAbortedError,
  ValidationError,
} from "../../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../../fluent-api-contracts/request-recorder.ts";
import type { BranchRuleContractFixtures } from "../../../../../fluent-api-contracts/optional/branch-rules/branch-rule-contract-fixtures.ts";

export type BranchRuleContractInput<
  TProvider extends "gitea",
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: BranchRuleContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise configured-rule lifecycle and separately resolved effective branch enforcement. */
export async function runBranchRuleContract<
  const TProvider extends "gitea",
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: BranchRuleContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/branch-rules", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const rules = repository.branchRules;

    const support = await prove(
      "repository.branchRules.support",
      [],
      () => Promise.resolve(rules.support),
    );
    assert(support.configuredRules.supported, "Configured branch rules are not supported");
    assert(support.effectiveProtection.supported, "Effective branch protection is not supported");
    assertions.push("configured and effective capability metadata is static and request-free");

    const created = await prove(
      "repository.branchRules.create",
      ["repoCreateBranchProtection"],
      () =>
        rules.create({
          name: input.fixtures.ruleName,
          pushAllowed: false,
          forcePushAllowed: false,
          statusChecksRequired: false,
          requiredApprovals: 1,
        }),
    );
    assert(created.name === input.fixtures.ruleName, "Created branch-rule identity changed");
    assert(created.pushAllowed === false, "Created branch-rule push policy changed");
    assert(Object.isFrozen(created), "Configured branch-rule entity is mutable");
    assert(Object.isFrozen(created.statusCheckContexts), "Branch-rule status contexts are mutable");

    const direct = await prove(
      "repository.branchRules.get",
      ["repoGetBranchProtection"],
      () => rules.get(input.fixtures.ruleName),
    );
    assert(direct.name === created.name, "Direct branch-rule lookup returned the wrong rule");

    const listed = await prove(
      "repository.branchRules.list",
      ["repoListBranchProtection"],
      () => rules.list({ maxRules: 4 }),
    );
    assert(listed.length === 1, "Configured branch-rule list did not stay bounded to the fixture");
    assert(listed[0].name === created.name, "Configured branch-rule list returned the wrong rule");
    assertions.push("configured rule create/get/list operations are direct and explicitly bounded");

    const updated = await prove(
      "repository.branchRules.update",
      ["repoEditBranchProtection"],
      () =>
        rules.update(created, {
          pushAllowed: true,
          requiredApprovals: 2,
        }),
    );
    assert(updated.pushAllowed === true, "Updated push policy was not normalized");
    assert(updated.requiredApprovals === 2, "Updated approval count was not normalized");

    const effective = await prove(
      "repository.branchRules.effective",
      ["repoGetBranch"],
      () => rules.effective(input.fixtures.branch),
    );
    assert(effective.branch === input.fixtures.branch, "Effective protection used wrong branch");
    assert(effective.protected, "Provider did not report the fixture branch as protected");
    assert(Object.isFrozen(effective), "Effective branch-protection entity is mutable");
    assertions.push(
      "effective enforcement comes from one direct branch response, not rule inference",
    );

    const nativeRuleName = await prove(
      "branchRule.native.gitea",
      [],
      () => updated.native.gitea(({ configuredRule }) => Promise.resolve(configuredRule.rule_name)),
    );
    assert(nativeRuleName === input.fixtures.ruleName, "Configured-rule native payload was lost");

    await prove(
      "repository.branchRules.delete",
      ["repoDeleteBranchProtection"],
      () => rules.delete(updated),
    );

    let missing = false;
    const missingCapture = await recorder.capture(async () => {
      try {
        await rules.get(input.fixtures.ruleName);
      } catch (error) {
        missing = error instanceof NotFoundError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "repository.branchRules.get.afterDelete",
        ["repoGetBranchProtection"],
        missingCapture,
      ).evidence,
    );
    assert(missing, "Deleted branch rule was not reported missing");
    assertions.push("delete is direct and absence is confirmed by one separate direct lookup");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await rules.create({ name: " " });
      } catch (error) {
        invalid = error instanceof ValidationError && error.operation === "createBranchRule";
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.branchRules.create.invalidName", [], invalidCapture)
        .evidence,
    );
    assert(invalid, "Blank branch-rule name was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await rules.get(input.fixtures.ruleName, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.branchRules.get.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Branch-rule cancellation was not normalized");
    assertions.push("invalid and cancelled branch-rule operations perform zero provider requests");
  });

  return Object.freeze({
    id: "shared-capability/branch-rules",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
