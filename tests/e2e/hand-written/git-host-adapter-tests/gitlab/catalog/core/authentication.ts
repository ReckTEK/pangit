import { createClient } from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreAuthentication = async (f: GitLabE2EFixtureDriver) => {
  const root = await createClient("gitlab", f.version, {
    baseUrl: `${f.apiUrl}/api/v4`,
    beforeRequest: f.recorder.beforeRequest,
  });
  const client = await f.prove("token verifies current user once", [
    "gitlab-supplement:GET:/user",
  ], () => root.auth.token(f.token));
  f.equal((await client.currentUserProfile.current()).username, "root", "Verified identity");
  await f.prove(
    "Basic is unsupported before HTTP",
    [],
    () =>
      f.rejects(
        () => root.auth.basic({ username: "root", password: "invalid" }).authorize(),
        "CapabilityUnavailableError",
      ),
  );
  await f.rejects(() => root.auth.token("invalid-token"), "AuthenticationError");
  await f.prove("Construction and native access are lazy", [], async () => {
    const same = await createClient("gitlab", f.version, {
      baseUrl: f.apiUrl,
      beforeRequest: f.recorder.beforeRequest,
    });
    await same.native.gitlab(({ client }) => {
      f.assert(
        typeof client.getApiV4Projects === "function",
        "Exact GitLab native client available",
      );
    });
  });
};
