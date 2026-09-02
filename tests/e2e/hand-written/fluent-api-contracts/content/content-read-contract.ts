import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import {
  OperationAbortedError,
  ValidationError,
} from "../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../request-recorder.ts";
import type { ContentContractFixtures } from "./content-contract-fixtures.ts";

type ContentContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: ContentContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function bytesEqual(actual: Uint8Array | undefined, expected: readonly number[]): boolean {
  return actual !== undefined && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

/** Exercise direct path reads, one-request batches, and bounded directory traversal. */
export async function runContentReadContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: ContentContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/content-reads", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    const text = await prove(
      "readContent.text",
      ["repoGetContentsExt"],
      () => repository.content.read(input.fixtures.text.path, { ref: input.fixtures.ref }),
    );
    assert(
      text.kind === "file" &&
        new TextDecoder().decode(text.bytes) === input.fixtures.text.value,
      "Direct text read returned the wrong bytes",
    );
    const binary = await prove(
      "readContent.binary",
      ["repoGetContentsExt"],
      () => repository.content.read(input.fixtures.binary.path, { ref: input.fixtures.ref }),
    );
    assert(
      binary.kind === "file" && bytesEqual(binary.bytes, input.fixtures.binary.value),
      "Direct binary read returned the wrong bytes",
    );
    const empty = await prove(
      "readContent.empty",
      ["repoGetContentsExt"],
      () => repository.content.read(input.fixtures.emptyPath, { ref: input.fixtures.ref }),
    );
    assert(empty.kind === "file" && empty.bytes?.length === 0, "Empty file was not empty");
    const unicode = await prove(
      "readContent.unicode",
      ["repoGetContentsExt"],
      () => repository.content.read(input.fixtures.unicodePath, { ref: input.fixtures.ref }),
    );
    assert(unicode.path === input.fixtures.unicodePath, "Unicode path was not preserved");
    assertions.push("text, binary, empty, Unicode, and nested paths use one direct request each");

    const batchPaths = [
      input.fixtures.text.path,
      input.fixtures.binary.path,
      input.fixtures.text.path,
      "missing.txt",
    ];
    const batch = await prove(
      "readFiles",
      ["repoGetFileContentsPost"],
      () => repository.content.readFiles(batchPaths, { ref: input.fixtures.ref, maxItems: 10 }),
    );
    assert(
      batch.map((item) => item.path).join("|") === batchPaths.join("|"),
      "Batch read did not restore duplicate input order",
    );
    assert(batch[3].unavailable === "missing", "Batch read did not preserve missing-path state");
    assert(
      bytesEqual(batch[0].content?.bytes, [...new TextEncoder().encode(input.fixtures.text.value)]),
      "Batch text bytes changed",
    );
    assertions.push("batch reads deduplicate one provider request and restore caller order");

    const directory = await prove(
      "getDirectory",
      ["repoGetContentsExt"],
      () =>
        repository.content.getDirectory(input.fixtures.nestedDirectory, {
          ref: input.fixtures.ref,
        }),
    );
    assert(directory.kind === "directory", "Directory lookup returned a non-directory");
    const entries = await prove(
      "listDirectory",
      ["repoGetContentsExt"],
      () =>
        repository.content.listDirectory(input.fixtures.nestedDirectory, {
          ref: input.fixtures.ref,
        }),
    );
    assert(
      entries.some((entry) => entry.path === input.fixtures.nestedPath),
      "Nested file missing",
    );
    const recursive = await prove(
      "listDirectory.recursive",
      ["repoGetContentsExt", "repoGetContentsExt"],
      () =>
        repository.content.listDirectory(input.fixtures.nestedDirectory, {
          ref: input.fixtures.ref,
          recursive: true,
          maxDepth: 2,
          maxItems: 10,
          concurrency: 2,
        }),
    );
    assert(
      recursive.some((entry) => entry.path === input.fixtures.deepPath),
      "Recursive file missing",
    );
    const collapsed = await prove(
      "listDirectory.collapseSingleFolders",
      ["repoGetContentsExt", "repoGetContentsExt", "repoGetContentsExt"],
      () =>
        repository.content.listDirectory(input.fixtures.chainDirectory, {
          ref: input.fixtures.ref,
          collapseSingleFolders: true,
          maxDepth: 3,
        }),
    );
    assert(collapsed.length === 1 && collapsed[0].kind === "file", "Folder chain did not collapse");
    assertions.push("directory and recursive reads visit only the requested bounded subtree");

    const metadata = await prove(
      "readPathMetadataBatch.firstParent",
      ["repoGetSingleCommit", "repoGetContentsExt", "repoGetContentsExt"],
      () =>
        repository.content.readPathMetadataBatch([input.fixtures.nestedPath], {
          ref: input.fixtures.ref,
          compareFirstParent: true,
          maxItems: 2,
          concurrency: 1,
        }),
    );
    assert(
      metadata[0].content?.firstParentSha !== undefined &&
        metadata[0].content?.firstParentSha !== metadata[0].content?.sha,
      "First-parent metadata did not retain the prior blob identity",
    );
    assertions.push(
      "first-parent metadata resolves one commit and only required directory prefixes",
    );

    const linkedRepository = await (await git.container(
      input.fixtures.linkedContent.repository.owner,
    )).repository(input.fixtures.linkedContent.repository.name);
    const symlink = await prove(
      "readSymlink",
      ["repoGetContentsExt"],
      () =>
        linkedRepository.content.readSymlink(input.fixtures.linkedContent.symlinkPath, {
          ref: input.fixtures.linkedContent.ref,
        }),
    );
    assert(
      symlink.kind === "symlink" && symlink.target === input.fixtures.linkedContent.symlinkTarget,
      "Symlink read did not preserve its raw target",
    );
    const dereferencedSymlink = await prove(
      "readSymlink.internal",
      ["repoGetContentsExt", "repoGetContentsExt"],
      () =>
        linkedRepository.content.readSymlink(input.fixtures.linkedContent.symlinkPath, {
          ref: input.fixtures.linkedContent.ref,
          dereference: "internal",
        }),
    );
    assert(
      dereferencedSymlink.dereferenced?.kind === "file" &&
        new TextDecoder().decode(dereferencedSymlink.dereferenced.bytes) ===
          input.fixtures.linkedContent.symlinkTargetValue,
      "Explicit internal symlink dereference returned the wrong target",
    );
    const mutableBytes = dereferencedSymlink.dereferenced.bytes as Uint8Array;
    mutableBytes[0] = 0;
    assert(
      new TextDecoder().decode(dereferencedSymlink.dereferenced.bytes) ===
        input.fixtures.linkedContent.symlinkTargetValue,
      "Content byte snapshot was mutable through the public entity",
    );
    const submodule = await prove(
      "readSubmodule",
      ["repoGetContentsExt"],
      () =>
        linkedRepository.content.readSubmodule(input.fixtures.linkedContent.submodulePath, {
          ref: input.fixtures.linkedContent.ref,
        }),
    );
    assert(
      submodule.kind === "submodule" &&
        submodule.submoduleUrl === input.fixtures.linkedContent.submoduleUrl &&
        submodule.sha === input.fixtures.linkedContent.submoduleSha,
      "Submodule read did not preserve URL/SHA metadata",
    );
    let externalRejected = false;
    const externalCapture = await recorder.capture(async () => {
      try {
        await linkedRepository.content.readSubmodule(
          input.fixtures.linkedContent.submodulePath,
          { ref: input.fixtures.linkedContent.ref, dereference: "internal" },
        );
      } catch (error) {
        externalRejected = error instanceof ValidationError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "readSubmodule.externalDereference",
        ["repoGetContentsExt"],
        externalCapture,
      ).evidence,
    );
    assert(externalRejected, "External submodule dereference was not rejected locally");
    const internalSubmodule = await prove(
      "readSubmodule.internal",
      ["repoGetContentsExt", "repoGetContentsList"],
      () =>
        linkedRepository.content.readSubmodule(
          input.fixtures.linkedContent.internalSubmodulePath,
          { ref: input.fixtures.linkedContent.ref, dereference: "internal" },
        ),
    );
    assert(
      internalSubmodule.submoduleUrl === input.fixtures.linkedContent.internalSubmoduleUrl &&
        internalSubmodule.dereferenced?.kind === "directory",
      "Internal submodule did not resolve to its repository root",
    );
    assertions.push(
      "linked reads are metadata-only by default; explicit dereference stays inside Gitea",
    );

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const capture = await recorder.capture(async () => {
      try {
        await repository.content.read(input.fixtures.text.path, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(proveRequestSequence("readContent.preflightAbort", [], capture).evidence);
    assert(aborted, "Content cancellation was not normalized");
  });

  return Object.freeze({
    id: "core/content-reads",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
