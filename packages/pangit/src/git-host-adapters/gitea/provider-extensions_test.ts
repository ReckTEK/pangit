import type {
  CompareCommitsOptions,
  GiteaCommitComparisonOutput,
} from "../../fluent-api/adapter-contract/commits.ts";
import { ValidationError } from "../../fluent-api/adapter-contract/errors.ts";
import type { PullRequestData } from "../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import { compareGiteaCommits } from "./commits.ts";
import { commitGiteaFileChanges, readGiteaFiles } from "./content.ts";
import { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import type { GiteaVersion } from "./native/GiteaEntityNative.ts";
import { createGiteaPullRequestReview } from "./optional-capabilities/pull-request-reviews.ts";
import { mergeGiteaPullRequest } from "./pull-requests.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("Gitea 1.27.2 compare extension returns raw text through repoCompareDiff", async () => {
  const operationIds: string[] = [];
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    beforeRequest(request, operation) {
      operationIds.push(operation.id);
      return request;
    },
    fetch(input, init) {
      const request = new Request(input, init);
      requests.push(request);
      return Promise.resolve(
        new Response("diff --git a/README.md b/README.md\n", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      );
    },
  });
  const result = await compareGiteaCommits(
    context,
    fixtureRepository("1.27.2"),
    "main",
    "feature",
    { extension: { output: "diff" } },
  ) as GiteaCommitComparisonOutput;
  assertEquals(operationIds, ["repoCompareDiff"], "Raw comparison operation changed");
  assertEquals(
    new URL(requests[0].url).searchParams.get("output"),
    "diff",
    "Raw comparison selector changed",
  );
  assert(result.output === "diff" && result.content.includes("README.md"), "Raw diff changed");

  let rejected = false;
  let fetches = 0;
  const oldContext = new GiteaAdapterContext("1.26.4", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch() {
      fetches++;
      return Promise.resolve(new Response(undefined, { status: 500 }));
    },
  });
  try {
    await compareGiteaCommits(
      oldContext,
      fixtureRepository("1.26.4"),
      "main",
      "feature",
      { extension: { output: "diff" } } as unknown as CompareCommitsOptions<"gitea", "1.26.4">,
    );
  } catch (error) {
    rejected = error instanceof ValidationError;
  }
  assert(rejected && fetches === 0, "Pre-1.27 raw comparison was not rejected locally");
});

Deno.test("scheduled Gitea merge polls only the known PR at its explicit bound", async () => {
  const operationIds: string[] = [];
  let reads = 0;
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    beforeRequest(request, operation) {
      operationIds.push(operation.id);
      return request;
    },
    async fetch(input, init) {
      const request = new Request(input, init);
      if (request.method === "POST") {
        assertEquals(
          await request.json(),
          {
            do: "merge",
            head_commit_id: "head-sha",
            merge_when_checks_succeed: true,
          },
          "Scheduled merge body changed",
        );
        return new Response(undefined, { status: 200 });
      }
      reads++;
      return jsonResponse(pullRequestPayload(reads === 2));
    },
  });
  const merged = await mergeGiteaPullRequest(
    context,
    fixtureRepository("1.27.2"),
    fixturePullRequest("1.27.2"),
    {
      extension: {
        method: "merge",
        headCommitId: "head-sha",
        mergeWhenChecksSucceed: true,
        scheduledCompletion: { attempts: 2, intervalMs: 0 },
      },
    },
  );
  assert(merged.merged, "Scheduled merge did not return its terminal snapshot");
  assertEquals(
    operationIds,
    ["repoMergePullRequest", "repoGetPullRequest", "repoGetPullRequest"],
    "Scheduled merge request sequence changed",
  );

  let unboundedRejected = false;
  try {
    await mergeGiteaPullRequest(
      context,
      fixtureRepository("1.27.2"),
      fixturePullRequest("1.27.2"),
      { extension: { mergeWhenChecksSucceed: true } },
    );
  } catch (error) {
    unboundedRejected = error instanceof ValidationError;
  }
  assert(unboundedRejected, "Scheduled merge accepted an unbounded completion wait");
});

Deno.test("Gitea review extension preserves exact event and old/new position fields", async () => {
  let submittedBody: unknown;
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    async fetch(input, init) {
      const request = new Request(input, init);
      submittedBody = await request.json();
      return jsonResponse({ id: 91, state: "PENDING", comments_count: 2 });
    },
  });
  const review = await createGiteaPullRequestReview(
    context,
    fixtureRepository("1.27.2"),
    fixturePullRequest("1.27.2"),
    { body: "grouped", commitSha: "head-sha" },
    {
      extension: {
        event: "pending",
        comments: [
          { body: "old", path: "README.md", oldPosition: 1 },
          { body: "new", path: "README.md", newPosition: 2 },
        ],
      },
    },
  );
  assertEquals(
    submittedBody,
    {
      event: "PENDING",
      body: "grouped",
      commit_id: "head-sha",
      comments: [
        { body: "old", path: "README.md", old_position: 1 },
        { body: "new", path: "README.md", new_position: 2 },
      ],
    },
    "Gitea review extension body changed",
  );
  assert(review.state === "pending", "Gitea review event was not normalized");
});

Deno.test("Gitea content extension and concurrency validation retain operation context", async () => {
  let fetches = 0;
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch() {
      fetches++;
      return Promise.resolve(new Response(undefined, { status: 500 }));
    },
  });

  for (
    const run of [
      () =>
        commitGiteaFileChanges(
          context,
          fixtureRepository("1.27.2"),
          {
            branch: "main",
            message: "change",
            changes: [{ operation: "create" as const, path: "file.txt", content: "value" }],
          },
          { extension: { authorDate: " " } },
        ),
      () =>
        readGiteaFiles(
          context,
          fixtureRepository("1.27.2"),
          ["file.txt"],
          { concurrency: 5 },
        ),
    ]
  ) {
    try {
      await run();
      throw new Error("invalid content input was accepted");
    } catch (error) {
      assert(error instanceof ValidationError, "content validation did not use ValidationError");
      assertEquals(error.provider, "gitea", "content validation provider changed");
      assertEquals(error.version, "1.27.2", "content validation version changed");
      assert(
        error.operation === "commitFileChanges" || error.operation === "readFiles",
        "content validation operation changed",
      );
    }
  }
  assertEquals(fetches, 0, "invalid content input performed provider I/O");
});

function fixtureRepository<TVersion extends GiteaVersion>(
  _version: TVersion,
): RepositoryData<"gitea", TVersion> {
  return {
    id: "1",
    owner: "acme",
    name: "project",
    fullName: "acme/project",
    native: {},
  } as RepositoryData<"gitea", TVersion>;
}

function fixturePullRequest<TVersion extends GiteaVersion>(
  _version: TVersion,
): PullRequestData<"gitea", TVersion> {
  return {
    id: "5",
    number: 5,
    title: "Change",
    state: "open",
    source: {
      owner: "acme",
      repository: "project",
      branch: "feature",
      sha: "head-sha",
    },
    target: { owner: "acme", repository: "project", branch: "main", sha: "base-sha" },
    merged: false,
    native: {},
  } as PullRequestData<"gitea", TVersion>;
}

function pullRequestPayload(merged: boolean) {
  return {
    id: 5,
    number: 5,
    title: "Change",
    state: merged ? "closed" : "open",
    merged,
    merge_commit_sha: merged ? "merge-sha" : undefined,
    head: {
      ref: "feature",
      sha: "head-sha",
      repo: { name: "project", owner: { login: "acme" } },
    },
    base: {
      ref: "main",
      sha: "base-sha",
      repo: { name: "project", owner: { login: "acme" } },
    },
  };
}

function jsonResponse(body: unknown): Response {
  return Response.json(body, { headers: { "content-type": "application/json" } });
}
