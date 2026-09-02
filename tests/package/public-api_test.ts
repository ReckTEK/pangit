import * as PanGit from "@mannsion/pangit";
import * as api from "@mannsion/pangit/api";
import { GiteaRestClient } from "@mannsion/pangit/providers/gitea/1.27.2";

const packageRoot = new URL("../../packages/pangit/", import.meta.url);

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("package root exposes only the fluent API and provider-client factory", () => {
  assertEquals(Object.keys(PanGit), ["api", "createProviderClient"], "Unexpected root export");
  assertEquals(
    Object.keys(PanGit.api),
    ["auth", "createClient", "errors"],
    "Unexpected API export",
  );
  assertEquals(
    Object.keys(PanGit.api.auth),
    [
      "OAuthCallbackError",
      "createOAuthCookieFlow",
      "createOAuthHandler",
      "createOAuthTransactionCookie",
    ],
    "Unexpected API-auth export",
  );
  assertEquals(PanGit.api, api, "Root API door differs from its direct module");
});

Deno.test("package subpaths expose only the API and individual provider clients", async () => {
  const configuration = JSON.parse(await Deno.readTextFile(new URL("deno.json", packageRoot)));
  const expected = [
    ".",
    "./api",
    "./providers/azure-devops/latest",
    "./providers/bitbucket/latest",
    "./providers/codeberg/latest",
    "./providers/gitea/1.26.4",
    "./providers/gitea/1.27.2",
    "./providers/github/latest",
    "./providers/gitlab/18.11.11",
    "./providers/gitlab/19.3.1",
  ];
  assertEquals(Object.keys(configuration.exports), expected, "Unexpected package export path");
  for (const [specifier, target] of Object.entries(configuration.exports)) {
    if (typeof target !== "string" || !target.startsWith("./src/")) {
      throw new Error(`Package export escapes src: ${specifier} -> ${String(target)}`);
    }
  }
  assertEquals(
    GiteaRestClient.name,
    "GiteaRestClient",
    "Provider-client subpath resolved incorrectly",
  );
});

Deno.test("the API owns fluent types while provider client types stay inferred", async () => {
  const version = "1.27.2" as const;
  const client: PanGit.api.FluentClient<"gitea", typeof version> = PanGit.api
    .createClient("gitea", version, {
      baseUrl: "https://git.example.com/api/v1",
    });
  const login: PanGit.api.auth.Login<"gitea", typeof version> = client.auth.login({
    clientId: "public-api-test",
    callbackUrl: "https://example.com/callback",
  });
  const providerClient = await PanGit.createProviderClient(
    "gitea",
    version,
    "https://git.example.com/api/v1",
  );
  const configuredProviderClient = await PanGit.createProviderClient("gitea", version, {
    baseUrl: "https://git.example.com/api/v1",
  });
  assertEquals(
    [
      client.provider,
      client.version,
      login.provider,
      login.version,
      providerClient.constructor.name,
      configuredProviderClient.constructor.name,
    ],
    ["gitea", version, "gitea", version, GiteaRestClient.name, GiteaRestClient.name],
    "Public factories lost provider/version selection",
  );
});

Deno.test("optional fluent capabilities are typed, synchronous handles with local support", () => {
  let fetchCalls = 0;
  const version = "1.27.2" as const;
  const client = PanGit.api.createClient("gitea", version, {
    baseUrl: "https://git.example.com/api/v1",
    fetch: ((_input: Request | URL | string, _init?: RequestInit) => {
      fetchCalls += 1;
      return Promise.resolve(new Response(null, { status: 500 }));
    }) as typeof globalThis.fetch,
  });

  const profile: PanGit.api.CurrentUserProfileCapability<"gitea", typeof version> =
    client.currentUserProfile;
  const packages: PanGit.api.Packages<"gitea", typeof version> = client.packages;
  assertEquals(profile.support, { supported: true, current: "direct" }, "Profile support changed");
  assertEquals(packages.support.supported, true, "Package support changed");
  const unsupported: PanGit.api.UnsupportedOptionalCapabilities =
    client.unsupportedOptionalCapabilities;
  assertEquals(
    unsupported.support["deployments-environments"].supported,
    false,
    "Unsupported deployment capability changed",
  );
  assertEquals(fetchCalls, 0, "Reading optional capability support performed HTTP");

  const verifyRepositoryTypes = (
    repository: PanGit.api.Repository<"gitea", typeof version>,
    issue: PanGit.api.Issue<"gitea", typeof version>,
    pullRequest: PanGit.api.PullRequest<"gitea", typeof version>,
  ): void => {
    const issues: PanGit.api.RepositoryIssues<"gitea", typeof version> = repository.issues;
    const releases: PanGit.api.RepositoryReleases<"gitea", typeof version> = repository.releases;
    const webhooks: PanGit.api.RepositoryWebhooks<"gitea", typeof version> = repository.webhooks;
    const ciRuns: PanGit.api.RepositoryCiRunDiscovery<"gitea", typeof version> = repository.ciRuns;
    const blobs: PanGit.api.RepositoryBlobs<"gitea", typeof version> = repository.blobs;
    const branchRules: PanGit.api.RepositoryBranchRules<"gitea", typeof version> =
      repository.branchRules;
    const reviews: PanGit.api.PullRequestReviews<"gitea", typeof version> = repository.pullRequests
      .reviews(pullRequest);
    const update: PanGit.api.ExecutableOperation<PanGit.api.Issue<"gitea", typeof version>> = issues
      .update(issue, { title: "updated" })
      .gitea((context) => ({ contentVersion: BigInt(context.issueNumber) }));
    const order: PanGit.api.ExecutableOperation<void> = branchRules.setOrder().gitea(() => ({
      orderedRuleNames: ["main"],
    }));
    void [releases, webhooks, ciRuns, blobs, reviews, update, order];
  };
  assertEquals(typeof verifyRepositoryTypes, "function", "Repository capability types unavailable");
});

Deno.test("provider extensions are operation-, provider-, and version-scoped in public types", () => {
  const verifyProviderExtensionTypes = (
    repository126: PanGit.api.Repository<"gitea", "1.26.4">,
    repository127: PanGit.api.Repository<"gitea", "1.27.2">,
    pullRequest: PanGit.api.PullRequest<"gitea", "1.27.2">,
  ): void => {
    const comparison: PanGit.api.ExecutableOperation<
      PanGit.api.CommitComparisonResult<"gitea", "1.27.2">
    > = repository127.commits.compare("main", "feature");
    const diff: PanGit.api.ExecutableOperation<PanGit.api.GiteaCommitComparisonOutput> =
      repository127.commits.compare("main", "feature").gitea(() => ({ output: "diff" }));
    const review: PanGit.api.ExecutableOperation<PanGit.api.PullRequestReview<"gitea", "1.27.2">> =
      repository127.pullRequests.reviews(pullRequest).create().gitea(() => ({
        event: "pending",
        comments: [{ body: "line note", path: "README.md", newPosition: 1 }],
      }));
    const configuredMerge = repository127.pullRequests.merge(pullRequest).gitea(() => ({
      method: "merge",
    }));

    // @ts-expect-error Gitea raw compare output is not registered for 1.26.4.
    repository126.commits.compare("main", "feature").gitea(() => ({ output: "diff" }));
    // @ts-expect-error A Gitea-selected operation does not expose another provider's extension.
    repository127.pullRequests.merge(pullRequest).github(() => ({}));
    // @ts-expect-error Selecting an extension returns the terminal executable form.
    configuredMerge.gitea(() => ({ method: "squash" }));
    // @ts-expect-error No GitHub high-level provider adapter is registered.
    PanGit.api.createClient("github", "latest", {
      baseUrl: "https://api.github.com",
    });
    void [comparison, diff, review];
  };
  assertEquals(
    typeof verifyProviderExtensionTypes,
    "function",
    "Provider extension public type proof was erased",
  );
});
