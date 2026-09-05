import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  AuthenticationError,
  OperationAbortedError,
} from "../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import { OAuthCallbackError } from "../../../../../../../packages/pangit/src/fluent-api/auth/OAuthCallbackError.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { AuthenticationContractFixtures } from "../../../../fluent-api-contracts/authentication/authentication-contract-fixtures.ts";

type AuthenticationContractInput<
  TVersion extends ProviderVersion<"forgejo">,
> = {
  readonly provider: "forgejo";
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly webBaseUrl: string;
  readonly token: string;
  readonly fixtures: AuthenticationContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise PAT, Basic/TOTP, and a complete browser authorization-code OAuth flow. */
export async function runAuthenticationContract<
  const TVersion extends ProviderVersion<"forgejo">,
>(
  t: Deno.TestContext,
  input: AuthenticationContractInput<TVersion>,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();
  const connection = await createClient(input.provider, input.version, {
    baseUrl: input.apiUrl,
    webBaseUrl: input.webBaseUrl,
    beforeRequest: recorder.beforeRequest,
  });
  const prove = async <TValue>(
    operation: string,
    expected: readonly string[],
    action: () => Promise<TValue>,
  ): Promise<TValue> => {
    const proof = proveRequestSequence(operation, expected, await recorder.capture(action));
    requestEvidence.push(proof.evidence);
    return proof.value;
  };

  const passed = await t.step("core/authentication", async () => {
    const pat = await prove(
      "authorizeToken",
      ["userGetCurrent"],
      () => connection.auth.token(input.token),
    );
    assert(
      pat.provider === input.provider && pat.version === input.version,
      "PAT authorization changed the selected adapter",
    );

    for (
      const [operation, authorize] of [
        ["authorizeToken.invalid", () => connection.auth.token(input.fixtures.invalidSecret)],
        [
          "authorizeBasic.invalid",
          () =>
            connection.auth.basic({
              username: input.fixtures.username,
              password: input.fixtures.invalidSecret,
            }).authorize(),
        ],
      ] as const
    ) {
      let error: unknown;
      try {
        await prove(operation, ["userGetCurrent"], authorize);
      } catch (caught) {
        error = caught;
      }
      assert(error instanceof AuthenticationError, `${operation} did not normalize authentication`);
      assert(
        !String((error as Error).message).includes(input.fixtures.invalidSecret),
        `${operation} leaked credentials`,
      );
    }
    assertions.push("PAT and invalid credential paths use one identity verification request");

    const basic = await prove("authorizeBasic", ["userGetCurrent"], () =>
      connection.auth.basic({
        username: input.fixtures.username,
        password: input.fixtures.password,
      }).authorize());
    assert(basic.provider === input.provider, "Basic authorization returned the wrong provider");

    let challenged = false;
    try {
      await prove("authorizeBasic.totpChallenge", ["userGetCurrent"], () =>
        connection.auth.basic({
          username: input.fixtures.totp.username,
          password: input.fixtures.totp.password,
        }).authorize());
    } catch (error) {
      challenged = error instanceof AuthenticationError;
    }
    assert(challenged, "TOTP account accepted Basic credentials without the provider extension");

    const oneTimePassword = await input.fixtures.totp.nextOneTimePassword();
    const totp = await prove(
      "authorizeBasic.totp",
      ["userGetCurrent"],
      () =>
        connection.auth.basic({
          username: input.fixtures.totp.username,
          password: input.fixtures.totp.password,
        }).forgejo(() => ({ oneTimePassword })).authorize(),
    );
    assert(totp.provider === input.provider, "TOTP authorization returned the wrong provider");
    assertions.push("Basic authentication and the narrow Forgejo TOTP extension are live-proven");

    const login = connection.auth.login({
      clientId: input.fixtures.oauth.clientId,
      clientSecret: input.fixtures.oauth.clientSecret,
      callbackUrl: input.fixtures.oauth.callbackUrl,
      scopes: ["read:user", "read:repository"],
    });
    const startCapture = await recorder.capture(() => login.start());
    requestEvidence.push(
      proveRequestSequence("beginOAuth", [], startCapture).evidence,
    );
    const start = startCapture.value;
    assert(start.url.pathname === "/login/oauth/authorize", "OAuth used the wrong provider path");
    assert(start.url.searchParams.get("state") === start.transaction.state, "OAuth state differs");
    assert(
      start.url.searchParams.get("code_challenge_method") === "S256" &&
        (start.url.searchParams.get("code_challenge")?.length ?? 0) > 20,
      "OAuth PKCE challenge is missing",
    );

    let mismatchRejected = false;
    const mismatchCapture = await recorder.capture(async () => {
      try {
        await login.authorize(
          new Request(
            `${input.fixtures.oauth.callbackUrl}&state=wrong&code=never-exchanged`,
          ),
          start.transaction,
        );
      } catch (error) {
        mismatchRejected = error instanceof OAuthCallbackError && error.code === "state_mismatch";
      }
    });
    requestEvidence.push(
      proveRequestSequence("oauthStateMismatch", [], mismatchCapture).evidence,
    );
    assert(mismatchRejected, "OAuth state mismatch reached token exchange");

    const callbackUrl = await input.fixtures.oauth.authorize(start.url);
    const oauth = await prove(
      "authorizeOAuthCallback",
      ["raw:POST", "userGetCurrent"],
      () => login.authorize(new Request(callbackUrl), start.transaction),
    );
    assert(
      oauth.authorization.method === "oauth" &&
        oauth.authorization.tokenType.toLowerCase() === "bearer",
      "OAuth callback did not return bearer authorization metadata",
    );
    assertions.push("OAuth state, PKCE, browser grant, exchange, and identity verification pass");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await connection.auth.token(input.token, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("authorizeToken.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Preflight authentication cancellation was not normalized");
    assertions.push("authentication cancellation makes zero provider requests");
  });

  return Object.freeze({
    id: "core/authentication",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
