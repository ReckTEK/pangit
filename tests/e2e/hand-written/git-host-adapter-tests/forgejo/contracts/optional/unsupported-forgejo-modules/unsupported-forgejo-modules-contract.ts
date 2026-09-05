import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../../fluent-api-contracts/request-recorder.ts";

export type UnsupportedForgejoModulesContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove Forgejo's unsupported optional families are static metadata, not callable probes. */
export async function runUnsupportedForgejoModulesContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: UnsupportedForgejoModulesContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/unsupported-forgejo-modules", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    });

    const deployments = await prove(
      "unsupportedOptionalCapabilities.deploymentsEnvironments",
      [],
      () =>
        Promise.resolve(
          git.unsupportedOptionalCapabilities.support["deployments-environments"],
        ),
    );
    assert(!deployments.supported, "Deployments/environments unexpectedly became supported");
    assert(deployments.operations.length === 0, "Unsupported deployments advertise operations");
    assert(deployments.reason.trim().length > 0, "Unsupported deployments have no reason");

    const gists = await prove(
      "unsupportedOptionalCapabilities.gistsSnippets",
      [],
      () => Promise.resolve(git.unsupportedOptionalCapabilities.support["gists-snippets"]),
    );
    assert(!gists.supported, "Gists/snippets unexpectedly became supported");
    assert(gists.operations.length === 0, "Unsupported gists advertise operations");
    assert(gists.reason.trim().length > 0, "Unsupported gists have no reason");

    const exposedKeys = Object.keys(git.unsupportedOptionalCapabilities);
    assert(
      exposedKeys.length === 1 && exposedKeys[0] === "support",
      "Unsupported metadata object exposes a callable capability method",
    );
    assert(Object.isFrozen(git.unsupportedOptionalCapabilities), "Unsupported metadata is mutable");
    assert(
      Object.isFrozen(git.unsupportedOptionalCapabilities.support),
      "Unsupported capability map is mutable",
    );
    assertions.push(
      "deployments/environments and gists/snippets are non-callable static unsupported metadata",
    );
    assertions.push("both unsupported capability checks perform zero provider requests");
  });

  return Object.freeze({
    id: "shared-capability/unsupported-forgejo-modules",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
