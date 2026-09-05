import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  ContentReadError,
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
import type { BlobReadContractFixtures } from "../../../../../fluent-api-contracts/optional/blob-reads/blob-read-contract-fixtures.ts";

export type BlobReadContractInput<
  TProvider extends "forgejo",
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: BlobReadContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function bytesEqual(actual: Readonly<Uint8Array>, expected: Readonly<Uint8Array>): boolean {
  return actual.byteLength === expected.byteLength &&
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

/** Exercise the optional direct SHA-addressed blob capability without content-path discovery. */
export async function runBlobReadContract<
  const TProvider extends "forgejo",
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: BlobReadContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/blob-reads", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    const support = await prove(
      "repository.blobs.support",
      [],
      () => Promise.resolve(repository.blobs.support),
    );
    assert(support.supported, "Blob reads are not advertised as supported");
    assert(support.operations.get === "direct", "Blob get is not advertised as direct");
    assertions.push("capability support is static and performs zero provider requests");

    const blob = await prove(
      "repository.blobs.get",
      ["GetBlob"],
      () => repository.blobs.get(input.fixtures.blob.sha),
    );
    assert(blob.sha === input.fixtures.blob.sha.toLowerCase(), "Blob SHA changed");
    assert(blob.size === input.fixtures.blob.bytes.byteLength, "Blob size changed");
    assert(bytesEqual(blob.bytes, input.fixtures.blob.bytes), "Blob bytes changed");
    assert(Object.isFrozen(blob), "Blob entity is mutable");
    const callerBytes = blob.bytes as Uint8Array;
    callerBytes[0] = callerBytes[0] ^ 0xff;
    assert(
      bytesEqual(blob.bytes, input.fixtures.blob.bytes),
      "Blob byte snapshot was mutable through the public entity",
    );
    assertions.push("known immutable binary bytes are returned by one direct SHA request");

    const bytes = await prove(
      "repository.blobs.readBytes",
      ["GetBlob"],
      () => repository.blobs.readBytes(input.fixtures.blob.sha),
    );
    assert(bytesEqual(bytes, input.fixtures.blob.bytes), "Blob readBytes changed binary data");
    const text = await prove(
      "repository.blobs.readText.unicode",
      ["GetBlob"],
      () => repository.blobs.readText(input.fixtures.text.sha),
    );
    assert(text === input.fixtures.text.value, "Blob readText changed Unicode data");
    const emptyText = await prove(
      "repository.blobs.readText.empty",
      ["GetBlob"],
      () => repository.blobs.readText(input.fixtures.emptySha),
    );
    assert(emptyText === "", "Blob readText did not preserve the empty blob");
    const json = await prove(
      "repository.blobs.readJson",
      ["GetBlob"],
      () => repository.blobs.readJson(input.fixtures.json.sha),
    );
    assert(
      JSON.stringify(json) === JSON.stringify(input.fixtures.json.value),
      "Blob readJson changed data",
    );
    await prove(
      "repository.blobs.readText.invalidUtf8",
      ["GetBlob"],
      () =>
        expectReadError(() => repository.blobs.readText(input.fixtures.blob.sha), "invalid-utf8"),
    );
    await prove(
      "repository.blobs.readJson.invalid",
      ["GetBlob"],
      () =>
        expectReadError(
          () => repository.blobs.readJson(input.fixtures.invalidJsonSha),
          "invalid-json",
        ),
    );
    await prove(
      "repository.blobs.readJson.empty",
      ["GetBlob"],
      () =>
        expectReadError(() => repository.blobs.readJson(input.fixtures.emptySha), "invalid-json"),
    );
    assertions.push("byte, UTF-8 text, and JSON conveniences use one direct SHA request each");

    const png = await prove(
      "repository.blobs.readBlob.imageHint",
      ["GetBlob"],
      () => repository.blobs.readBlob(input.fixtures.image.sha, { fileName: "image.png" }),
    );
    assert(
      png instanceof globalThis.Blob && png.type === "image/png",
      "SHA image MIME hint was ignored",
    );
    assert(
      bytesEqual(new Uint8Array(await png.arrayBuffer()), input.fixtures.image.bytes),
      "SHA Web Blob changed the PNG bytes",
    );
    const jsonWebBlob = await prove(
      "repository.blobs.readBlob.jsonHint",
      ["GetBlob"],
      () => repository.blobs.readBlob(input.fixtures.json.sha, { fileName: "config.json" }),
    );
    assert(jsonWebBlob.type === "application/json", "SHA JSON filename MIME hint was ignored");
    assert(
      await jsonWebBlob.text() === JSON.stringify(input.fixtures.json.value),
      "SHA JSON bytes changed",
    );
    const emptyWebBlob = await prove(
      "repository.blobs.readBlob.emptyHint",
      ["GetBlob"],
      () => repository.blobs.readBlob(input.fixtures.emptySha, { type: "text/plain" }),
    );
    assert(
      emptyWebBlob.type === "text/plain" && emptyWebBlob.size === 0,
      "Empty SHA Web Blob changed",
    );
    const genericWebBlob = await prove(
      "repository.blobs.readBlob.explicitOctetStream",
      ["GetBlob"],
      () =>
        repository.blobs.readBlob(input.fixtures.blob.sha, { type: "application/octet-stream" }),
    );
    assert(
      genericWebBlob.type === "application/octet-stream",
      "SHA explicit generic MIME was ignored",
    );
    assert(
      bytesEqual(new Uint8Array(await genericWebBlob.arrayBuffer()), input.fixtures.blob.bytes),
      "SHA binary Web Blob bytes changed",
    );
    await prove(
      "repository.blobs.readBlob.unknownMediaType",
      ["GetBlob"],
      () =>
        expectReadError(
          () => repository.blobs.readBlob(input.fixtures.json.sha),
          "unknown-media-type",
        ),
    );
    await prove("repository.blobs.readBlob.invalidMediaType", [], () =>
      expectReadError(
        () => repository.blobs.readBlob(input.fixtures.json.sha, { type: "not a MIME type" }),
        "invalid-media-type",
      ));
    await prove("repository.blobs.readBlob.invalidFileName", [], async () => {
      try {
        await repository.blobs.readBlob(input.fixtures.json.sha, { fileName: " " });
      } catch (error) {
        assert(error instanceof ValidationError, "SHA filename hint was not validated locally");
        return;
      }
      throw new Error("Empty SHA filename hint was accepted");
    });
    assertions.push(
      "SHA-addressed Web Blobs preserve bytes and require filename or explicit MIME evidence",
    );

    const textBlob = await prove(
      "repository.blobs.get.text",
      ["GetBlob"],
      () => repository.blobs.get(input.fixtures.text.sha),
    );
    const jsonBlob = await prove(
      "repository.blobs.get.json",
      ["GetBlob"],
      () => repository.blobs.get(input.fixtures.json.sha),
    );
    const emptyBlob = await prove(
      "repository.blobs.get.empty",
      ["GetBlob"],
      () => repository.blobs.get(input.fixtures.emptySha),
    );
    await prove("blob.bodyConversions", [], async () => {
      assert(textBlob.text() === input.fixtures.text.value, "Blob text conversion changed data");
      assert(emptyBlob.text() === "", "Empty blob converted to nonempty text");
      assert(emptyBlob.arrayBuffer().byteLength === 0, "Empty blob converted to nonempty buffer");
      assert(
        JSON.stringify(jsonBlob.json()) === JSON.stringify(input.fixtures.json.value),
        "Blob JSON conversion changed data",
      );
      const parsed = jsonBlob.json() as { title: string };
      parsed.title = "changed by caller";
      assert(
        JSON.stringify(jsonBlob.json()) === JSON.stringify(input.fixtures.json.value),
        "Blob JSON conversion exposed mutable entity state",
      );
      const buffer = blob.arrayBuffer();
      assert(
        bytesEqual(new Uint8Array(buffer), input.fixtures.blob.bytes),
        "Blob buffer changed data",
      );
      new Uint8Array(buffer)[0] ^= 0xff;
      assert(bytesEqual(blob.bytes, input.fixtures.blob.bytes), "Blob arrayBuffer was not a copy");
      await expectReadError(() => blob.text(), "invalid-utf8");
      await expectReadError(() => emptyBlob.json(), "invalid-json");
      const webBlob = jsonBlob.blob({ fileName: "config.json" });
      assert(
        webBlob instanceof globalThis.Blob && webBlob.type === "application/json",
        "Git blob did not convert to a typed Web Blob",
      );
      const webBytes = new Uint8Array(await webBlob.arrayBuffer());
      webBytes[0] ^= 0xff;
      assert(
        await webBlob.text() === JSON.stringify(input.fixtures.json.value),
        "Web Blob was mutable",
      );
      assert(
        JSON.stringify(jsonBlob.json()) === JSON.stringify(input.fixtures.json.value),
        "Web Blob conversion mutated its Git blob entity",
      );
      await expectReadError(() => jsonBlob.blob(), "unknown-media-type");
      await expectReadError(() => jsonBlob.blob({ type: "not a MIME type" }), "invalid-media-type");
    });
    assertions.push("entity text, JSON, and buffer conversions are zero-request and defensive");

    const nativeSha = await prove(
      "blob.native.forgejo",
      [],
      () => blob.native.forgejo(({ blob: payload }) => Promise.resolve(payload.sha)),
    );
    assert(nativeSha === blob.sha, "Blob native payload was not retained");
    assertions.push("exact native payload access performs zero additional provider requests");

    let missing = false;
    const missingCapture = await recorder.capture(async () => {
      try {
        await repository.blobs.get(input.fixtures.missingSha);
      } catch (error) {
        missing = error instanceof NotFoundError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.blobs.get.missing", ["GetBlob"], missingCapture).evidence,
    );
    assert(missing, "Missing blob was not normalized as NotFoundError");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await repository.blobs.get("not-a-git-object-id");
      } catch (error) {
        invalid = error instanceof ValidationError && error.operation === "getBlob";
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.blobs.get.invalidSha", [], invalidCapture).evidence,
    );
    assert(invalid, "Invalid blob SHA was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await repository.blobs.get(input.fixtures.blob.sha, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.blobs.get.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Blob cancellation was not normalized");
    for (
      const [method, action] of [
        [
          "readBytes",
          () => repository.blobs.readBytes(input.fixtures.blob.sha, { signal: controller.signal }),
        ],
        [
          "readText",
          () => repository.blobs.readText(input.fixtures.text.sha, { signal: controller.signal }),
        ],
        [
          "readJson",
          () => repository.blobs.readJson(input.fixtures.json.sha, { signal: controller.signal }),
        ],
        [
          "readBlob",
          () =>
            repository.blobs.readBlob(input.fixtures.image.sha, {
              signal: controller.signal,
              fileName: "image.png",
            }),
        ],
      ] as const
    ) {
      await prove(`repository.blobs.${method}.preflightAbort`, [], async () => {
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
    assertions.push("absence costs one direct request; invalid and cancelled reads cost zero");
  });

  return Object.freeze({
    id: "shared-capability/blob-reads",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
