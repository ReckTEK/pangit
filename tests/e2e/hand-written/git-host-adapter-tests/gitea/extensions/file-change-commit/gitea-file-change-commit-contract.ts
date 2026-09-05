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
import type { GiteaFileChangeCommitFixtures } from "./gitea-file-change-commit-fixtures.ts";

export type GiteaFileChangeCommitContractInput = {
  readonly version: ProviderVersion<"gitea">;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: GiteaFileChangeCommitFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove the typed Gitea file-change extension without widening the common input. */
export async function runGiteaFileChangeCommitContract(
  t: Deno.TestContext,
  input: GiteaFileChangeCommitContractInput,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();

  const passed = await t.step("gitea-extension/file-change-commit", async () => {
    const git = await (await createClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const authorDate = "2025-01-02T03:04:05Z";
    const committerDate = "2025-01-02T03:05:06Z";
    let callbackCount = 0;
    let extensionContext: unknown;

    const capture = await recorder.capture(() =>
      repository.content.commitChanges({
        branch: input.fixtures.branch,
        message: "PanGit Gitea extension authorship",
        author: {
          name: "PanGit E2E Author",
          email: "author@example.invalid",
        },
        changes: [{
          operation: "create",
          path: input.fixtures.createdPath,
          content: "Gitea extension fixture\n",
        }],
      }).gitea((context) => {
        callbackCount++;
        extensionContext = context;
        return {
          forcePush: true,
          signoff: true,
          committer: {
            name: "PanGit E2E Committer",
            email: "committer@example.invalid",
          },
          authorDate,
          committerDate,
        };
      }).execute()
    );
    const proof = proveRequestSequence(
      "commitFileChanges.giteaExtension",
      ["repoChangeFiles"],
      capture,
    );
    requestEvidence.push(proof.evidence);
    const commit = proof.value;

    assert(callbackCount === 1, "File-change extension callback did not run exactly once");
    assert(
      JSON.stringify(extensionContext) === JSON.stringify({
        repositoryFullName: repository.fullName,
        branch: input.fixtures.branch,
        changeCount: 1,
      }),
      "File-change extension received an unsafe or incorrect context",
    );
    assert(
      commit.author?.name === "PanGit E2E Author" &&
        commit.author.email === "author@example.invalid" &&
        commit.author.date === authorDate,
      "Gitea author identity/date were not retained",
    );
    assert(
      commit.committer?.name === "PanGit E2E Committer" &&
        commit.committer.email === "committer@example.invalid" &&
        commit.committer.date === committerDate,
      "Gitea committer identity/date were not retained",
    );
    assert(
      commit.message.includes("Signed-off-by: PanGit E2E Committer <committer@example.invalid>"),
      "Gitea signoff was not present in the created commit",
    );
    assert(Object.isFrozen(commit), "Gitea extension returned a mutable commit snapshot");
    assertions.push(
      "typed context, force update, signoff, committer, and exact dates use one batch mutation",
    );
  });

  return Object.freeze({
    id: "gitea-extension/file-change-commit",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
