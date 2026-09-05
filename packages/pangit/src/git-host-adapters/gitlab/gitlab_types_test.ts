import { createClient } from "../../fluent-api/FluentClient.ts";
import type { GitLabRestClient as GitLab18 } from "../../generated-rest-clients/gitlab/18.11.11/GitLabRestClient.ts";
import type { GitLabRestClient as GitLab19 } from "../../generated-rest-clients/gitlab/19.3.1/GitLabRestClient.ts";

async function publicTypes() {
  const first = createClient("gitlab", "18.11.11", "https://gitlab.invalid");
  const second = createClient("gitlab", "19.3.1", "https://gitlab.invalid");
  await first.native.gitlab(({ client }) => {
    const exact: GitLab18 = client;
    return exact;
  });
  await second.native.gitlab(({ client }) => {
    const exact: GitLab19 = client;
    return exact;
  });
  // @ts-expect-error GitLab has no Gitea native door.
  first.native.gitea(() => undefined);
  // @ts-expect-error GitLab does not expose the Gitea Basic/TOTP extension.
  first.auth.basic({ username: "name", password: "password" }).gitea(() => ({}));
  // @ts-expect-error Provider versions cannot be mixed.
  createClient("gitlab", "1.27.2", "https://gitlab.invalid");
  const repo = await (await first.container("namespace")).repository("repo");
  const status = repo.statuses.set({ kind: "branch", name: "main" }, {
    context: "ci",
    state: "pending",
  });
  status.gitlab(() => ({ state: "running" }));
  // @ts-expect-error Gitea state is not a GitLab native state.
  status.gitlab(() => ({ state: "warning" }));
  // @ts-expect-error Wrong-provider operation extension.
  status.gitea(() => ({ state: "skipped" }));
}
Deno.test("GitLab public type assertions compile without executing requests", () => {
  void publicTypes;
});
