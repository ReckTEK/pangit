import {
  createClient,
  errors,
  type ProviderVersion,
} from "../../../../../../packages/pangit/src/fluent-api/mod.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../../request-recorder.ts";
import type { IssueContractFixtures } from "./issue-contract-fixtures.ts";

export type IssueContractInput<
  TProvider extends "gitea",
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: IssueContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise the portable issue and issue-comment lifecycle with bounded discovery. */
export async function runIssueContract<
  const TProvider extends "gitea",
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: IssueContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/issues", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const issues = repository.issues;

    const support = await prove(
      "repository.issues.support",
      [],
      () => Promise.resolve(issues.support),
    );
    assert(support.supported, "Issues are not advertised as supported");
    assert(support.operations.list === "one-page", "Issue listing is not one-page bounded");
    assert(support.operations.get === "direct", "Issue lookup is not direct");
    assert(
      support.operations["list-comments"] === "one-page-derived",
      "Issue-comment listing does not advertise its page-derived semantics",
    );
    assertions.push("issue support metadata is static, explicit, and request-free");

    const created = await prove(
      "repository.issues.create",
      ["issueCreateIssue"],
      () =>
        issues.create({
          title: "PanGit shared issue contract",
          description: "created by the live fluent contract",
        }),
    );
    assert(created.number > 0, "Created issue has no positive number");
    assert(created.state === "open", "Created issue is not open");
    assert(Object.isFrozen(created), "Issue entity is mutable");
    assert(Object.isFrozen(created.assignees), "Issue assignees are mutable");
    assert(Object.isFrozen(created.labels), "Issue labels are mutable");

    const direct = await prove(
      "repository.issues.get",
      ["issueGetIssue"],
      () => issues.get(created.number),
    );
    assert(direct.id === created.id, "Direct issue lookup returned the wrong issue");

    const page = await prove(
      "repository.issues.list",
      ["issueListIssues"],
      () => issues.list({ state: "all", limit: 4 }),
    );
    assert(page.items.length <= 4, "Issue page exceeded its requested limit");
    assert(page.items.some((issue) => issue.id === created.id), "Issue page omitted known issue");
    assertions.push("create, direct get, and one bounded list each use one provider request");

    const updated = await prove(
      "repository.issues.update",
      ["issueEditIssue"],
      () =>
        issues.update(created, {
          title: "PanGit shared issue contract updated",
          description: "updated through the portable contract",
        }).execute(),
    );
    assert(updated.title.endsWith("updated"), "Issue title update was not normalized");

    const closed = await prove(
      "repository.issues.setState.closed",
      ["issueEditIssue"],
      () => issues.setState(updated, "closed"),
    );
    assert(closed.state === "closed", "Issue did not close");

    const reopened = await prove(
      "repository.issues.setState.open",
      ["issueEditIssue"],
      () => issues.setState(closed, "open"),
    );
    assert(reopened.state === "open", "Issue did not reopen");
    assertions.push("portable update, close, and reopen are direct mutations");

    const comment = await prove(
      "repository.issues.comments.create",
      ["issueCreateComment"],
      () => issues.comments.create(reopened, { body: "PanGit issue comment" }),
    );
    assert(comment.id.trim().length > 0, "Created issue comment has no identity");
    assert(Object.isFrozen(comment), "Issue-comment entity is mutable");

    const directComment = await prove(
      "repository.issues.comments.get",
      ["issueGetComment"],
      () => issues.comments.get(comment.id),
    );
    assert(directComment.id === comment.id, "Direct comment lookup returned the wrong comment");

    const comments = await prove(
      "repository.issues.comments.list",
      ["issueGetRepoComments"],
      () => issues.comments.list(reopened, { limit: 10 }),
    );
    assert(comments.items.length <= 10, "Issue-comment page exceeded its requested limit");
    assert(
      comments.items.some((candidate) => candidate.id === comment.id),
      "Issue-comment page omitted known comment",
    );

    const editedComment = await prove(
      "repository.issues.comments.update",
      ["issueEditComment"],
      () => issues.comments.update(comment, { body: "PanGit issue comment updated" }),
    );
    assert(editedComment.body.endsWith("updated"), "Issue-comment update was not normalized");

    const nativeTitle = await prove(
      "issue.native.gitea",
      [],
      () => updated.native.gitea(({ issue }) => issue.title),
    );
    assert(nativeTitle === updated.title, "Issue native payload was not retained");
    const nativeCommentBody = await prove(
      "issueComment.native.gitea",
      [],
      () => editedComment.native.gitea(({ issueComment }) => issueComment.body),
    );
    assert(
      nativeCommentBody === editedComment.body,
      "Issue-comment native payload was not retained",
    );
    assertions.push("comment create/get/list/update and native access preserve exact identities");

    await prove(
      "repository.issues.comments.delete",
      ["issueDeleteComment"],
      () => issues.comments.delete(editedComment),
    );
    let missingComment = false;
    const missingCommentCapture = await recorder.capture(async () => {
      try {
        await issues.comments.get(comment.id);
      } catch (error) {
        missingComment = error instanceof errors.NotFoundError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "repository.issues.comments.get.afterDelete",
        ["issueGetComment"],
        missingCommentCapture,
      ).evidence,
    );
    assert(missingComment, "Deleted issue comment was not reported missing");

    let missingIssue = false;
    const missingIssueCapture = await recorder.capture(async () => {
      try {
        await issues.get(created.number + 100_000);
      } catch (error) {
        missingIssue = error instanceof errors.NotFoundError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "repository.issues.get.missing",
        ["issueGetIssue"],
        missingIssueCapture,
      ).evidence,
    );
    assert(missingIssue, "Missing issue was not normalized as NotFoundError");
    assertions.push("comment deletion and missing issue behavior each use one direct lookup proof");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await issues.create({ title: " " });
      } catch (error) {
        invalid = error instanceof errors.ValidationError && error.operation === "createIssue";
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.issues.create.invalidTitle", [], invalidCapture).evidence,
    );
    assert(
      invalid,
      "Blank issue title was not rejected locally as createIssue ValidationError",
    );

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await issues.get(created.number, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof errors.OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.issues.get.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Issue cancellation was not normalized");

    const finalState = await prove(
      "repository.issues.cleanup.close",
      ["issueEditIssue"],
      () => issues.setState(reopened, "closed"),
    );
    assert(finalState.state === "closed", "Issue cleanup did not leave the issue closed");
    assertions.push("invalid and cancelled calls cost zero; deterministic issue cleanup is direct");
  });

  return Object.freeze({
    id: "shared-capability/issues",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
