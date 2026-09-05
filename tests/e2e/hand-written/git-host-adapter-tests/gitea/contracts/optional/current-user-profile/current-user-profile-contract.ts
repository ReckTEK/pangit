import {
  createClient,
  errors,
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
import type { CurrentUserProfileContractFixtures } from "../../../../../fluent-api-contracts/optional/current-user-profile/current-user-profile-contract-fixtures.ts";

export type CurrentUserProfileContractInput<
  TProvider extends "gitea",
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: CurrentUserProfileContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise the direct authenticated-user profile and its failure boundaries. */
export async function runCurrentUserProfileContract<
  const TProvider extends "gitea",
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: CurrentUserProfileContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/current-user-profile", async () => {
    const unprivileged = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    });
    const support = await prove(
      "currentUserProfile.support",
      [],
      () => Promise.resolve(unprivileged.currentUserProfile.support),
    );
    assert(support.supported, "Current-user profiles are not advertised as supported");
    assert(support.current === "direct", "Current-user profile lookup is not direct");
    assertions.push("capability support is static and performs zero provider requests");

    const git = await unprivileged.auth.token(input.token);
    const profile = await prove(
      "currentUserProfile.current",
      ["userGetCurrent"],
      () => git.currentUserProfile.current(),
    );
    assert(profile.id.trim().length > 0, "Current-user profile has no identity");
    assert(
      profile.username === input.fixtures.expectedUsername,
      "Current-user profile returned the wrong username",
    );
    assert(Object.isFrozen(profile), "Current-user profile entity is mutable");

    const nativeLogin = await prove(
      "currentUserProfile.native.gitea",
      [],
      () => profile.native.gitea(({ currentUserProfile }) => currentUserProfile.login),
    );
    assert(nativeLogin === profile.username, "Current-user native payload was not retained");
    assertions.push("authorized normalized and native identity use one direct provider request");

    let unauthenticated = false;
    const unauthorizedCapture = await recorder.capture(async () => {
      try {
        await unprivileged.currentUserProfile.current();
      } catch (error) {
        unauthenticated = error instanceof errors.AuthenticationError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "currentUserProfile.current.unauthorized",
        ["userGetCurrent"],
        unauthorizedCapture,
      ).evidence,
    );
    assert(unauthenticated, "Unauthorized profile lookup was not normalized");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await git.currentUserProfile.current({ signal: controller.signal });
      } catch (error) {
        aborted = error instanceof errors.OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("currentUserProfile.current.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Current-user profile cancellation was not normalized");
    assertions.push("unauthorized lookup costs one request and pre-aborted lookup costs zero");
  });

  return Object.freeze({
    id: "shared-capability/current-user-profile",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
