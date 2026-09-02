import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../packages/pangit/src/fluent-api/mod.ts";
import {
  NotFoundError,
  OperationAbortedError,
  ValidationError,
} from "../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../../request-recorder.ts";
import type { BlobReadContractFixtures } from "./blob-read-contract-fixtures.ts";

export type BlobReadContractInput<
  TProvider extends FluentProvider,
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

/** Exercise the optional direct SHA-addressed blob capability without content-path discovery. */
export async function runBlobReadContract<
  const TProvider extends FluentProvider,
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
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
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

    const nativeSha = await prove(
      "blob.native.gitea",
      [],
      () => blob.native.gitea(({ blob: payload }) => Promise.resolve(payload.sha)),
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
    assertions.push("absence costs one direct request; invalid and cancelled reads cost zero");
  });

  return Object.freeze({
    id: "shared-capability/blob-reads",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
