import { createClient } from "../../fluent-api/FluentClient.ts";
import type { FluentClientOptions } from "../../fluent-api/FluentClient.ts";
import { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import { batch } from "./shared.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
function equal(actual: unknown, expected: unknown) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}
async function rejects(action: () => Promise<unknown>, name: string) {
  try {
    await action();
  } catch (error) {
    assert(error instanceof Error);
    equal(error.name, name);
    return error;
  }
  throw new Error(`Expected ${name}`);
}
const sha = "a".repeat(40);
const previous = "b".repeat(40);
const commit = {
  id: sha,
  message: "commit",
  parent_ids: [previous],
  author_name: "Author",
  author_email: "author@example.invalid",
};
const project = {
  id: 2,
  path_with_namespace: "group/nested/repo",
  default_branch: "main",
  visibility: "private",
};
type Step = {
  path: string;
  method?: string;
  status?: number;
  body?: unknown;
  headers?: HeadersInit;
  inspect?: (request: Request) => void | Promise<void>;
};
function harness(
  steps: Step[],
  version: "18.11.11" | "19.3.1" = "19.3.1",
  overrides: Partial<FluentClientOptions> = {},
) {
  const requests: Request[] = [];
  const queue = [...steps];
  const client = createClient("gitlab", version, {
    baseUrl: "https://gitlab.invalid/api/v4",
    ...overrides,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const step = queue.shift();
      assert(step, `Unexpected request ${request.url}`);
      equal(new URL(request.url).pathname, step.path);
      equal(request.method, step.method ?? "GET");
      await step.inspect?.(request);
      return step.status === 204
        ? new Response(null, { status: 204 })
        : Response.json(step.body ?? {}, { status: step.status ?? 200, headers: step.headers });
    },
  });
  return { client, requests, done: () => equal(queue.length, 0) };
}
const repoSteps: Step[] = [
  {
    path: "/api/v4/namespaces/group%2Fnested",
    body: { id: 1, kind: "group", full_path: "group/nested" },
  },
  { path: "/api/v4/projects/group%2Fnested%2Frepo", body: project },
];
async function repo(h: ReturnType<typeof harness>) {
  return await (await h.client.container("group/nested")).repository("repo");
}

for (const version of ["18.11.11", "19.3.1"] as const) {
  Deno.test(`GitLab ${version}: GL-001 blocks unreliable enforcement reads before HTTP`, async () => {
    const h = harness(repoSteps, version);
    const r = await repo(h);
    equal(r.branchRules.support.configuredRules.supported, true);
    equal(r.branchRules.support.effectiveProtection.supported, false);
    const error = await rejects(
      () => r.branchRules.effective("main"),
      "CapabilityUnavailableError",
    );
    assert(error.message.includes("GL-001") && error.message.includes(version));
    assert("operation" in error && error.operation === "getEffectiveBranchProtection");
    h.done();
  });
  Deno.test(`GitLab ${version}: lazy exact-version native access and nested namespace paths`, async () => {
    const h = harness(repoSteps, version);
    equal(h.requests.length, 0);
    assert(!("gitea" in h.client.native));
    assert(!("gitea" in h.client.auth.basic({ username: "name", password: "password" })));
    await h.client.native.gitlab(({ client }) => {
      assert(typeof client.getApiV4Projects === "function");
    });
    equal(h.requests.length, 0);
    const r = await repo(h);
    equal([r.owner, r.name, r.private], ["group/nested", "repo", true]);
    await r.native.gitlab(({ repository }) => equal(repository.id, 2));
    equal(h.requests.length, 2);
    h.done();
  });
  Deno.test(`GitLab ${version}: token verifies identity and keeps selected native authorization`, async () => {
    const h = harness([
      {
        path: "/api/v4/user",
        body: { id: 7, username: "person" },
        inspect: (r) => equal(r.headers.get("authorization"), "Bearer example-token"),
      },
      {
        path: "/api/v4/user",
        body: { id: 7, username: "person" },
        inspect: (r) => equal(r.headers.get("authorization"), "Bearer example-token"),
      },
    ], version);
    const authorized = await h.client.auth.token("example-token");
    equal((await authorized.currentUserProfile.current()).username, "person");
    h.done();
  });
}
for (
  const [status, name] of [
    [401, "AuthenticationError"],
    [403, "PermissionDeniedError"],
    [404, "NotFoundError"],
    [409, "ConflictError"],
    [422, "ValidationError"],
    [429, "RateLimitError"],
    [500, "ProviderOperationError"],
  ] as const
) {
  Deno.test(`GitLab maps HTTP ${status} with provider context`, async () => {
    const h = harness([{
      path: "/api/v4/user",
      status,
      body: { message: "failure" },
      headers: { "x-request-id": "request-id", "retry-after": "5" },
    }]);
    const e = await rejects(() => h.client.auth.token("test-token"), name);
    assert("provider" in e && e.provider === "gitlab");
    assert("version" in e && e.version === "19.3.1");
    h.done();
  });
}
Deno.test("GitLab rejects malformed success identities instead of returning corrupt entities", async () => {
  const h = harness([{
    path: "/api/v4/namespaces/broken",
    body: { id: -1, kind: "group", full_path: "broken" },
  }]);
  await rejects(() => h.client.container("broken"), "ProviderInvariantError");
  h.done();
});
Deno.test("GitLab page cursors preserve effective size and stop on explicit final-page headers", async () => {
  const value = { id: 1, kind: "group", full_path: "group" };
  const h = harness([
    {
      path: "/api/v4/namespaces",
      body: [value],
      headers: { "x-next-page": "2", "x-per-page": "1", "x-total": "2" },
      inspect: (r) => equal(new URL(r.url).searchParams.get("per_page"), "1"),
    },
    {
      path: "/api/v4/namespaces",
      body: [{ ...value, id: 2 }],
      headers: { "x-next-page": "", "x-total": "2" },
      inspect: (r) =>
        equal([
          new URL(r.url).searchParams.get("page"),
          new URL(r.url).searchParams.get("per_page"),
        ], ["2", "1"]),
    },
  ]);
  const first = await h.client.containers({ limit: 1 });
  assert(first.nextCursor);
  const second = await h.client.containers({ limit: 50, cursor: first.nextCursor });
  equal(second.nextCursor, undefined);
  equal(second.totalCount, 2);
  h.done();
});
Deno.test("GitLab invalid pagination fails before HTTP", async () => {
  const h = harness([]);
  await rejects(() => h.client.containers({ cursor: "gitea-page:1" }), "ValidationError");
  await rejects(() => h.client.containers({ limit: 0 }), "ValidationError");
  equal(h.requests.length, 0);
});
Deno.test("GitLab abort is normalized and never starts transport", async () => {
  const h = harness([]);
  await rejects(
    () => h.client.container("group", { signal: AbortSignal.abort() }),
    "OperationAbortedError",
  );
  equal(h.requests.length, 0);
});
Deno.test("GitLab file mutations honor native controls without accepting invalid start refs", async () => {
  const h = harness([...repoSteps, {
    path: "/api/v4/projects/2/repository/commits",
    method: "POST",
    status: 201,
    body: commit,
    inspect: async (r) => {
      const p = await r.json();
      equal(p.start_sha, previous);
      equal(p.force, true);
      equal(p.actions[0].encoding, "base64");
      equal(p.actions[0].content, btoa("file"));
      assert(!("file" in p));
    },
  }]);
  const r = await repo(h);
  const op = r.content.commitChanges({
    branch: "main",
    newBranch: "new",
    message: "message",
    changes: [{ operation: "create", path: "file.txt", content: "file" }],
  });
  assert(!("gitea" in op));
  const value = await op.gitlab(() => ({ startSha: previous, force: true })).execute();
  equal(value.sha, sha);
  await rejects(
    () =>
      r.content.commitChanges({ branch: "main", message: "message", changes: [] }).gitlab(() => ({
        startSha: previous,
      })).execute(),
    "ValidationError",
  );
  h.done();
});
Deno.test("GitLab stale blob precondition prevents the entire commit", async () => {
  const h = harness([...repoSteps, {
    path: "/api/v4/projects/2/repository/files/file.txt",
    body: { blob_id: previous, last_commit_id: sha },
  }]);
  const r = await repo(h);
  await rejects(
    () =>
      r.content.commitChanges({
        branch: "main",
        message: "stale",
        changes: [{ operation: "update", path: "file.txt", sha, content: "changed" }],
      }).execute(),
    "ConflictError",
  );
  h.done();
});
Deno.test("GitLab rejects oversized batches before resolving refs", async () => {
  const h = harness(repoSteps);
  const r = await repo(h);
  await rejects(() => r.commits.getMany([sha, previous], { maxItems: 1 }), "ValidationError");
  await rejects(() => r.content.readFiles(["a", "b"], { maxItems: 1 }), "ValidationError");
  h.done();
});
Deno.test("GitLab request fanout is bounded at four and preserves order", async () => {
  const c = new GitLabAdapterContext("19.3.1", { baseUrl: "https://gitlab.invalid" });
  let active = 0, maximum = 0;
  const values = await batch(c, "test", [1, 2, 3, 4, 5, 6], { concurrency: 100 }, 10, async (v) => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    return v;
  });
  equal(maximum, 4);
  equal(values, [1, 2, 3, 4, 5, 6]);
});
Deno.test("GitLab combined status uses latest context and preserves nonportable running state", async () => {
  const h = harness([...repoSteps, {
    path: `/api/v4/projects/2/repository/commits/${sha}/statuses`,
    body: [
      { id: 4, name: "first", status: "success" },
      { id: 3, name: "second", status: "running" },
      { id: 2, name: "first", status: "pending" },
    ],
    headers: { "x-next-page": "" },
  }]);
  const r = await repo(h);
  const status = await r.statuses.get({ kind: "commit", sha });
  equal(status.providerState, "running");
  equal(status.state, undefined);
  equal(status.statuses.length, 2);
  h.done();
});
Deno.test("GitLab missing persistent reviews and unsupported release modes fail locally", async () => {
  const h = harness(repoSteps);
  const r = await repo(h);
  await rejects(
    () => r.releases.create({ tagName: "v1", draft: true }),
    "CapabilityUnavailableError",
  );
  await rejects(
    () => r.branchRules.create({ name: "main", requiredApprovals: 1 }),
    "CapabilityUnavailableError",
  );
  h.done();
});
Deno.test("GitLab authenticated context preserves browser URL for OAuth", async () => {
  const h = harness([{ path: "/api/v4/user", body: { id: 1, username: "person" } }], "19.3.1", {
    webBaseUrl: "https://browser.invalid/gitlab/",
  });
  const authorized = await h.client.auth.token("example-token");
  const start = await authorized.auth.login({
    clientId: "id",
    callbackUrl: "https://callback.invalid/auth",
    scopes: ["api"],
  }).start();
  equal(start.url.origin, "https://browser.invalid");
  equal(start.url.pathname, "/gitlab/oauth/authorize");
  equal(start.url.searchParams.get("code_challenge_method"), "S256");
  h.done();
});

Deno.test("GitLab resolves a branch to a SHA before listing statuses", async () => {
  const h = harness([...repoSteps, {
    path: "/api/v4/projects/2/repository/commits/main",
    body: commit,
  }, {
    path: `/api/v4/projects/2/repository/commits/${sha}/statuses`,
    body: [{ id: 4, name: "ci", status: "success" }],
    headers: { "x-next-page": "" },
  }]);
  const r = await repo(h);
  equal((await r.statuses.get({ kind: "branch", name: "main" })).state, "success");
  h.done();
});
Deno.test("GitLab validates blob identity and verifies decoded bytes against the requested Git object", async () => {
  const h = harness([...repoSteps, {
    path: `/api/v4/projects/2/repository/blobs/${sha}`,
    body: { encoding: "base64", size: 3, content: btoa("bad") },
  }]);
  const r = await repo(h);
  await rejects(() => r.blobs.get("not-a-sha"), "ValidationError");
  await rejects(() => r.blobs.get(sha), "ProviderInvariantError");
  h.done();
});
Deno.test("GitLab relative submodules stay under a configured host path and use the pinned gitlink SHA", async () => {
  const config = '[submodule "vendor/internal"]\n path = vendor/internal\n url = ../other.git\n';
  const bytes = new TextEncoder().encode(config);
  const blob = new Uint8Array([...new TextEncoder().encode(`blob ${bytes.length}\0`), ...bytes]);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-1", blob))].map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  const steps = [...repoSteps.map((s) => ({ ...s, path: `/gitlab${s.path}` })), {
    path: "/gitlab/api/v4/projects/2/repository/tree",
    body: [{ id: sha, name: "internal", path: "vendor/internal", mode: "160000", type: "commit" }],
  }, {
    path: "/gitlab/api/v4/projects/2/repository/tree",
    body: [{ id: hash, name: ".gitmodules", path: ".gitmodules", mode: "100644", type: "blob" }],
  }, {
    path: `/gitlab/api/v4/projects/2/repository/blobs/${hash}`,
    body: { encoding: "base64", size: bytes.length, content: btoa(config) },
  }, {
    path: "/gitlab/api/v4/projects/group%2Fnested%2Fother",
    body: { ...project, id: 3, path_with_namespace: "group/nested/other" },
  }, {
    path: "/gitlab/api/v4/projects/3/repository/tree",
    body: [],
    inspect: (r: Request) => equal(new URL(r.url).searchParams.get("ref"), sha),
  }];
  const h = harness(steps, "19.3.1", { baseUrl: "https://gitlab.invalid/gitlab/api/v4" });
  const r = await repo(h);
  equal(
    (await r.content.readSubmodule("vendor/internal", { ref: previous, dereference: "internal" }))
      .dereferenced?.kind,
    "directory",
  );
  h.done();
});
Deno.test("GitLab package lookup detects duplicate exact coordinates across pages", async () => {
  const value = { id: 1, name: "pkg", package_type: "generic", version: "1" };
  const h = harness([
    {
      path: "/api/v4/projects/group%2Frepo/packages",
      body: [value],
      headers: { "x-next-page": "2" },
    },
    {
      path: "/api/v4/projects/group%2Frepo/packages",
      body: [{ ...value, id: 2 }],
      headers: { "x-next-page": "" },
    },
  ]);
  await rejects(
    () =>
      h.client.packages.get({ owner: "group/repo", name: "pkg", type: "generic", version: "1" }),
    "ValidationError",
  );
  h.done();
});

Deno.test("GitLab collaborators can open another user's project without namespace administration visibility", async () => {
  const user = { id: 71, username: "owner", name: "Project owner" };
  const h = harness([
    { path: "/api/v4/namespaces/owner", status: 404, body: { message: "404 Namespace Not Found" } },
    {
      path: "/api/v4/users",
      body: [user],
      inspect: (r) => equal(new URL(r.url).searchParams.get("username"), "owner"),
    },
    {
      path: "/api/v4/projects/owner%2Frepo",
      body: { ...project, path_with_namespace: "owner/repo" },
    },
  ]);
  const ns = await h.client.container("owner");
  equal(ns.kind, "user");
  equal(ns.id, "user:71");
  await ns.native.gitlab(({ repositoryContainer }) => equal(repositoryContainer, user));
  equal((await ns.repository("repo")).fullName, "owner/repo");
  h.done();
});
Deno.test("GitLab status aggregation stops at its advertised inspection bound", async () => {
  const pages = Array.from({ length: 10 }, (_, index): Step => ({
    path: `/api/v4/projects/2/repository/commits/${sha}/statuses`,
    body: Array.from(
      { length: 100 },
      (_, i) => ({ id: index * 100 + i, name: `context-${i}`, status: "success" }),
    ),
    headers: { "x-next-page": String(index + 2) },
  }));
  const h = harness([...repoSteps, ...pages]);
  const r = await repo(h);
  await rejects(() => r.statuses.get({ kind: "commit", sha }), "IncompleteHistoryError");
  h.done();
});

Deno.test("GitLab missing CI archive is a resource error, not an unsupported capability", async () => {
  const h = harness([...repoSteps, {
    path: "/api/v4/projects/2/jobs/5",
    body: { id: 5, name: "job", status: "success" },
  }]);
  const r = await repo(h);
  await rejects(() => r.ciRuns.artifact("job:5"), "NotFoundError");
  h.done();
});

const mergeRequest = {
  id: 9,
  iid: 3,
  title: "Review",
  state: "opened",
  source_project_id: 2,
  source_branch: "feature",
  target_branch: "main",
  sha,
  detailed_merge_status: "mergeable",
  diff_refs: { base_sha: previous, head_sha: sha, start_sha: previous },
};
Deno.test("GitLab provider-default merge preserves the project's squash policy", async () => {
  const endpoint = "/api/v4/projects/2/merge_requests/3";
  const h = harness([...repoSteps, { path: endpoint, body: mergeRequest }, {
    path: endpoint,
    body: mergeRequest,
  }, {
    path: `${endpoint}/merge`,
    method: "PUT",
    body: { ...mergeRequest, state: "merged" },
    inspect: async (r) =>
      assert(!("squash" in await r.json()), "Provider default must not force squash off"),
  }, { path: endpoint, body: { ...mergeRequest, state: "merged", merge_commit_sha: sha } }]);
  const r = await repo(h);
  assert((await r.pullRequests.merge(await r.pullRequests.get(3)).execute()).merged);
  h.done();
});
Deno.test("GitLab inline comments preserve both paths for renamed diff files", async () => {
  const endpoint = "/api/v4/projects/2/merge_requests/3";
  const h = harness([...repoSteps, { path: endpoint, body: mergeRequest }, {
    path: endpoint,
    body: mergeRequest,
  }, {
    path: `${endpoint}/diffs`,
    body: [{ old_path: "old.txt", new_path: "new.txt", renamed_file: true }],
  }, {
    path: `${endpoint}/discussions`,
    method: "POST",
    inspect: async (r) => {
      const p = (await r.json()).position;
      equal([p.old_path, p.new_path, p.old_line, p.new_line], ["old.txt", "new.txt", undefined, 3]);
    },
  }]);
  const r = await repo(h);
  await r.pullRequests.comment(await r.pullRequests.get(3), {
    body: "Review",
    position: { path: "new.txt", side: "new", line: 3 },
  });
  h.done();
});

Deno.test("GitLab returns every commit file across pages with omitted diff bodies", async () => {
  const h = harness([...repoSteps, {
    path: `/api/v4/projects/2/repository/commits/${sha}/diff`,
    body: Array.from(
      { length: 100 },
      (_, i) => ({ new_path: `${i}.txt`, new_file: true, collapsed: true }),
    ),
    headers: { "x-next-page": "2", "x-per-page": "100" },
    inspect: (r) => equal(new URL(r.url).searchParams.get("page"), "1"),
  }, {
    path: `/api/v4/projects/2/repository/commits/${sha}/diff`,
    body: [{ new_path: "100.txt", too_large: true }],
    headers: { "x-next-page": "", "x-per-page": "100" },
    inspect: (r) => equal(new URL(r.url).searchParams.get("page"), "2"),
  }]);
  const files = await (await repo(h)).commits.files(sha);
  equal(files.length, 101);
  equal(files[100].path, "100.txt");
  h.done();
});

Deno.test("GitLab does not normalize defective protection flags or emulate unsafe rename", async () => {
  const h = harness([...repoSteps, {
    path: "/api/v4/projects/2/repository/branches/feature",
    body: { name: "feature", commit, protected: true },
  }]);
  const r = await repo(h);
  const branch = await r.branches.get("feature");
  equal(branch.protected, undefined);
  await branch.native.gitlab(({ branch }) => equal(branch.protected, true));
  await rejects(() => r.branches.rename(branch, "renamed"), "CapabilityUnavailableError");
  h.done();
});
