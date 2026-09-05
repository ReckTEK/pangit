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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove exact-version generated-client access at fluent client scope without an HTTP request. */
export async function runForgejoNativeClientAccessContract(
  t: Deno.TestContext,
  input: { readonly version: ProviderVersion<"forgejo">; readonly apiUrl: string },
): Promise<FluentApiContractResult> {
  const recorder = new FluentApiRequestRecorder();
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const passed = await t.step("native-access/forgejo/client", async () => {
    const client = await createClient("forgejo", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    });
    const capture = await recorder.capture(() =>
      client.native.forgejo(({ client }) =>
        Promise.resolve({
          constructorName: client.constructor.name,
          hasExactRawOperation: typeof client.repoGet === "function",
        })
      )
    );
    const proof = proveRequestSequence("client.native.forgejo", [], capture);
    requestEvidence.push(proof.evidence);
    assert(proof.value.constructorName === "ForgejoRestClient", "Native client has the wrong type");
    assert(proof.value.hasExactRawOperation, "Native client omitted generated operations");
  });
  return Object.freeze({
    id: "native-access/forgejo/client",
    passed,
    assertions: Object.freeze([
      "client native access exposes the selected generated Forgejo client with zero HTTP requests",
    ]),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
