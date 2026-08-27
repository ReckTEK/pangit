import { azureDevOpsOperations, AzureDevOpsRestClient } from "./generated/azure-devops.ts";
import { bitbucketOperations, BitbucketRestClient } from "./generated/bitbucket.ts";
import { codebergOperations, CodebergRestClient } from "./generated/codeberg.ts";
import { giteaOperations, GiteaRestClient } from "./generated/gitea.ts";
import {
  gitHubOperations,
  GitHubRestClient,
  type ReposGetContentInput,
} from "./generated/github.ts";
import {
  type GetApiV4ProjectsIdPackagesRubygemsFileNameInput,
  gitLabOperations,
  GitLabRestClient,
} from "./generated/gitlab.ts";
import { RestClient, type RestOperation, type RestOperationInput } from "./rest.ts";

Deno.test("provider fixtures preserve Azure and Bitbucket download contracts", async () => {
  const azure = fixtureTransport(
    () => binaryResponse(200, "application/zip", [1, 2]),
  );
  const azureResult = await new AzureDevOpsRestClient(azure.rest).blobsGetBlob({
    path: {
      organization: "org",
      project: "project",
      repositoryId: "repo",
      sha1: "abc123",
    },
    query: { "api-version": "7.2-preview.1" },
  });
  assertDocumentedBlob(azureResult, 200, "application/zip");
  assertEquals(azure.request().method, "GET");
  assertEquals(
    azure.request().url,
    "https://api.example.test/org/project/_apis/git/repositories/repo/blobs/abc123?api-version=7.2-preview.1",
  );
  assertEquals(
    azure.request().headers.get("accept"),
    "application/json, application/octet-stream, application/zip",
  );
  assertEquals(await blobBytes(azureResult.body), "1,2");

  const bitbucket = fixtureTransport(
    () => binaryResponse(404, "application/octet-stream", [3, 4]),
  );
  const bitbucketResult = await new BitbucketRestClient(bitbucket.rest).getPipelineContainerLog({
    path: {
      log_uuid: "log",
      pipeline_uuid: "pipeline",
      repo_slug: "repo",
      step_uuid: "step",
      workspace: "workspace",
    },
  });
  assertDocumentedBlob(bitbucketResult, 404, "application/octet-stream");
  assertEquals(bitbucketResult.ok, false);
  assertEquals(bitbucket.request().method, "GET");
  assertEquals(
    bitbucket.request().url,
    "https://api.example.test/repositories/workspace/repo/pipelines/pipeline/steps/step/logs/log",
  );
  assertEquals(bitbucket.request().headers.get("accept"), null);
  assertEquals(await blobBytes(bitbucketResult.body), "3,4");
  assert(
    (Object.values(bitbucketOperations) as readonly RestOperation[]).every((operation) =>
      (operation.requestMediaTypes ?? []).every((mediaType) => mediaType === "application/json")
    ),
    "Bitbucket source unexpectedly exposes upload request media",
  );
});

Deno.test("provider fixtures preserve Azure upload and documented-error inventory", async () => {
  const azure = fixtureTransport(
    () =>
      new Response('{"displayName":"notes file.txt","id":42}', {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
  );
  const result = await new AzureDevOpsRestClient(azure.rest).pullRequestAttachmentsCreate({
    path: {
      fileName: "notes file.txt",
      organization: "org",
      project: "project",
      pullRequestId: 42,
      repositoryId: "repo",
    },
    query: { "api-version": "7.2-preview.1" },
    body: { mediaType: "application/octet-stream", value: new Uint8Array([13, 14]) },
  });

  assert(result.documented && result.status === 201, "Azure upload was undocumented");
  assertEquals(result.mediaType, "application/json");
  assertEquals(result.body.displayName, "notes file.txt");
  assertEquals(result.body.id, 42);
  assertEquals(azure.request().method, "POST");
  assertEquals(
    azure.request().url,
    "https://api.example.test/org/project/_apis/git/repositories/repo/pullRequests/42/attachments/notes%20file.txt?api-version=7.2-preview.1",
  );
  assertEquals(azure.request().headers.get("content-type"), "application/octet-stream");
  assertEquals(azure.request().headers.get("accept"), "application/json");
  assertEquals(azure.request().headers.get("authorization"), "Bearer fixture");
  assertEquals(await requestBytes(azure.request()), "13,14");

  const documentedErrors = Object.values(azureDevOpsOperations).flatMap((operation) =>
    operation.responses.filter((response) =>
      typeof response.status === "number" &&
      (response.status < 200 || response.status >= 300)
    )
  );
  assertEquals(documentedErrors.length, 0);
});

Deno.test("provider fixtures preserve Codeberg and GitLab archive contracts", async () => {
  const codeberg = fixtureTransport(
    () => binaryResponse(200, "application/zip", [5, 6]),
  );
  const codebergResult = await new CodebergRestClient(codeberg.rest).repoGetActionRunLogs({
    path: { owner: "owner", repo: "repo", run_id: 9_007_199_254_740_993n },
  });
  assertDocumentedBlob(codebergResult, 200, "application/zip");
  assertEquals(codeberg.request().method, "GET");
  assertEquals(
    codeberg.request().url,
    "https://api.example.test/repos/owner/repo/actions/runs/9007199254740993/logs",
  );
  assertEquals(codeberg.request().headers.get("accept"), "application/zip");
  assertEquals(await blobBytes(codebergResult.body), "5,6");

  const gitlab = fixtureTransport(
    () => binaryResponse(200, "application/x-tar", [7, 8]),
  );
  const gitlabResult = await new GitLabRestClient(gitlab.rest).getApiV4ProjectsIdSnapshot({
    path: { id: "group/project" },
  });
  assertDocumentedBlob(gitlabResult, 200, "application/x-tar");
  assertEquals(gitlab.request().method, "GET");
  assertEquals(
    gitlab.request().url,
    "https://api.example.test/api/v4/projects/group%2Fproject/snapshot",
  );
  assertEquals(gitlab.request().headers.get("accept"), "application/x-tar");
  assertEquals(await blobBytes(gitlabResult.body), "7,8");
});

Deno.test("provider fixtures preserve Codeberg multipart upload and documented error", async () => {
  const codeberg = fixtureTransport(
    () =>
      new Response('{"message":"invalid attachment","url":"https://docs.example.test"}', {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
  );
  const result = await new CodebergRestClient(codeberg.rest).issueCreateIssueAttachment({
    path: { index: 9_007_199_254_740_993n, owner: "owner", repo: "repo" },
    query: { name: "evidence.bin", updated_at: "2026-08-26T12:34:56Z" },
    body: {
      mediaType: "multipart/form-data",
      value: { attachment: new Uint8Array([15, 16]) },
    },
  });

  assert(result.documented && result.status === 400, "Codeberg error was undocumented");
  assertEquals(result.ok, false);
  assertEquals(result.mediaType, "application/json");
  assertEquals((result.body as { message?: string }).message, "invalid attachment");
  assertEquals((result.body as { url?: string }).url, "https://docs.example.test");
  assertEquals(codeberg.request().method, "POST");
  assertEquals(
    codeberg.request().url,
    "https://api.example.test/repos/owner/repo/issues/9007199254740993/assets?name=evidence.bin&updated_at=2026-08-26T12%3A34%3A56Z",
  );
  assertEquals(codeberg.request().headers.get("accept"), "application/json, text/html");
  assert(
    codeberg.request().headers.get("content-type")?.startsWith("multipart/form-data; boundary="),
    "Codeberg multipart boundary was missing",
  );
  assertEquals(codeberg.request().headers.get("authorization"), "Bearer fixture");
  const form = await codeberg.request().formData();
  const attachment = form.get("attachment");
  assert(attachment instanceof Blob, "Codeberg attachment was not binary multipart data");
  assertEquals(await blobBytes(attachment), "15,16");
});

Deno.test("provider fixtures preserve Gitea and GitHub upload contracts", async () => {
  const gitea = fixtureTransport(
    () =>
      new Response(null, {
        status: 413,
        headers: { message: "too large", url: "https://docs.example.test/limits" },
      }),
  );
  const giteaResult = await new GiteaRestClient(gitea.rest).repoCreateReleaseAttachment({
    path: { id: 9_007_199_254_740_993n, owner: "owner", repo: "repo" },
    body: { mediaType: "application/octet-stream", value: new Uint8Array([9, 10]) },
  });
  assert(giteaResult.documented && giteaResult.status === 413, "Gitea error was undocumented");
  assertEquals(giteaResult.ok, false);
  assertEquals(giteaResult.body, undefined);
  assertEquals(giteaResult.headerValues.message, "too large");
  assertEquals(giteaResult.headerValues.url, "https://docs.example.test/limits");
  assertEquals(gitea.request().method, "POST");
  assertEquals(
    gitea.request().url,
    "https://api.example.test/repos/owner/repo/releases/9007199254740993/assets",
  );
  assertEquals(gitea.request().headers.get("content-type"), "application/octet-stream");
  assertEquals(gitea.request().headers.get("accept"), "application/json");
  assertEquals(gitea.request().headers.get("authorization"), "Bearer fixture");
  assertEquals(await requestBytes(gitea.request()), "9,10");

  const github = fixtureTransport(
    () =>
      new Response('{"id":1}', {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
  );
  const githubResult = await new GitHubRestClient(github.rest).reposUploadReleaseAsset({
    path: { owner: "owner", release_id: 1, repo: "repo" },
    query: { name: "asset.bin" },
    body: { mediaType: "application/octet-stream", value: new Uint8Array([11, 12]) },
  });
  assert(githubResult.documented && githubResult.status === 201, "GitHub upload undocumented");
  assertEquals(githubResult.mediaType, "application/json");
  assertEquals(githubResult.body.id, 1);
  assertEquals(github.request().method, "POST");
  assertEquals(
    github.request().url,
    "https://uploads.github.com/repos/owner/repo/releases/1/assets?name=asset.bin",
  );
  assertEquals(github.request().headers.get("authorization"), "Bearer fixture");
  assertEquals(github.request().headers.get("content-type"), "application/octet-stream");
  assertEquals(github.request().headers.get("accept"), "application/json");
  assertEquals(await requestBytes(github.request()), "11,12");

  const githubObject = fixtureTransport(
    () =>
      new Response('{"entries":[]}', {
        headers: { "content-type": "application/vnd.github.object" },
      }),
  );
  const githubObjectResult = await new GitHubRestClient(githubObject.rest).reposGetContent({
    path: { owner: "owner", path: "docs", repo: "repo" },
  });
  assert(
    githubObjectResult.documented && githubObjectResult.status === 200 &&
      githubObjectResult.mediaType === "application/vnd.github.object",
    "GitHub object representation was undocumented",
  );
  assert(Array.isArray(githubObjectResult.body.entries), "GitHub object media was not JSON");
});

Deno.test("provider fixtures preserve Gitea binary download contract", async () => {
  const gitea = fixtureTransport(
    () => binaryResponse(200, "application/octet-stream", [17, 18]),
  );
  const result = await new GiteaRestClient(gitea.rest).repoGetRawFile({
    path: { filepath: "docs/read me.md", owner: "owner", repo: "repo" },
    query: { ref: "feature/test" },
  });

  assertDocumentedBlob(result, 200, "application/octet-stream");
  assertEquals(await blobBytes(result.body), "17,18");
  assertEquals(gitea.request().method, "GET");
  assertEquals(
    gitea.request().url,
    "https://api.example.test/repos/owner/repo/raw/docs%2Fread%20me.md?ref=feature%2Ftest",
  );
  assertEquals(gitea.request().headers.get("accept"), "application/octet-stream");
  assertEquals(gitea.request().headers.get("authorization"), "Bearer fixture");
});

Deno.test("provider fixtures preserve GitHub text and documented error contracts", async () => {
  const github = fixtureTransport(
    () =>
      new Response("<p>Hello</p>", {
        headers: {
          "content-length": "12",
          "content-type": "text/html",
          "x-commonmarker-version": "0.31.1",
        },
      }),
  );
  const result = await new GitHubRestClient(github.rest).markdownRender({
    body: {
      mediaType: "application/json",
      value: { context: "owner/repo", mode: "gfm", text: "# Hello" },
    },
  });

  assert(result.documented && result.status === 200, "GitHub text response was undocumented");
  assertEquals(result.mediaType, "text/html");
  assertEquals(result.body, "<p>Hello</p>");
  assertEquals(result.headerValues["Content-Length"], "12");
  assertEquals(result.headerValues["Content-Type"], "text/html");
  assertEquals(result.headerValues["X-CommonMarker-Version"], "0.31.1");
  assertEquals(github.request().method, "POST");
  assertEquals(github.request().url, "https://api.example.test/markdown");
  assertEquals(github.request().headers.get("content-type"), "application/json");
  assertEquals(github.request().headers.get("accept"), "text/html");
  assertEquals(github.request().headers.get("authorization"), "Bearer fixture");
  assertEquals(
    await github.request().text(),
    '{"context":"owner/repo","mode":"gfm","text":"# Hello"}',
  );

  const githubError = fixtureTransport(() => new Response(null, { status: 304 }));
  const errorResult = await new GitHubRestClient(githubError.rest).markdownRender({
    body: { mediaType: "application/json", value: { text: "cached" } },
  });
  assert(
    errorResult.documented && errorResult.status === 304,
    "GitHub documented error was undocumented",
  );
  assertEquals(errorResult.ok, false);
  assertEquals(errorResult.mediaType, undefined);
  assertEquals(errorResult.body, undefined);
  assertEquals(githubError.request().method, "POST");
  assertEquals(githubError.request().url, "https://api.example.test/markdown");
  assertEquals(githubError.request().headers.get("content-type"), "application/json");
  assertEquals(githubError.request().headers.get("accept"), "text/html");
});

Deno.test("provider fixtures preserve GitLab multipart upload and documented error", async () => {
  const gitlab = fixtureTransport(() => new Response(null, { status: 403 }));
  const result = await new GitLabRestClient(gitlab.rest).postApiV4GroupsImport({
    body: {
      mediaType: "multipart/form-data",
      value: {
        file: new Uint8Array([19, 20]),
        name: "Imported Group",
        organization_id: 7,
        parent_id: 8,
        path: "imported-group",
      },
    },
  });

  assert(result.documented && result.status === 403, "GitLab error was undocumented");
  assertEquals(result.ok, false);
  assertEquals(result.mediaType, undefined);
  assertEquals(result.body, undefined);
  assertEquals(gitlab.request().method, "POST");
  assertEquals(gitlab.request().url, "https://api.example.test/api/v4/groups/import");
  assertEquals(gitlab.request().headers.get("accept"), null);
  assertEquals(gitlab.request().headers.get("authorization"), "Bearer fixture");
  assert(
    gitlab.request().headers.get("content-type")?.startsWith("multipart/form-data; boundary="),
    "GitLab multipart boundary was missing",
  );
  const form = await gitlab.request().formData();
  const file = form.get("file");
  assert(file instanceof Blob, "GitLab import file was not binary multipart data");
  assertEquals(await blobBytes(file), "19,20");
  assertEquals(form.get("name"), "Imported Group");
  assertEquals(form.get("organization_id"), "7");
  assertEquals(form.get("parent_id"), "8");
  assertEquals(form.get("path"), "imported-group");
});

Deno.test("provider GET-body declarations remain faithful despite native Fetch limits", async () => {
  const githubBodyless: ReposGetContentInput = {
    path: { owner: "owner", path: "README.md", repo: "repo" },
  };
  void githubBodyless;
  const githubBody: ReposGetContentInput = {
    path: { owner: "owner", path: "README.md", repo: "repo" },
    body: { mediaType: "application/json", value: { provider_extension: true } },
  };
  const invalidGitHubBody: ReposGetContentInput = {
    path: { owner: "owner", path: "README.md", repo: "repo" },
    // @ts-expect-error Schema-less JSON remains strict instead of accepting functions.
    body: { mediaType: "application/json", value: { invalid: () => undefined } },
  };
  void invalidGitHubBody;

  const gitlabBody: GetApiV4ProjectsIdPackagesRubygemsFileNameInput = {
    path: { file_name: "specs.4.8.gz", id: 1 },
    body: { mediaType: "application/octet-stream", value: new Uint8Array([1]) },
  };
  // @ts-expect-error GitLab declares this GET request body as required.
  const missingGitLabBody: GetApiV4ProjectsIdPackagesRubygemsFileNameInput = {
    path: { file_name: "specs.4.8.gz", id: 1 },
  };
  void missingGitLabBody;

  assertEquals(
    gitHubOperations.reposGetContent.method,
    "GET",
  );
  assertEquals(
    JSON.stringify(gitHubOperations.reposGetContent.requestMediaTypes),
    '["application/json"]',
  );
  for (
    const operation of [
      gitLabOperations.getApiV4ProjectsIdPackagesRubygemsFileName,
      gitLabOperations.getApiV4ProjectsIdPackagesRubygemsGemsFileName,
      gitLabOperations.getApiV4ProjectsIdPackagesRubygemsQuickMarshal48FileName,
    ]
  ) {
    assertEquals(operation.method, "GET");
    assertEquals(JSON.stringify(operation.requestMediaTypes), '["application/octet-stream"]');
  }

  let fetchCalls = 0;
  const rest = new RestClient({
    baseUrl: "https://api.example.test",
    fetch: () => {
      fetchCalls += 1;
      return Promise.resolve(new Response(null));
    },
  });
  const github = new GitHubRestClient(rest);
  const gitlab = new GitLabRestClient(rest);
  const bodyBearingRequests = [
    () => github.reposGetContent(githubBody),
    () => gitlab.getApiV4ProjectsIdPackagesRubygemsFileName(gitlabBody),
    () =>
      gitlab.getApiV4ProjectsIdPackagesRubygemsGemsFileName({
        path: { file_name: "package.gem", id: 1 },
        body: { mediaType: "application/octet-stream", value: new Uint8Array([2]) },
      }),
    () =>
      gitlab.getApiV4ProjectsIdPackagesRubygemsQuickMarshal48FileName({
        path: { file_name: "package.gemspec.rz", id: 1 },
        body: { mediaType: "application/octet-stream", value: new Uint8Array([3]) },
      }),
  ];

  // Native Fetch prohibits GET/HEAD bodies even when the provider contract declares one.
  for (const request of bodyBearingRequests) {
    const error = await captureRejection(request());
    assert(error instanceof TypeError, "native GET-body limitation did not produce TypeError");
    assertEquals(error.message, "Request with GET/HEAD method cannot have body");
  }
  assertEquals(fetchCalls, 0);
});

Deno.test("every provider preserves native pagination, auth, and response headers", async () => {
  const azure = fixtureTransport(
    () =>
      new Response("[]", {
        headers: {
          "content-type": "application/json",
          "x-ms-continuationtoken": "azure-next",
        },
      }),
  );
  const azureResult = await new AzureDevOpsRestClient(azure.rest).policyConfigurationsGet({
    path: { organization: "org", project: "project" },
    query: {
      "$top": 50,
      "api-version": "7.2-preview.1",
      continuationToken: "azure-current",
    },
  });
  assertEquals(
    azure.request().url,
    "https://api.example.test/org/project/_apis/git/policy/configurations?%24top=50&api-version=7.2-preview.1&continuationToken=azure-current",
  );
  assertEquals(azureResult.headerValues["x-ms-continuationtoken"], "azure-next");

  const bitbucket = fixtureTransport(
    () =>
      new Response("{}", {
        headers: { "content-type": "application/json", "x-next-page": "bitbucket-next" },
      }),
  );
  const bitbucketResult = await new BitbucketRestClient(bitbucket.rest)
    .getPipelinesForRepository({
      path: { repo_slug: "repo", workspace: "workspace" },
      query: { page: 2, pagelen: 50 },
    });
  assertEquals(
    bitbucket.request().url,
    "https://api.example.test/repositories/workspace/repo/pipelines?page=2&pagelen=50",
  );
  assertEquals(bitbucketResult.headers.get("x-next-page"), "bitbucket-next");

  const codeberg = fixtureTransport(
    () =>
      new Response("[]", {
        headers: { "content-type": "application/json", "x-total-count": "101" },
      }),
  );
  const codebergResult = await new CodebergRestClient(codeberg.rest).repoListBranches({
    path: { owner: "owner", repo: "repo" },
    query: { limit: 50n, page: 3n },
  });
  assertEquals(
    codeberg.request().url,
    "https://api.example.test/repos/owner/repo/branches?limit=50&page=3",
  );
  assertEquals(codebergResult.headerValues["X-Total-Count"], "101");

  const gitea = fixtureTransport(
    () =>
      new Response("[]", {
        headers: { "content-type": "application/json", "x-total-count": "102" },
      }),
  );
  const giteaResult = await new GiteaRestClient(gitea.rest).repoListBranches({
    path: { owner: "owner", repo: "repo" },
    query: { limit: 50n, page: 4n, q: "release" },
  });
  assertEquals(
    gitea.request().url,
    "https://api.example.test/repos/owner/repo/branches?limit=50&page=4&q=release",
  );
  assertEquals(giteaResult.headers.get("x-total-count"), "102");

  const github = fixtureTransport(
    () =>
      new Response("[]", {
        headers: { "content-type": "application/json", link: "<github-next>; rel=next" },
      }),
  );
  const githubResult = await new GitHubRestClient(github.rest).reposListBranches({
    path: { owner: "owner", repo: "repo" },
    query: { page: 5n, per_page: 50n, protected: true },
  });
  assertEquals(
    github.request().url,
    "https://api.example.test/repos/owner/repo/branches?page=5&per_page=50&protected=true",
  );
  assertEquals(githubResult.headerValues.Link, "<github-next>; rel=next");

  const gitlab = fixtureTransport(
    () =>
      new Response("[]", {
        headers: { "content-type": "application/json", "x-next-page": "7" },
      }),
  );
  const gitlabResult = await new GitLabRestClient(gitlab.rest)
    .getApiV4ProjectsIdRepositoryBranches({
      path: { id: "group/project" },
      query: { page: 6, page_token: "main", per_page: 50, sort: "name_asc" },
    });
  assertEquals(
    gitlab.request().url,
    "https://api.example.test/api/v4/projects/group%2Fproject/repository/branches?page=6&page_token=main&per_page=50&sort=name_asc",
  );
  assertEquals(gitlabResult.headers.get("x-next-page"), "7");

  for (const capture of [azure, bitbucket, codeberg, gitea, github, gitlab]) {
    assertEquals(capture.request().headers.get("authorization"), "Bearer fixture");
  }
});

Deno.test("every provider retains an honest undocumented-response branch", async () => {
  const cases: readonly [string, RestOperation, RestOperationInput][] = [
    [
      "azure-devops",
      azureDevOpsOperations.policyConfigurationsGet,
      {
        path: { organization: "org", project: "project" },
        query: { "api-version": "7.2-preview.1" },
      },
    ],
    [
      "bitbucket",
      bitbucketOperations.getPipelinesForRepository,
      { path: { repo_slug: "repo", workspace: "workspace" } },
    ],
    [
      "codeberg",
      codebergOperations.repoListBranches,
      { path: { owner: "owner", repo: "repo" } },
    ],
    [
      "gitea",
      giteaOperations.repoListBranches,
      { path: { owner: "owner", repo: "repo" } },
    ],
    [
      "github",
      gitHubOperations.reposListBranches,
      { path: { owner: "owner", repo: "repo" } },
    ],
    [
      "gitlab",
      gitLabOperations.getApiV4ProjectsIdRepositoryBranches,
      { path: { id: "group/project" } },
    ],
  ];

  for (const [provider, operation, input] of cases) {
    const rest = new RestClient({
      baseUrl: "https://api.example.test",
      fetch: () =>
        Promise.resolve(
          new Response('{"future":true}', {
            status: 599,
            headers: { "content-type": "application/problem+json" },
          }),
        ),
    });
    const result = await rest.request(operation, input);
    assert(!result.documented, `${provider} mislabeled future response as documented`);
    assertEquals(result.status, 599);
    assertEquals((result.body as { future?: boolean }).future, true);
  }
});

Deno.test("GitLab malformed wildcard declarations preserve route captures and query parameters", async () => {
  const gitlab = fixtureTransport(() => new Response(null));
  await new GitLabRestClient(gitlab.rest)
    .getApiV4ProjectsProjectIdPackagesNugetV2PackagesIdPackageNameVersionPackageVersion({
      path: {
        package_name: "a!b*c(d)'e",
        package_version: "1.2.3",
        project_id: "project",
      },
      query: {
        package_name: "declared-package",
        package_version: "9.9.9",
      },
    });

  assertEquals(
    gitlab.request().url,
    "https://api.example.test/api/v4/projects/project/packages/nuget/v2/Packages(Id='a%21b%2Ac%28d%29%27e',Version='1.2.3')?package_name=declared-package&package_version=9.9.9",
  );
  assertEquals(
    JSON.stringify(
      gitLabOperations
        .getApiV4ProjectsProjectIdPackagesNugetV2PackagesIdPackageNameVersionPackageVersion
        .queryParameters,
    ),
    '[{"name":"package_name","style":"form","explode":true},{"name":"package_version","style":"form","explode":true}]',
  );
});

function fixtureTransport(response: () => Response): {
  rest: RestClient;
  request: () => Request;
} {
  let captured: Request | undefined;
  return {
    rest: new RestClient({
      baseUrl: "https://api.example.test",
      headers: { authorization: "Bearer fixture" },
      fetch: (input) => {
        captured = input instanceof Request ? input : new Request(input);
        return Promise.resolve(response());
      },
    }),
    request: () => {
      assert(captured !== undefined, "provider fixture did not execute Fetch");
      return captured;
    },
  };
}

function binaryResponse(status: number, mediaType: string, bytes: number[]): Response {
  return new Response(new Uint8Array(bytes), {
    status,
    headers: { "content-type": mediaType },
  });
}

function assertDocumentedBlob(
  result: { documented: boolean; status: number; mediaType?: string; body: unknown },
  status: number,
  mediaType: string,
): asserts result is { documented: true; status: number; mediaType: string; body: Blob } {
  assert(result.documented, "provider response was undocumented");
  assertEquals(result.status, status);
  assertEquals(result.mediaType, mediaType);
  assert(result.body instanceof Blob, "provider binary response was not a Blob");
}

async function requestBytes(request: Request): Promise<string> {
  return [...new Uint8Array(await request.arrayBuffer())].join(",");
}

async function blobBytes(blob: Blob): Promise<string> {
  return [...new Uint8Array(await blob.arrayBuffer())].join(",");
}

async function captureRejection(value: Promise<unknown>): Promise<unknown> {
  try {
    await value;
  } catch (error) {
    return error;
  }
  throw new Error("Expected promise to reject");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
