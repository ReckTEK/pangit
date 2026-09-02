import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import {
  ConflictError,
  OperationAbortedError,
  ValidationError,
} from "../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../request-recorder.ts";
import type { FileChangeContractFixtures } from "./content-contract-fixtures.ts";

type FileChangeContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: FileChangeContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise atomic multi-file changes and local batch validation. */
export async function runFileChangeContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: FileChangeContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/file-change-commits", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    const committed = await prove(
      "commitFileChanges.mixed",
      ["repoGetFileContentsPost", "repoChangeFiles"],
      () =>
        repository.content.commitChanges({
          branch: input.fixtures.branch,
          message: "PanGit atomic mixed file change",
          changes: [
            { operation: "create", path: input.fixtures.createdPath, content: "created\n" },
            { operation: "update", path: input.fixtures.updatePath, content: "updated\n" },
            {
              operation: "move",
              fromPath: input.fixtures.movePath,
              path: input.fixtures.movedPath,
            },
            { operation: "delete", path: input.fixtures.deletePath },
          ],
        }).execute(),
    );
    assert(
      committed.parents.includes(input.fixtures.originalHeadSha),
      "Atomic file-change commit has the wrong parent",
    );
    const verified = await prove(
      "readFiles.afterMixedChange",
      ["repoGetFileContentsPost"],
      () =>
        repository.content.readFiles([
          input.fixtures.createdPath,
          input.fixtures.updatePath,
          input.fixtures.movePath,
          input.fixtures.movedPath,
          input.fixtures.deletePath,
        ], { ref: input.fixtures.branch, maxItems: 10 }),
    );
    assert(verified[0].content !== undefined, "Created path is missing");
    assert(
      new TextDecoder().decode(verified[1].content?.bytes) === "updated\n",
      "Updated path has the wrong bytes",
    );
    assert(verified[2].unavailable === "missing", "Moved source still exists");
    assert(verified[3].content !== undefined, "Moved destination is missing");
    assert(verified[4].unavailable === "missing", "Deleted path still exists");
    assertions.push(
      "mixed create/update/move/delete is one commit with at most one batch pre-read",
    );

    const branched = await prove(
      "commitFileChanges.newBranch",
      ["repoChangeFiles"],
      () =>
        repository.content.commitChanges({
          branch: input.fixtures.branch,
          newBranch: input.fixtures.newBranch,
          message: "PanGit new branch file change",
          changes: [{ operation: "create", path: "new-branch.txt", content: "branch\n" }],
        }).execute(),
    );
    const branch = await prove(
      "getNewFileChangeBranch",
      ["repoGetBranch"],
      () => repository.branches.get(input.fixtures.newBranch),
    );
    assert(branch.sha === branched.sha, "File-change new branch does not point at its commit");
    assertions.push("a caller-selected new branch is created by the same batch mutation");

    let staleGuardConflict = false;
    try {
      await prove(
        "commitFileChanges.staleShaGuard",
        ["repoGetFileContentsPost"],
        () =>
          repository.content.commitChanges({
            branch: input.fixtures.branch,
            message: "stale guard must fail",
            changes: [{
              operation: "update",
              path: input.fixtures.updatePath,
              content: "must not overwrite\n",
              sha: "0000000000000000000000000000000000000000",
            }],
          }).execute(),
      );
    } catch (error) {
      staleGuardConflict = error instanceof ConflictError;
    }
    assert(staleGuardConflict, "A stale Gitea SHA guard overwrote content");
    assertions.push("stale file SHA guards prevent overwriting newer content");

    for (
      const [operation, changes] of [
        ["empty", []],
        [
          "duplicate",
          [
            { operation: "create" as const, path: "duplicate.txt", content: "one" },
            { operation: "create" as const, path: "duplicate.txt", content: "two" },
          ],
        ],
      ] as const
    ) {
      let rejected = false;
      const capture = await recorder.capture(async () => {
        try {
          await repository.content.commitChanges({
            branch: input.fixtures.branch,
            message: "invalid fixture",
            changes,
          }).execute();
        } catch (error) {
          rejected = error instanceof ValidationError;
        }
      });
      requestEvidence.push(
        proveRequestSequence(`commitFileChanges.invalid.${operation}`, [], capture).evidence,
      );
      assert(rejected, `Invalid ${operation} file batch was accepted`);
    }
    assertions.push("invalid local file batches make zero provider requests");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await repository.content.commitChanges({
          branch: input.fixtures.branch,
          message: "aborted fixture",
          changes: [{ operation: "create", path: "aborted.txt", content: "never" }],
        }).execute({ signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("commitFileChanges.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "File-change cancellation was not normalized");
  });

  return Object.freeze({
    id: "core/file-change-commits",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
