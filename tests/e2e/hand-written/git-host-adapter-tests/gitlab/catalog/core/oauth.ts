import { GitLabOAuthFixture } from "../../GitLabOAuthFixture.ts";
import { createClient } from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreOauth = async (f: GitLabE2EFixtureDriver) => {
  const callbackUrl = "http://127.0.0.1/pangit-callback";
  const app = await f.raw("POST", "/applications", {
    name: f.prefix,
    redirect_uri: callbackUrl,
    scopes: "api read_user",
    confidential: true,
  });
  try {
    const root = await createClient("gitlab", f.version, {
      baseUrl: f.apiUrl,
      beforeRequest: f.recorder.beforeRequest,
    });
    const login = root.auth.login({
      clientId: String(app.application_id),
      clientSecret: String(app.secret),
      callbackUrl,
      scopes: ["api", "read_user"],
    });
    const start = await f.prove("OAuth begin performs no HTTP", [], () => login.start());
    f.equal(start.url.searchParams.get("code_challenge_method"), "S256", "PKCE uses SHA-256");
    const browser = new GitLabOAuthFixture(f.apiUrl, "root", f.password);
    await browser.login();
    const callback = await browser.authorize(start.url);
    const authorized = await login.authorize(callback, start.transaction);
    f.equal(
      (await authorized.currentUserProfile.current()).username,
      "root",
      "Real OAuth code exchange verifies identity",
    );
    f.assert(
      authorized.authorization.accessToken && authorized.authorization.refreshToken,
      "OAuth token metadata retained",
    );
    await f.prove(
      "OAuth wrong state fails before transport",
      [],
      () =>
        f.rejects(() =>
          login.authorize(
            new Request(`${callbackUrl}?state=wrong&code=ignored`),
            start.transaction,
          ), "OAuthCallbackError"),
    );
  } finally {
    await f.raw("DELETE", `/applications/${app.id}`);
  }
};
