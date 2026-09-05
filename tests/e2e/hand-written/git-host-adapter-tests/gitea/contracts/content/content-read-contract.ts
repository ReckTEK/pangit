import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  ContentReadError,
  OperationAbortedError,
  ValidationError,
} from "../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { ContentContractFixtures } from "../../../../fluent-api-contracts/content/content-contract-fixtures.ts";

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

async function expectReadError(action: () => unknown, reason: string): Promise<void> {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof ContentReadError && error.reason === reason,
      `Expected ContentReadError(${reason}), received ${String(error)}`,
    );
    return;
  }
  throw new Error(`Expected ContentReadError(${reason})`);
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
  const rawFileRefs: (string | null)[] = [];
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
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest(request, operation, context) {
        if (operation.id === "repoGetRawFile") {
          rawFileRefs.push(new URL(request.url).searchParams.get("ref"));
        }
        return recorder.beforeRequest(request, operation, context);
      },
    })).auth.token(input.token);
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

    const binaryBytes = await prove(
      "readBytes.binary",
      ["repoGetContentsExt"],
      () => repository.content.readBytes(input.fixtures.binary.path, { ref: input.fixtures.ref }),
    );
    assert(bytesEqual(binaryBytes, input.fixtures.binary.value), "readBytes changed binary data");
    const plainText = await prove(
      "readText.text",
      ["repoGetContentsExt"],
      () => repository.content.readText(input.fixtures.text.path, { ref: input.fixtures.ref }),
    );
    assert(plainText === input.fixtures.text.value, "readText changed text data");
    const unicodeText = await prove(
      "readText.unicode",
      ["repoGetContentsExt"],
      () => repository.content.readText(input.fixtures.unicodePath, { ref: input.fixtures.ref }),
    );
    assert(unicodeText === input.fixtures.unicodeValue, "readText changed Unicode data");
    const emptyText = await prove(
      "readText.empty",
      ["repoGetContentsExt"],
      () => repository.content.readText(input.fixtures.emptyPath, { ref: input.fixtures.ref }),
    );
    assert(emptyText === "", "readText did not preserve the empty file");
    const json = await prove(
      "readJson",
      ["repoGetContentsExt"],
      () => repository.content.readJson(input.fixtures.json.path, { ref: input.fixtures.ref }),
    );
    assert(
      JSON.stringify(json) === JSON.stringify(input.fixtures.json.value),
      "readJson changed data",
    );
    const parentText = await prove(
      "readText.parentRef",
      ["repoGetContentsExt"],
      () =>
        repository.content.readText(input.fixtures.nestedPath, { ref: input.fixtures.parentRef }),
    );
    const currentText = await prove(
      "readText.currentRef",
      ["repoGetContentsExt"],
      () => repository.content.readText(input.fixtures.nestedPath, { ref: input.fixtures.ref }),
    );
    assert(parentText === "parent\n" && currentText === "current\n", "readText ignored its ref");
    await prove("readText.invalidUtf8", ["repoGetContentsExt"], () =>
      expectReadError(
        () => repository.content.readText(input.fixtures.binary.path, { ref: input.fixtures.ref }),
        "invalid-utf8",
      ));
    for (const path of [input.fixtures.invalidJsonPath, input.fixtures.emptyPath]) {
      await prove(`readJson.invalid:${path}`, ["repoGetContentsExt"], () =>
        expectReadError(
          () => repository.content.readJson(path, { ref: input.fixtures.ref }),
          "invalid-json",
        ));
    }
    assertions.push("byte, UTF-8 text, and JSON conveniences preserve refs with one request each");

    for (const path of [input.fixtures.image.path, input.fixtures.image.extensionlessPath]) {
      const image = await prove(
        `readBlob.image:${path}`,
        ["repoGetContentsExt", "repoGetRawFile"],
        () => repository.content.readBlob(path, { ref: input.fixtures.branch }),
      );
      assert(image instanceof globalThis.Blob, "readBlob did not return a standard Web Blob");
      assert(image.type === "image/png", "PNG MIME type was not preserved");
      assert(
        bytesEqual(new Uint8Array(await image.arrayBuffer()), input.fixtures.image.bytes),
        "PNG bytes changed in the Web Blob",
      );
      assert(
        rawFileRefs.at(-1) === input.fixtures.parentRef,
        "Raw file read was not pinned to the file's last commit",
      );
    }
    const jsonWebBlob = await prove(
      "readBlob.jsonPathFallback",
      ["repoGetContentsExt", "repoGetRawFile"],
      () => repository.content.readBlob(input.fixtures.json.path, { ref: input.fixtures.ref }),
    );
    assert(
      jsonWebBlob.type === "application/json",
      "Coerced JSON MIME did not fall back to its path",
    );
    assert(
      await jsonWebBlob.text() === JSON.stringify(input.fixtures.json.value),
      "Web Blob JSON bytes changed",
    );
    const emptyWebBlob = await prove(
      "readBlob.empty",
      ["repoGetContentsExt", "repoGetRawFile"],
      () => repository.content.readBlob(input.fixtures.emptyPath, { ref: input.fixtures.ref }),
    );
    assert(
      emptyWebBlob.type === "text/plain" && emptyWebBlob.size === 0,
      "Empty text Web Blob changed",
    );
    const currentWebBlob = await prove(
      "readBlob.branchRef",
      ["repoGetContentsExt", "repoGetRawFile"],
      () => repository.content.readBlob(input.fixtures.nestedPath, { ref: input.fixtures.branch }),
    );
    assert(await currentWebBlob.text() === "current\n", "Web Blob ignored its branch ref");
    assert(rawFileRefs.at(-1) === input.fixtures.ref, "Raw branch read was not commit-pinned");
    const priorWebBlob = await prove(
      "readBlob.parentRef",
      ["repoGetContentsExt", "repoGetRawFile"],
      () =>
        repository.content.readBlob(input.fixtures.nestedPath, { ref: input.fixtures.parentRef }),
    );
    assert(await priorWebBlob.text() === "parent\n", "Web Blob ignored its historical ref");
    await prove(
      "readBlob.unknownMediaType",
      ["repoGetContentsExt", "repoGetRawFile"],
      () =>
        expectReadError(
          () =>
            repository.content.readBlob(input.fixtures.unknownBinaryPath, {
              ref: input.fixtures.ref,
            }),
          "unknown-media-type",
        ),
    );
    const genericWebBlob = await prove(
      "readBlob.explicitOctetStream",
      ["repoGetContentsExt", "repoGetRawFile"],
      () =>
        repository.content.readBlob(input.fixtures.unknownBinaryPath, {
          ref: input.fixtures.ref,
          type: "application/octet-stream",
        }),
    );
    assert(
      genericWebBlob.type === "application/octet-stream",
      "Explicit generic MIME was rejected",
    );
    assert(
      bytesEqual(new Uint8Array(await genericWebBlob.arrayBuffer()), input.fixtures.binary.value),
      "Explicit MIME changed binary Web Blob bytes",
    );
    const hintedWebBlob = await prove(
      "readBlob.fileNameHint",
      ["repoGetContentsExt", "repoGetRawFile"],
      () =>
        repository.content.readBlob(input.fixtures.unknownBinaryPath, {
          ref: input.fixtures.ref,
          fileName: "payload.pdf",
        }),
    );
    assert(hintedWebBlob.type === "application/pdf", "Web Blob ignored its filename MIME hint");
    await prove("readBlob.invalidMediaType", [], () =>
      expectReadError(
        () => repository.content.readBlob(input.fixtures.text.path, { type: "not a MIME type" }),
        "invalid-media-type",
      ));
    await prove("readBlob.invalidFileName", [], async () => {
      try {
        await repository.content.readBlob(input.fixtures.text.path, { fileName: " " });
      } catch (error) {
        assert(error instanceof ValidationError, "Invalid filename hint was not validated locally");
        return;
      }
      throw new Error("Empty filename hint was accepted");
    });
    assertions.push(
      "Web Blob reads preserve MIME and exact bytes using metadata plus a commit-pinned raw request",
    );
    assertions.push(
      "extensionless PNG uses provider MIME; JSON uses path fallback; unknown MIME needs an explicit hint",
    );

    await prove("content.bodyConversions", [], async () => {
      assert(text.text() === input.fixtures.text.value, "Content text conversion changed data");
      assert(
        unicode.text() === input.fixtures.unicodeValue,
        "Content Unicode conversion changed data",
      );
      assert(empty.text() === "", "Empty content converted to nonempty text");
      assert(empty.arrayBuffer().byteLength === 0, "Empty content converted to nonempty buffer");
      const buffer = binary.arrayBuffer();
      assert(
        bytesEqual(new Uint8Array(buffer), input.fixtures.binary.value),
        "Content arrayBuffer conversion changed data",
      );
      new Uint8Array(buffer)[0] ^= 0xff;
      assert(
        bytesEqual(binary.bytes, input.fixtures.binary.value),
        "Content buffer was not a copy",
      );
      await expectReadError(() => binary.text(), "invalid-utf8");
      await expectReadError(() => empty.json(), "invalid-json");
      const webBlob = text.blob();
      assert(
        webBlob instanceof globalThis.Blob && webBlob.type === "text/plain",
        "Content Web Blob type changed",
      );
      const webBytes = new Uint8Array(await webBlob.arrayBuffer());
      webBytes[0] ^= 0xff;
      assert(await webBlob.text() === input.fixtures.text.value, "Content Web Blob was mutable");
      assert(
        text.text() === input.fixtures.text.value,
        "Web Blob conversion mutated its content entity",
      );
    });
    const metadataOnly = await prove(
      "readContent.metadataOnly",
      ["repoGetContentsExt"],
      () =>
        repository.content.read(input.fixtures.text.path, {
          ref: input.fixtures.ref,
          includeBytes: false,
        }),
    );
    await prove("content.metadataOnly.bodyErrors", [], async () => {
      await expectReadError(() => metadataOnly.text(), "bytes-unavailable");
      await expectReadError(() => metadataOnly.json(), "bytes-unavailable");
      await expectReadError(() => metadataOnly.arrayBuffer(), "bytes-unavailable");
      await expectReadError(() => metadataOnly.blob(), "bytes-unavailable");
    });
    assertions.push("entity conversions perform no requests and return defensive byte copies");
    assertions.push("metadata-only bodies, invalid UTF-8, and invalid JSON fail explicitly");

    const batchPaths = [
      input.fixtures.text.path,
      input.fixtures.binary.path,
      input.fixtures.text.path,
      "missing.txt",
      input.fixtures.json.path,
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
    await prove("readFiles.bodyConversions", [], () => {
      assert(
        batch[0].content?.text() === input.fixtures.text.value,
        "Batch text conversion failed",
      );
      assert(
        JSON.stringify(batch[4].content?.json()) === JSON.stringify(input.fixtures.json.value),
        "Batch JSON conversion failed",
      );
      const parsed = batch[4].content?.json() as { title: string };
      parsed.title = "changed by caller";
      assert(
        JSON.stringify(batch[4].content?.json()) === JSON.stringify(input.fixtures.json.value),
        "JSON conversion exposed mutable entity state",
      );
      return Promise.resolve();
    });

    const directory = await prove(
      "getDirectory",
      ["repoGetContentsExt"],
      () =>
        repository.content.getDirectory(input.fixtures.nestedDirectory, {
          ref: input.fixtures.ref,
        }),
    );
    assert(directory.kind === "directory", "Directory lookup returned a non-directory");
    await prove("content.directory.bodyErrors", [], async () => {
      await expectReadError(() => directory.text(), "not-a-file");
      await expectReadError(() => directory.json(), "not-a-file");
      await expectReadError(() => directory.arrayBuffer(), "not-a-file");
      await expectReadError(() => directory.blob({ type: "text/plain" }), "not-a-file");
    });
    await prove("readBlob.directory", ["repoGetContentsExt"], () =>
      expectReadError(
        () =>
          repository.content.readBlob(input.fixtures.nestedDirectory, { ref: input.fixtures.ref }),
        "not-a-file",
      ));
    await prove("readText.directory", ["repoGetContentsExt"], () =>
      expectReadError(
        () =>
          repository.content.readText(input.fixtures.nestedDirectory, { ref: input.fixtures.ref }),
        "not-a-file",
      ));
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
    for (
      const [method, action] of [
        [
          "readBytes",
          () =>
            repository.content.readBytes(input.fixtures.text.path, { signal: controller.signal }),
        ],
        [
          "readText",
          () =>
            repository.content.readText(input.fixtures.text.path, { signal: controller.signal }),
        ],
        [
          "readJson",
          () =>
            repository.content.readJson(input.fixtures.json.path, { signal: controller.signal }),
        ],
        [
          "readBlob",
          () =>
            repository.content.readBlob(input.fixtures.image.path, { signal: controller.signal }),
        ],
      ] as const
    ) {
      await prove(`${method}.preflightAbort`, [], async () => {
        try {
          await action();
        } catch (error) {
          assert(
            error instanceof OperationAbortedError,
            `${method} cancellation was not normalized`,
          );
          return;
        }
        throw new Error(`${method} ignored preflight cancellation`);
      });
    }
  });

  return Object.freeze({
    id: "core/content-reads",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
