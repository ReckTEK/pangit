import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import {
  ConflictError,
  NotFoundError,
  OperationAbortedError,
} from "../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../request-recorder.ts";
import type { TagContractFixtures } from "./tag-contract-fixtures.ts";

type TagContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: TagContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise the one-page and direct provider-neutral tag contract. */
export async function runTagContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: TagContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/tags", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const owner = await git.container(input.fixtures.repository.owner);
    const repository = await owner.repository(input.fixtures.repository.name);

    const page = await prove(
      "listTags",
      ["repoListTags"],
      () => repository.tags.list({ limit: 1 }),
    );
    assert(page.items.length <= 1, "Tag list exceeded its page limit");
    assert(page.items.some((tag) => tag.name === input.fixtures.existingTag), "Known tag missing");
    assertions.push("tag listing fetches exactly one bounded provider page");

    const existing = await prove(
      "getTag",
      ["repoGetTag"],
      () => repository.tags.get(input.fixtures.existingTag),
    );
    assert(existing.sha === input.fixtures.targetSha, "Direct tag lookup returned the wrong SHA");
    let missing = false;
    try {
      await prove(
        "getTag.missing",
        ["repoGetTag"],
        () => repository.tags.get(`${input.fixtures.existingTag}-missing`),
      );
    } catch (error) {
      missing = error instanceof NotFoundError;
    }
    assert(missing, "Missing tag did not throw NotFoundError");
    assertions.push("tag lookup is direct and preserves confirmed absence");

    const created = await prove(
      "createTag",
      ["repoCreateTag"],
      () =>
        repository.tags.create({
          name: input.fixtures.mutationTag,
          target: input.fixtures.targetSha,
          message: "PanGit fluent tag contract",
        }),
    );
    assert(created.annotated === true, "Created annotated tag lost its proven kind");
    assert(created.sha === input.fixtures.targetSha, "Created tag points at the wrong commit");
    const nativeName = await created.native.gitea(({ tag }) => tag.name);
    assert(nativeName === input.fixtures.mutationTag, "Tag native payload was not retained");

    let conflict = false;
    try {
      await prove(
        "createTag.duplicate",
        ["repoCreateTag"],
        () =>
          repository.tags.create({
            name: input.fixtures.mutationTag,
            target: input.fixtures.targetSha,
            message: "duplicate",
          }),
      );
    } catch (error) {
      conflict = error instanceof ConflictError;
    }
    assert(conflict, "Duplicate tag creation did not preserve conflict semantics");
    await prove("deleteTag", ["repoDeleteTag"], () => repository.tags.delete(created));
    assertions.push("tag create/native access/conflict/delete stay direct and immutable");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const capture = await recorder.capture(async () => {
      try {
        await repository.tags.list({ signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(proveRequestSequence("listTags.preflightAbort", [], capture).evidence);
    assert(aborted, "Tag cancellation was not normalized");
  });

  return Object.freeze({
    id: "core/tags",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
