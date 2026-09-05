import {
  createClient,
  errors,
  type ProviderVersion,
} from "../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../../request-recorder.ts";
import type { IssueContractFixtures } from "./issue-contract-fixtures.ts";

export type GiteaIssueContentVersionContractInput<
  TVersion extends ProviderVersion<"gitea">,
> = {
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: IssueContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isContentVersion(value: unknown): value is number | bigint {
  return typeof value === "bigint"
    ? value >= 0n
    : typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Prove Gitea optimistic issue updates reject a stale content version without overwriting. */
export async function runGiteaIssueContentVersionContract<
  const TVersion extends ProviderVersion<"gitea">,
>(
  t: Deno.TestContext,
  input: GiteaIssueContentVersionContractInput<TVersion>,
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

  const passed = await t.step("gitea-extension/issue-content-version", async () => {
    const git = await (await createClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const issues = repository.issues;
    const support = await prove(
      "repository.issues.support.contentVersionGuard",
      [],
      () => Promise.resolve(issues.support),
    );
    assert(
      support.contentVersionGuard === "provider-extension",
      "Gitea content-version guard is not advertised as an operation extension",
    );
    assertions.push("content-version extension support is static and request-free");

    const created = await prove(
      "repository.issues.create.contentVersionFixture",
      ["issueCreateIssue"],
      () =>
        issues.create({
          title: "PanGit content-version contract",
          description: "content version zero",
        }),
    );
    const contentVersion = await prove(
      "issue.native.gitea.contentVersion",
      [],
      () => created.native.gitea(({ issue }) => issue.content_version),
    );
    assert(isContentVersion(contentVersion), "Gitea issue did not expose a valid content version");

    const updated = await prove(
      "repository.issues.update.gitea.contentVersion",
      ["issueEditIssue"],
      () =>
        issues.update(created, { description: "content version one" }).gitea((context) => {
          assert(
            context.issueNumber === created.number,
            "Issue extension context changed identity",
          );
          return { contentVersion };
        }).execute(),
    );
    assert(updated.description === "content version one", "Guarded issue update was not applied");
    assertions.push("a correct Gitea content version performs exactly one guarded update");

    let staleConflict = false;
    const staleCapture = await recorder.capture(async () => {
      try {
        await issues.update(updated, { description: "stale overwrite" }).gitea(() => ({
          contentVersion,
        })).execute();
      } catch (error) {
        staleConflict = error instanceof errors.ConflictError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "repository.issues.update.gitea.staleContentVersion",
        ["issueEditIssue"],
        staleCapture,
      ).evidence,
    );
    assert(staleConflict, "Stale Gitea issue content version was not normalized as a conflict");

    const preserved = await prove(
      "repository.issues.get.afterStaleConflict",
      ["issueGetIssue"],
      () => issues.get(created.number),
    );
    assert(
      preserved.description === "content version one",
      "Stale Gitea issue update overwrote the newer body",
    );
    assertions.push("a stale content version conflicts once and a direct read proves no overwrite");

    const closed = await prove(
      "repository.issues.cleanup.closeContentVersionFixture",
      ["issueEditIssue"],
      () => issues.setState(preserved, "closed"),
    );
    assert(closed.state === "closed", "Content-version fixture cleanup did not close the issue");
  });

  return Object.freeze({
    id: "gitea-extension/issue-content-version",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
