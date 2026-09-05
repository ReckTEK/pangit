import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import { GiteaAdapterContext } from "./transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "./native/GiteaEntityNative.ts";
import { getGiteaCurrentUserProfile } from "./current-user-profile/mod.ts";
import {
  createGiteaIssueComment,
  deleteGiteaIssueComment,
  getGiteaIssueComment,
  listGiteaIssueComments,
  listGiteaIssues,
  setGiteaIssueState,
  updateGiteaIssue,
  updateGiteaIssueComment,
} from "./issues/mod.ts";
import {
  createGiteaRelease,
  deleteGiteaRelease,
  deleteGiteaReleaseAsset,
  getGiteaRelease,
  getGiteaReleaseAsset,
  getGiteaReleaseByTag,
  listGiteaReleaseAssets,
  listGiteaReleases,
  updateGiteaRelease,
  updateGiteaReleaseAsset,
  uploadGiteaReleaseAsset,
} from "./releases/mod.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("Gitea issue-comment and release-asset lifecycles stay direct and bounded", async () => {
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);
      if (
        request.method === "PATCH" && url.pathname === "/api/v1/repos/acme/project/issues/7"
      ) {
        assertEquals(await request.json(), { state: "closed" }, "issue state body changed");
        return jsonResponse({ ...issuePayload(), state: "closed" }, 201);
      }
      if (
        request.method === "GET" && url.pathname === "/api/v1/repos/acme/project/issues/comments"
      ) {
        assertEquals(url.searchParams.get("limit"), "5", "comment scan limit changed");
        return jsonResponse(
          [
            commentPayload(9, 7),
            commentPayload(10, 8),
          ],
          200,
          { "x-total-count": "2" },
        );
      }
      if (
        request.method === "GET" && url.pathname === "/api/v1/repos/acme/project/issues/comments/9"
      ) {
        return jsonResponse(commentPayload(9, 7));
      }
      if (
        request.method === "POST" && url.pathname === "/api/v1/repos/acme/project/issues/7/comments"
      ) {
        assertEquals(await request.json(), { body: "created" }, "comment-create body changed");
        return jsonResponse({ ...commentPayload(9, 7), body: "created" }, 201);
      }
      if (
        request.method === "PATCH" &&
        url.pathname === "/api/v1/repos/acme/project/issues/comments/9"
      ) {
        assertEquals(await request.json(), { body: "updated" }, "comment-update body changed");
        return jsonResponse({ ...commentPayload(9, 7), body: "updated" });
      }
      if (
        request.method === "DELETE" &&
        url.pathname === "/api/v1/repos/acme/project/issues/comments/9"
      ) {
        return emptyResponse(204);
      }
      if (request.method === "GET" && url.pathname === "/api/v1/repos/acme/project/releases") {
        assertEquals(url.searchParams.get("limit"), "4", "release page limit changed");
        return jsonResponse([releasePayload()], 200, { "x-total-count": "1" });
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/v1/repos/acme/project/releases/tags/v1.0.0"
      ) {
        return jsonResponse(releasePayload());
      }
      if (
        request.method === "GET" && url.pathname === "/api/v1/repos/acme/project/releases/31"
      ) {
        return jsonResponse(releasePayload());
      }
      if (
        request.method === "PATCH" && url.pathname === "/api/v1/repos/acme/project/releases/31"
      ) {
        assertEquals(await request.json(), { name: "Renamed" }, "release-update body changed");
        return jsonResponse({ ...releasePayload(), name: "Renamed" });
      }
      if (
        request.method === "DELETE" && url.pathname === "/api/v1/repos/acme/project/releases/31"
      ) {
        return emptyResponse(204);
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/v1/repos/acme/project/releases/31/assets"
      ) {
        return jsonResponse([assetPayload()]);
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/v1/repos/acme/project/releases/31/assets/41"
      ) {
        return jsonResponse(assetPayload());
      }
      if (
        request.method === "PATCH" &&
        url.pathname === "/api/v1/repos/acme/project/releases/31/assets/41"
      ) {
        assertEquals(await request.json(), { name: "renamed.txt" }, "asset-update body changed");
        return jsonResponse({ ...assetPayload(), name: "renamed.txt" }, 201);
      }
      if (
        request.method === "DELETE" &&
        url.pathname === "/api/v1/repos/acme/project/releases/31/assets/41"
      ) {
        return emptyResponse(204);
      }
      throw new Error(`unexpected request: ${request.method} ${url.pathname}${url.search}`);
    },
  });
  const repository = fixtureRepository("1.27.2");
  const issue = (await listGiteaIssues(
    new GiteaAdapterContext("1.27.2", {
      baseUrl: "https://gitea.example.invalid/api/v1",
      fetch: () => Promise.resolve(jsonResponse([issuePayload()], 200, { "x-total-count": "1" })),
    }),
    repository,
    { limit: 1 },
  )).items[0];

  const closed = await setGiteaIssueState(context, repository, issue, "closed");
  assertEquals(closed.state, "closed", "issue state normalization changed");
  const commentPage = await listGiteaIssueComments(context, repository, issue, { limit: 5 });
  assertEquals(
    commentPage.items.map((comment) => comment.id),
    ["9"],
    "comment scan leaked another issue",
  );
  assert(commentPage.complete, "terminal comment scan was marked incomplete");
  const directComment = await getGiteaIssueComment(context, repository, "9");
  const createdComment = await createGiteaIssueComment(
    context,
    repository,
    issue,
    { body: "created" },
  );
  const updatedComment = await updateGiteaIssueComment(
    context,
    repository,
    createdComment,
    { body: "updated" },
  );
  assertEquals(updatedComment.body, "updated", "comment update normalization changed");
  await deleteGiteaIssueComment(context, repository, directComment);

  const releasePage = await listGiteaReleases(context, repository, { limit: 4 });
  assertEquals(releasePage.items.length, 1, "release list normalization changed");
  const release = await getGiteaRelease(context, repository, "31");
  assertEquals(
    (await getGiteaReleaseByTag(context, repository, "v1.0.0")).id,
    "31",
    "release tag lookup changed",
  );
  assertEquals(
    (await updateGiteaRelease(context, repository, release, { name: "Renamed" })).name,
    "Renamed",
    "release update normalization changed",
  );
  const assets = await listGiteaReleaseAssets(context, repository, release, { maxItems: 2 });
  const asset = assets[0];
  assertEquals(
    (await getGiteaReleaseAsset(context, repository, release, "41")).name,
    "artifact.txt",
    "asset direct lookup changed",
  );
  assertEquals(
    (await updateGiteaReleaseAsset(
      context,
      repository,
      release,
      asset,
      { name: "renamed.txt" },
    )).name,
    "renamed.txt",
    "asset update normalization changed",
  );
  await deleteGiteaReleaseAsset(context, repository, release, asset);
  await deleteGiteaRelease(context, repository, release);

  assertEquals(requests.length, 15, "direct optional lifecycle request count changed");
});

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

for (const version of ["1.26.4", "1.27.2"] as const) {
  Deno.test(`Gitea ${version} optional profile, issues, releases, and assets use direct operations`, async () => {
    const requests: Request[] = [];
    const issueEdits: unknown[] = [];
    const context = new GiteaAdapterContext(version, {
      baseUrl: "https://gitea.example.invalid/api/v1",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        const url = new URL(request.url);
        if (request.method === "GET" && url.pathname === "/api/v1/user") {
          return jsonResponse({ id: 5, login: "fixture", full_name: "Fixture User" });
        }
        if (
          request.method === "GET" &&
          url.pathname === "/api/v1/repos/acme/project/issues"
        ) {
          assertEquals(url.searchParams.get("type"), "issues", "pull requests were not excluded");
          assertEquals(url.searchParams.get("limit"), "10", "issue page limit changed");
          return jsonResponse([issuePayload()], 200, { "x-total-count": "1" });
        }
        if (
          request.method === "PATCH" &&
          url.pathname === "/api/v1/repos/acme/project/issues/7"
        ) {
          issueEdits.push(JSON.parse(await request.text()));
          return jsonResponse({ ...issuePayload(), body: "changed", content_version: 4 }, 201);
        }
        if (
          request.method === "POST" &&
          url.pathname === "/api/v1/repos/acme/project/releases"
        ) {
          const body = JSON.parse(await request.text());
          assertEquals(
            body,
            { tag_name: "v1.0.0", name: "Version 1", target_commitish: "main" },
            "release-create body changed",
          );
          return jsonResponse(releasePayload(), 201);
        }
        if (
          request.method === "POST" &&
          url.pathname === "/api/v1/repos/acme/project/releases/31/assets"
        ) {
          assertEquals(url.searchParams.get("name"), "artifact.txt", "asset name query changed");
          assert(
            request.headers.get("content-type")?.startsWith("multipart/form-data; boundary=") ===
              true,
            "asset upload did not use the cross-version multipart request",
          );
          const form = await request.formData();
          const attachment = form.get("attachment");
          assert(attachment instanceof Blob, "asset upload omitted the attachment part");
          assertEquals(await attachment.text(), "asset", "asset bytes changed");
          return jsonResponse({ id: 41, name: "artifact.txt", size: 5 }, 201);
        }
        throw new Error(`unexpected request: ${request.method} ${url.pathname}${url.search}`);
      },
    });
    const repository = fixtureRepository(version);

    const profile = await getGiteaCurrentUserProfile(context);
    assertEquals(profile.username, "fixture", "current-user normalization changed");
    const issues = await listGiteaIssues(context, repository, { limit: 10 });
    assertEquals(issues.items.length, 1, "issue page normalization changed");
    const updated = await updateGiteaIssue(
      context,
      repository,
      issues.items[0],
      { description: "changed" },
      { extension: { contentVersion: 3n } },
    );
    assertEquals(updated.description, "changed", "issue update normalization changed");
    assertEquals(
      issueEdits,
      [{ body: "changed", content_version: 3 }],
      "content-version update body changed",
    );

    const release = await createGiteaRelease(context, repository, {
      tagName: "v1.0.0",
      name: "Version 1",
      target: "main",
    });
    const asset = await uploadGiteaReleaseAsset(
      context,
      repository,
      release,
      { name: "artifact.txt", data: new TextEncoder().encode("asset") },
    );
    assertEquals(asset.id, "41", "release-asset normalization changed");
    assertEquals(requests.length, 5, "optional capability request count changed");

    const nativeId = await release.native.gitea(({ release: native }) => native.id);
    assertEquals(nativeId, 31, "release native payload was not retained");
  });
}

function fixtureRepository<TVersion extends GiteaVersion>(
  _version: TVersion,
): RepositoryData<"gitea", TVersion> {
  return {
    id: "11",
    owner: "acme",
    name: "project",
    fullName: "acme/project",
    native: {},
  } as RepositoryData<"gitea", TVersion>;
}

function issuePayload() {
  return {
    id: 21,
    number: 7,
    title: "Issue",
    body: "original",
    state: "open",
    user: { login: "fixture" },
    assignees: [],
    labels: [],
    comments: 0,
  };
}

function releasePayload() {
  return {
    id: 31,
    tag_name: "v1.0.0",
    name: "Version 1",
    target_commitish: "main",
    draft: false,
    prerelease: false,
  };
}

function commentPayload(id: number, issueNumber: number) {
  return {
    id,
    body: "comment",
    issue_url: `https://gitea.example.invalid/api/v1/repos/acme/project/issues/${issueNumber}`,
    user: { login: "fixture" },
  };
}

function assetPayload() {
  return { id: 41, name: "artifact.txt", size: 5, download_count: 0 };
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: { ...Object.fromEntries(new Headers(headers)), "content-type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}
