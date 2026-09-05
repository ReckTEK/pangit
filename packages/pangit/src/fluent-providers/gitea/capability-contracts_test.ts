import type { PullRequestData } from "../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import { GiteaAdapterContext } from "./transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "./native/GiteaEntityNative.ts";
import { getGiteaBlob } from "./blob-reads/mod.ts";
import {
  createGiteaBranchRule,
  deleteGiteaBranchRule,
  getGiteaBranchRule,
  getGiteaEffectiveBranchProtection,
  listGiteaBranchRules,
  setGiteaBranchRuleOrder,
  updateGiteaBranchRule,
} from "./branch-rules/mod.ts";
import {
  createGiteaPullRequestReview,
  getGiteaPullRequestReview,
  listGiteaPullRequestReviews,
  submitGiteaPullRequestReview,
} from "./pull-request-reviews/mod.ts";
import { getGiteaUnsupportedOptionalCapabilities } from "./unsupported-capabilities.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

for (const version of ["1.26.4", "1.27.2"] as const) {
  Deno.test(`Gitea ${version} blob, review-object, and branch-rule operations stay direct and bounded`, async () => {
    const requests: Request[] = [];
    const sha = "0123456789abcdef0123456789abcdef01234567";
    const context = new GiteaAdapterContext(version, {
      baseUrl: "https://gitea.example.invalid/api/v1",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        const url = new URL(request.url);
        if (request.method === "GET" && url.pathname.endsWith(`/git/blobs/${sha}`)) {
          return jsonResponse({ sha, size: 3, encoding: "base64", content: "AP9B" });
        }
        if (url.pathname === "/api/v1/repos/acme/project/pulls/5/reviews") {
          if (request.method === "GET") {
            assertEquals(url.searchParams.get("limit"), "7", "review page limit changed");
            return jsonResponse([reviewPayload("PENDING")], 200, { "x-total-count": "1" });
          }
          assertEquals(
            await request.json(),
            { event: "PENDING", body: "draft" },
            "pending-review create body changed",
          );
          return jsonResponse(reviewPayload("PENDING"));
        }
        if (url.pathname === "/api/v1/repos/acme/project/pulls/5/reviews/91") {
          if (request.method === "GET") return jsonResponse(reviewPayload("PENDING"));
          assertEquals(
            await request.json(),
            { event: "APPROVED", body: "ship it" },
            "review submit body changed",
          );
          return jsonResponse(reviewPayload("APPROVED"));
        }
        if (url.pathname === "/api/v1/repos/acme/project/branch_protections") {
          if (request.method === "GET") return jsonResponse([rulePayload()]);
          assertEquals(
            await request.json(),
            { rule_name: "main", enable_push: true },
            "branch-rule create body changed",
          );
          return jsonResponse(rulePayload(), 201);
        }
        if (url.pathname === "/api/v1/repos/acme/project/branch_protections/main") {
          if (request.method === "GET") return jsonResponse(rulePayload());
          if (request.method === "PATCH") {
            assertEquals(
              await request.json(),
              { required_approvals: 2 },
              "branch-rule update body changed",
            );
            return jsonResponse({ ...rulePayload(), required_approvals: 2 });
          }
          return emptyResponse(204);
        }
        if (url.pathname === "/api/v1/repos/acme/project/branches/main") {
          return jsonResponse({
            name: "main",
            protected: true,
            effective_branch_protection_name: "main",
            required_approvals: 2,
            enable_status_check: true,
            status_check_contexts: ["ci"],
            user_can_push: false,
            user_can_merge: true,
          });
        }
        if (url.pathname === "/api/v1/repos/acme/project/branch_protections/priority") {
          assertEquals(
            await request.json(),
            { rule_names: ["main", "release/*"] },
            "branch-rule order body changed",
          );
          return emptyResponse(204);
        }
        throw new Error(`unexpected request: ${request.method} ${url.pathname}${url.search}`);
      },
    });
    const repository = fixtureRepository(version);
    const pullRequest = fixturePullRequest(version);

    const blob = await getGiteaBlob(context, repository, sha);
    assertEquals([...blob.bytes], [0, 255, 65], "blob bytes changed");
    assertEquals(
      await blob.native.gitea(({ blob: native }) => native.encoding),
      "base64",
      "blob native payload was not retained",
    );

    const page = await listGiteaPullRequestReviews(context, repository, pullRequest, { limit: 7 });
    assertEquals(page.items.length, 1, "review page changed");
    assertEquals(
      (await getGiteaPullRequestReview(context, repository, pullRequest, "91")).id,
      "91",
      "direct review lookup changed",
    );
    const pending = await createGiteaPullRequestReview(
      context,
      repository,
      pullRequest,
      { body: "draft" },
    );
    const submitted = await submitGiteaPullRequestReview(
      context,
      repository,
      pullRequest,
      pending,
      { event: "approve", body: "ship it" },
    );
    assertEquals(submitted.state, "approved", "review state normalization changed");

    const rules = await listGiteaBranchRules(context, repository, { maxRules: 5 });
    assertEquals(rules.length, 1, "branch-rule list changed");
    assertEquals(
      (await getGiteaBranchRule(context, repository, "main")).name,
      "main",
      "direct branch-rule lookup changed",
    );
    const created = await createGiteaBranchRule(
      context,
      repository,
      { name: "main", pushAllowed: true },
    );
    const updated = await updateGiteaBranchRule(
      context,
      repository,
      created,
      { requiredApprovals: 2 },
    );
    assertEquals(updated.requiredApprovals, 2, "branch-rule update normalization changed");
    const effective = await getGiteaEffectiveBranchProtection(context, repository, "main");
    assert(effective.protected, "effective protection was inferred as false");
    assertEquals(effective.ruleName, "main", "effective rule name changed");
    await setGiteaBranchRuleOrder(context, repository, {
      extension: { orderedRuleNames: ["main", "release/*"] },
    });
    await deleteGiteaBranchRule(context, repository, updated);

    const unsupported = getGiteaUnsupportedOptionalCapabilities(version);
    assert(!unsupported["deployments-environments"].supported, "deployments became supported");
    assert(!unsupported["gists-snippets"].supported, "gists became supported");
    assertEquals(requests.length, 12, "direct request count changed");
  });
}

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
    source: { owner: "acme", repository: "project", branch: "change" },
    target: { owner: "acme", repository: "project", branch: "main" },
    merged: false,
    native: {},
  } as PullRequestData<"gitea", TVersion>;
}

function reviewPayload(state: string) {
  return { id: 91, state, body: "review", user: { login: "reviewer" } };
}

function rulePayload() {
  return {
    rule_name: "main",
    enable_push: true,
    required_approvals: 1,
    status_check_contexts: ["ci"],
  };
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: { ...Object.fromEntries(new Headers(headers)), "content-type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(undefined, { status });
}
