import type { GiteaCommitComparisonOutput } from "@mannsion/pangit/fluent/gitea";
import * as PanGit from "@mannsion/pangit";
import * as api from "@mannsion/pangit/api";
import { GiteaRestClient } from "@mannsion/pangit/providers/gitea/1.27.2";

const packageRoot = new URL("../../packages/pangit/", import.meta.url);

Deno.test("file and blob body helpers have explicit public contracts", () => {
  const verifyTypes = (
    repository: api.Repository<"gitea", "1.27.2">,
    content: api.Content<"gitea", "1.27.2">,
    blob: api.Blob<"gitea", "1.27.2">,
  ) => {
    const options: api.ReadFileOptions = { ref: "main", signal: new AbortController().signal };
    const text: Promise<string> = repository.content.readText("README.md", options);
    const bytes: Promise<Uint8Array> = repository.content.readBytes("image.png", options);
    const json: Promise<unknown> = repository.content.readJson("deno.json", options);
    const webOptions: api.ReadContentBlobOptions = { ref: "main", fileName: "image.png" };
    const webBlob: Promise<globalThis.Blob> = repository.content.readBlob("image.png", webOptions);
    const shaOptions: api.ReadGitBlobOptions = { fileName: "image.png" };
    const shaWebBlob: Promise<globalThis.Blob> = repository.blobs.readBlob(blob.sha, shaOptions);
    const blobText: Promise<string> = repository.blobs.readText(blob.sha);
    const blobBytes: Promise<Uint8Array> = repository.blobs.readBytes(blob.sha);
    const blobJson: Promise<unknown> = repository.blobs.readJson(blob.sha);
    const body: api.ReadableContentBody = content;
    const parsed: unknown = body.json();
    const decoded: string = blob.text();
    const buffer: ArrayBuffer = content.arrayBuffer();
    const snapshotBlob: globalThis.Blob = content.blob();
    const shaSnapshotBlob: globalThis.Blob = blob.blob({ type: "image/png" });
    // @ts-expect-error Web Blob reads always load bytes.
    repository.content.readBlob("image.png", { includeBytes: false });
    // @ts-expect-error Body convenience reads cannot opt out of loading bytes.
    repository.content.readText("README.md", { includeBytes: false });
    // @ts-expect-error JSON does not pretend to validate an arbitrary application type.
    repository.content.readJson<{ enabled: boolean }>("config.json");
    // @ts-expect-error Unknown JSON must be validated before typed use.
    const unvalidated: { enabled: boolean } = body.json();
    void [
      text,
      bytes,
      json,
      webBlob,
      shaWebBlob,
      snapshotBlob,
      shaSnapshotBlob,
      blobText,
      blobBytes,
      blobJson,
      parsed,
      decoded,
      buffer,
      unvalidated,
    ];
  };
  assertEquals(typeof verifyTypes, "function", "Body helper types are unavailable");
});

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("package root exposes only the fluent API and provider-client factory", () => {
  assertEquals(Object.keys(PanGit), ["api", "createProviderClient"], "Unexpected root export");
  assertEquals(
    Object.keys(PanGit.api),
    ["auth", "createClient", "createCodebergClient", "errors"],
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
    "./providers/forgejo/15.0.7",
    "./providers/forgejo/16.0.3",
    "./providers/gitea/1.26.4",
    "./providers/gitea/1.27.2",
    "./providers/github/latest",
    "./providers/gitlab/18.11.11",
    "./providers/gitlab/19.3.1",
    "./fluent/gitea",
    "./fluent/gitlab",
    "./fluent/forgejo",
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
  const client: PanGit.api.FluentClient<"gitea", typeof version> = await PanGit.api
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

Deno.test("optional fluent capabilities are typed, synchronous handles with local support", async () => {
  let fetchCalls = 0;
  const version = "1.27.2" as const;
  const client = await PanGit.api.createClient("gitea", version, {
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
  const verifyProviderExtensionTypes = async (
    repository126: PanGit.api.Repository<"gitea", "1.26.4">,
    repository127: PanGit.api.Repository<"gitea", "1.27.2">,
    pullRequest: PanGit.api.PullRequest<"gitea", "1.27.2">,
  ): Promise<void> => {
    const comparison: PanGit.api.ExecutableOperation<
      PanGit.api.CommitComparisonResult<"gitea", "1.27.2">
    > = repository127.commits.compare("main", "feature");
    const diff: PanGit.api.ExecutableOperation<GiteaCommitComparisonOutput> = repository127.commits
      .compare("main", "feature").gitea(() => ({ output: "diff" }));
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
    await PanGit.api.createClient("github", "latest", {
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

Deno.test("raw client construction captures mutable settings before loading the version", async () => {
  const baseUrl = new URL("https://original.invalid/api/v1");
  const headers = new Headers({ "x-fixture": "original" });
  const query = { fixture: ["original"] };
  const requests: Request[] = [];
  const pending = PanGit.createProviderClient("gitea", "1.27.2", {
    baseUrl,
    headers,
    query,
    fetch(input: Request | URL | string, init?: RequestInit) {
      requests.push(new Request(input, init));
      return Promise.resolve(Response.json({ version: "1.27.2" }));
    },
  });
  baseUrl.hostname = "changed.invalid";
  headers.set("x-fixture", "changed");
  query.fixture[0] = "changed";
  const client = await pending;
  await client.getVersion();
  assertEquals(requests.length, 1, "Expected one request");
  assertEquals(
    new URL(requests[0].url).hostname,
    "original.invalid",
    "Factory retained mutable URL",
  );
  assertEquals(
    requests[0].headers.get("x-fixture"),
    "original",
    "Factory retained mutable headers",
  );
  assertEquals(
    new URL(requests[0].url).searchParams.get("fixture"),
    "original",
    "Factory retained mutable query",
  );
});

Deno.test("raw factory rejects inherited and unknown registry keys", async () => {
  for (
    const [provider, version] of [["unknown", "latest"], ["constructor", "latest"], [
      "gitea",
      "toString",
    ]]
  ) {
    let caught: unknown;
    try {
      // Exercise untyped JavaScript callers without weakening the public TypeScript contract.
      // @ts-expect-error Invalid provider/version is deliberately rejected at runtime.
      await PanGit.createProviderClient(provider, version, "https://provider.invalid");
    } catch (error) {
      caught = error;
    }
    assertEquals(
      caught instanceof Error &&
        caught.message === `Unknown provider client version ${provider} ${version}`,
      true,
      "Factory accepted an inherited or unknown registry key",
    );
  }
});
