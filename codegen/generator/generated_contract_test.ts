import auditBaseline from "./audit-baseline.json" with { type: "json" };
import publicNames from "./public-names.json" with { type: "json" };
import {
  auditNormalizedCorpus,
  type OpenApiDefaultNoContentResponseBranch,
  type OpenApiDocumentAudit,
  type OpenApiRequestBodyFamily,
  type OpenApiRequestMediaBranch,
  type OpenApiResponseBodyFamily,
  type OpenApiResponseDecoder,
  type OpenApiResponseMediaBranch,
  requestMediaBranchKey,
  responseMediaBranchKey,
  reviewedRequestMediaPolicy,
} from "./audit.ts";
import {
  extractExportedTypeAliases,
  type ParsedRequestBodyType,
  type ParsedResponseType,
  parseRequestBodyTypes,
  parseResponseTypes,
} from "./generated_type_oracle.ts";
import {
  azureDevOpsOperations,
  AzureDevOpsRestClient,
  azureDevOpsSecuritySchemes,
  azureDevOpsServers,
} from "../../src/generated/azure-devops.ts";
import {
  bitbucketOperations,
  BitbucketRestClient,
  bitbucketSecuritySchemes,
  bitbucketServers,
  type GetUserEmailsResponse,
} from "../../src/generated/bitbucket.ts";
import {
  codebergOperations,
  CodebergRestClient,
  codebergSecuritySchemes,
  codebergServers,
} from "../../src/generated/codeberg.ts";
import {
  giteaOperations,
  GiteaRestClient,
  giteaSecuritySchemes,
  giteaServers,
} from "../../src/generated/gitea.ts";
import {
  gitHubOperations,
  GitHubRestClient,
  gitHubSecuritySchemes,
  gitHubServers,
} from "../../src/generated/github.ts";
import {
  type GetApiV4GroupsIdPackagesDebianDistsDistributionInreleaseInput,
  type GetApiV4GroupsIdSearchInput,
  gitLabOperations,
  GitLabRestClient,
  gitLabSecuritySchemes,
  gitLabServers,
} from "../../src/generated/gitlab.ts";
import type { RestOperation } from "../../src/rest.ts";

const providers = [
  [
    "azure-devops",
    azureDevOpsOperations,
    AzureDevOpsRestClient,
    azureDevOpsServers,
    azureDevOpsSecuritySchemes,
    new URL("../../src/generated/azure-devops.ts", import.meta.url),
  ],
  [
    "bitbucket",
    bitbucketOperations,
    BitbucketRestClient,
    bitbucketServers,
    bitbucketSecuritySchemes,
    new URL("../../src/generated/bitbucket.ts", import.meta.url),
  ],
  [
    "codeberg",
    codebergOperations,
    CodebergRestClient,
    codebergServers,
    codebergSecuritySchemes,
    new URL("../../src/generated/codeberg.ts", import.meta.url),
  ],
  [
    "gitea",
    giteaOperations,
    GiteaRestClient,
    giteaServers,
    giteaSecuritySchemes,
    new URL("../../src/generated/gitea.ts", import.meta.url),
  ],
  [
    "github",
    gitHubOperations,
    GitHubRestClient,
    gitHubServers,
    gitHubSecuritySchemes,
    new URL("../../src/generated/github.ts", import.meta.url),
  ],
  [
    "gitlab",
    gitLabOperations,
    GitLabRestClient,
    gitLabServers,
    gitLabSecuritySchemes,
    new URL("../../src/generated/gitlab.ts", import.meta.url),
  ],
] as const;

type ProviderName = (typeof providers)[number][0];

type GeneratedRequestMediaBranch = {
  key: string;
  bodyFamily: OpenApiRequestBodyFamily;
};

type GeneratedResponseMediaBranch = {
  key: string;
  decoder: OpenApiResponseDecoder | undefined;
  bodyFamily: OpenApiResponseBodyFamily | undefined;
};

type MediaMismatch = {
  direction: "request" | "response";
  field: "bodyFamily" | "branch" | "decoder";
  key: string;
  expected: string;
  actual: string;
};

type StaticTypeMismatch = {
  direction: "request" | "response";
  field: "bodyFamily" | "branch" | "ok";
  key: string;
  expected: string;
  actual: string;
};

Deno.test("generated registries exactly match source media branches and reviewed diagnostics", async () => {
  const sourceAudits = await auditNormalizedCorpus();
  const mediaMismatches: MediaMismatch[] = [];
  const staticTypeMismatches: StaticTypeMismatch[] = [];
  let totalOperations = 0;
  let totalRequestMedia = 0;
  let totalResponseMedia = 0;
  let totalResponseHeaders = 0;
  let totalSecurityRequirements = 0;

  for (const [provider, registry, Client, servers, securitySchemes, sourceFile] of providers) {
    const summary = auditBaseline[provider].summary;
    const operationNames = Object.keys(registry);
    const operations = Object.values(registry) as RestOperation[];
    const methodNames = Object.getOwnPropertyNames(Client.prototype)
      .filter((name) => name !== "constructor")
      .toSorted();
    assertEquals(methodNames, operationNames);
    assertEquals(operationNames.length, summary.operations);
    assert(Object.isFrozen(registry), `${provider} registry is not frozen`);
    assert(Object.isFrozen(Client.servers), `${provider} server metadata is not frozen`);
    assert(Object.isFrozen(Client.securitySchemes), `${provider} security metadata is not frozen`);
    assert(Client.servers === servers, `${provider} class server metadata identity changed`);
    assert(
      Client.securitySchemes === securitySchemes,
      `${provider} class security metadata identity changed`,
    );
    for (
      const [property, expected] of [
        ["servers", servers],
        ["securitySchemes", securitySchemes],
      ] as const
    ) {
      const descriptor = Object.getOwnPropertyDescriptor(Client, property);
      assert(typeof descriptor?.get === "function", `${provider}.${property} is not a getter`);
      assertEquals(descriptor.set, undefined);
      assertEquals(descriptor.configurable, false);
      assertThrows(() => {
        (Client as unknown as Record<string, unknown>)[property] = [];
      }, `${provider}.${property} accepted reassignment`);
      assert(Client[property] === expected, `${provider}.${property} changed after reassignment`);
    }

    const generatedRequests: GeneratedRequestMediaBranch[] = [];
    const generatedResponses: GeneratedResponseMediaBranch[] = [];
    for (const operation of operations) {
      assert(Object.isFrozen(operation), `${provider}.${operation.id} is not frozen`);
      assert(Object.isFrozen(operation.responses), `${provider}.${operation.id} responses mutable`);
      totalOperations++;
      totalRequestMedia += operation.requestMediaTypes?.length ?? 0;
      totalSecurityRequirements += operation.security?.length ?? 0;

      for (const mediaType of operation.requestMediaTypes ?? []) {
        generatedRequests.push({
          key: requestMediaBranchKey(
            provider,
            operation.method,
            operation.path,
            operation.id,
            mediaType,
          ),
          bodyFamily: reviewedRequestMediaPolicy(mediaType).family,
        });
      }

      for (const response of operation.responses) {
        assert(Object.isFrozen(response), `${provider}.${operation.id} response mutable`);
        const decoderMedia = Object.keys(response.decoders ?? {}).toSorted();
        assertEquals(decoderMedia, [...response.mediaTypes].toSorted());
        for (const mediaType of response.mediaTypes) {
          const decoder = response.decoders?.[mediaType];
          generatedResponses.push({
            key: responseMediaBranchKey(
              provider,
              operation.method,
              operation.path,
              operation.id,
              response.status,
              mediaType,
            ),
            decoder,
            bodyFamily: generatedBodyFamily(operation.method, response.status, decoder),
          });
        }
        totalResponseMedia += response.mediaTypes.length;
        totalResponseHeaders += response.headers?.length ?? 0;
      }
    }

    mediaMismatches.push(
      ...compareRequestMediaBranches(sourceAudits[provider].requestMedia, generatedRequests),
      ...compareResponseMediaBranches(sourceAudits[provider].responseMedia, generatedResponses),
    );
    staticTypeMismatches.push(
      ...compareGeneratedStaticMediaTypes(
        provider,
        sourceAudits[provider],
        await Deno.readTextFile(sourceFile),
      ),
    );
    assertEquals(generatedRequests.length, summary.requestMediaBranches);
    assertEquals(generatedResponses.length, summary.responseMediaBranches);
    assertEquals(
      operations.reduce(
        (count, operation) => count + (operation.security?.length ?? 0),
        0,
      ),
      summary.securityRequirements,
    );
    assertEquals(
      operations.reduce(
        (count, operation) =>
          count + operation.responses.reduce(
            (responseCount, response) => responseCount + (response.headers?.length ?? 0),
            0,
          ),
        0,
      ),
      summary.responseHeaderUses,
    );
  }

  assertEquals(mediaMismatches.toSorted(compareMismatches), []);
  assertEquals(staticTypeMismatches.toSorted(compareStaticTypeMismatches), []);
  assertEquals(
    sourceAudits.bitbucket.defaultNoContentResponses
      .map((branch) => [branch.operationKey, branch.status])
      .toSorted(([leftKey, leftStatus], [rightKey, rightStatus]) =>
        compareText(String(leftKey), String(rightKey)) || Number(leftStatus) - Number(rightStatus)
      ),
    [
      ["paths:get:/user/emails", 204],
      ["paths:get:/user/emails", 205],
      ["paths:get:/user/emails/{email}", 204],
      ["paths:get:/user/emails/{email}", 205],
    ],
  );
  assertEquals(totalOperations, 3821);
  assertEquals(totalRequestMedia, sumBaseline("requestMediaBranches"));
  assertEquals(totalResponseMedia, sumBaseline("responseMediaBranches"));
  assertEquals(totalResponseHeaders, sumBaseline("responseHeaderUses"));
  assertEquals(totalSecurityRequirements, sumBaseline("securityRequirements"));

  // @ts-expect-error Exact registry keys must reject unknown operation names.
  void gitHubOperations.notARealOperation;
});

Deno.test("exact response oracle detects swaps hidden by equal aggregate counts", () => {
  const expected: OpenApiResponseMediaBranch[] = [
    responseExpectation("application/json", "json", "json"),
    responseExpectation("text/plain", "text", "string"),
  ];
  const aggregatePreservingSwap: GeneratedResponseMediaBranch[] = [
    responseActual("application/json", "text", "string"),
    responseActual("text/plain", "json", "json"),
  ];

  const mismatches = compareResponseMediaBranches(expected, aggregatePreservingSwap);
  assertEquals(mismatches.filter((mismatch) => mismatch.field === "decoder").length, 2);
  assertEquals(mismatches.filter((mismatch) => mismatch.field === "bodyFamily").length, 2);
});

Deno.test("static type oracle detects wrong body syntax despite correct decoder", () => {
  const expected = responseExpectation("application/json", "json", "json");
  const runtime = responseActual("application/json", "json", "json");
  assertEquals(compareResponseMediaBranches([expected], [runtime]), []);

  const aliasName = "SwapResponse";
  const aliases = extractExportedTypeAliases(
    `export type ${aliasName} =\n  | RestResponse<200, string, "application/json", true>\n  | RestUndocumentedResponse;`,
    new Set([aliasName]),
  );
  const mismatches = compareStaticResponseBranch(
    expected,
    parseResponseTypes(requiredAlias(aliases, aliasName)),
  );
  assertEquals(mismatches.length, 1);
  assertEquals(mismatches[0].field, "bodyFamily");
  assertEquals([mismatches[0].expected, mismatches[0].actual], ["json", "string"]);
});

Deno.test("default response members cannot overlap runtime no-content statuses", () => {
  type Status204 = DocumentedAtStatus<GetUserEmailsResponse, 204>;
  type Status200 = DocumentedAtStatus<GetUserEmailsResponse, 200>;
  type Status400 = DocumentedAtStatus<GetUserEmailsResponse, 400>;
  assertType<IsExactly<Status204["body"], undefined>>(true);
  assertType<IsExactly<Status204["mediaType"], undefined>>(true);
  assertType<IsExactly<Status204["ok"], true>>(true);
  assertType<IsExactly<Status200["ok"], true>>(true);
  assertType<IsExactly<Status400["ok"], false>>(true);

  const expected = {
    ...responseExpectation("application/json", "json", "json"),
    status: "default",
  } satisfies OpenApiResponseMediaBranch;
  const aliases = extractExportedTypeAliases(
    `export type OverlapResponse = RestResponse<number, RestJsonValue<unknown>, "application/json", boolean>;`,
    new Set(["OverlapResponse"]),
  );
  const mismatches = compareStaticResponseBranch(
    expected,
    parseResponseTypes(requiredAlias(aliases, "OverlapResponse")),
  );
  assertEquals(
    mismatches.map((mismatch) => mismatch.actual).toSorted(),
    ["0 matching members", "0 matching members", "number has all domain"],
  );

  const swappedOkAliases = extractExportedTypeAliases(
    `export type SwappedOkResponse =
      | RestResponse<Exclude<RestSuccessfulStatus, 204 | 205>, RestJsonValue<unknown>, "application/json", false>
      | RestResponse<Exclude<RestHttpStatus, RestSuccessfulStatus>, RestJsonValue<unknown>, "application/json", true>;`,
    new Set(["SwappedOkResponse"]),
  );
  const okMismatches = compareStaticResponseBranch(
    expected,
    parseResponseTypes(requiredAlias(swappedOkAliases, "SwappedOkResponse")),
  );
  assertEquals(okMismatches.filter((mismatch) => mismatch.field === "ok").length, 2);
});

Deno.test("GitLab wildcard contracts preserve distinct declared path and query values", async () => {
  const operation = gitLabOperations.getApiV4GroupsIdPackagesDebianDistsDistributionInrelease;
  assertEquals(operation.pathParameters, [
    { name: "distribution", multiSegment: true },
    { name: "id" },
  ]);
  assertEquals(operation.queryParameters, [
    { name: "distribution", style: "form", explode: true },
  ]);

  // @ts-expect-error Malformed provider contract still requires its declared query parameter.
  const missingQuery: GetApiV4GroupsIdPackagesDebianDistsDistributionInreleaseInput = {
    path: { id: "42", distribution: "stable/path" },
  };
  void missingQuery;

  const captured: Request[] = [];
  const client = new GitLabRestClient({
    baseUrl: "https://gitlab.test",
    fetch: (input: RequestInfo | URL) => {
      captured.push(input instanceof Request ? input : new Request(input));
      return Promise.resolve(new Response(null, { status: 200 }));
    },
  });
  await client.getApiV4GroupsIdPackagesDebianDistsDistributionInrelease({
    path: { id: "42", distribution: "stable/path" },
    query: { distribution: "query-suite" },
  });

  assertEquals(
    captured[0]?.url,
    "https://gitlab.test/api/v4/groups/42/-/packages/debian/dists/stable/path/InRelease?distribution=query-suite",
  );
});

Deno.test("GitLab optional route groups preserve every concrete provider URL shape", async () => {
  const groupedRoutes = [
    gitLabOperations.getApiV4GroupsIdSearch,
    gitLabOperations.postApiV4ProjectsIdRefRefTriggerPipeline,
    gitLabOperations.getApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName,
    gitLabOperations.putApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName,
    gitLabOperations
      .putApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileNameAuthorize,
    gitLabOperations.getApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileName,
    gitLabOperations.putApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileName,
    gitLabOperations.putApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileNameAuthorize,
    gitLabOperations.getApiV4ProjectsIdReleasesPermalinkLatestSuffixPath,
    gitLabOperations.getApiV4ProjectsIdSearch,
  ];
  assertEquals(groupedRoutes.length, 10);
  assertEquals(
    groupedRoutes.map((operation) => [operation.method, operation.path, operation.pathGroups]),
    [
      ["GET", "/api/v4/groups/{id}/-/search", [
        { start: 20, end: 22, selector: "0", defaultIncluded: true },
      ]],
      ["POST", "/api/v4/projects/{id}/ref/{ref}/trigger/pipeline", [
        { start: 22, end: 32, parameters: ["ref"] },
      ]],
      [
        "GET",
        "/api/v4/projects/{id}/packages/generic/{package_name}/{package_version}/{path}/{file_name}",
        [{ start: 72, end: 79, parameters: ["path"] }],
      ],
      [
        "PUT",
        "/api/v4/projects/{id}/packages/generic/{package_name}/{package_version}/{path}/{file_name}",
        [{ start: 72, end: 79, parameters: ["path"] }],
      ],
      [
        "PUT",
        "/api/v4/projects/{id}/packages/generic/{package_name}/{package_version}/{path}/{file_name}/authorize",
        [{ start: 72, end: 79, parameters: ["path"] }],
      ],
      [
        "GET",
        "/api/v4/projects/{id}/packages/ml_models/{model_version_id}/files/{path}/{file_name}",
        [{ start: 66, end: 73, parameters: ["path"] }],
      ],
      [
        "PUT",
        "/api/v4/projects/{id}/packages/ml_models/{model_version_id}/files/{path}/{file_name}",
        [{ start: 66, end: 73, parameters: ["path"] }],
      ],
      [
        "PUT",
        "/api/v4/projects/{id}/packages/ml_models/{model_version_id}/files/{path}/{file_name}/authorize",
        [{ start: 66, end: 73, parameters: ["path"] }],
      ],
      ["GET", "/api/v4/projects/{id}/releases/permalink/latest/{suffix_path}", [
        { start: 47, end: 48, parameters: ["suffix_path"] },
        { start: 48, end: 61, parameters: ["suffix_path"] },
      ]],
      ["GET", "/api/v4/projects/{id}/-/search", [
        { start: 22, end: 24, selector: "0", defaultIncluded: true },
      ]],
    ],
  );

  const invalidSelector: GetApiV4GroupsIdSearchInput = {
    path: { id: "1" },
    query: { scope: "blobs", search: "needle" },
    pathGroups: {
      // @ts-expect-error Generated literal selectors reject unknown group keys.
      "1": false,
    },
  };
  void invalidSelector;

  const captured: Request[] = [];
  const client = new GitLabRestClient({
    baseUrl: "https://gitlab.test",
    fetch: (input: RequestInfo | URL) => {
      captured.push(input instanceof Request ? input : new Request(input));
      return Promise.resolve(new Response(null, { status: 200 }));
    },
  });
  const groupSearch = {
    path: { id: "1" },
    query: { scope: "blobs" as const, search: "needle" },
  };
  await client.getApiV4GroupsIdSearch(groupSearch);
  await client.getApiV4GroupsIdSearch({ ...groupSearch, pathGroups: { "0": false } });
  const projectSearch = {
    path: { id: "1" },
    query: { scope: "blobs" as const, search: "needle" },
  };
  await client.getApiV4ProjectsIdSearch(projectSearch);
  await client.getApiV4ProjectsIdSearch({ ...projectSearch, pathGroups: { "0": false } });
  const trigger = {
    path: { id: "1" },
    body: { mediaType: "application/json" as const, value: { token: "token" } },
  };
  await client.postApiV4ProjectsIdRefRefTriggerPipeline(trigger);
  await client.postApiV4ProjectsIdRefRefTriggerPipeline({
    ...trigger,
    path: { id: "1", ref: "main" },
  });
  const generic = {
    id: "1",
    package_name: "pkg",
    package_version: "1.0",
    file_name: "file.bin",
  };
  await client.getApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName({
    path: generic,
    query: { package_version: "query-version" },
  });
  await client.getApiV4ProjectsIdPackagesGenericPackageNamePackageVersionPathFileName({
    path: { ...generic, path: "nested/dir" },
    query: { package_version: "query-version", path: "query-dir" },
  });
  const model = { id: "1", model_version_id: "2", file_name: "model.bin" };
  await client.getApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileName({ path: model });
  await client.getApiV4ProjectsIdPackagesMlModelsModelVersionIdFilesPathFileName({
    path: { ...model, path: "nested/dir" },
  });
  await client.getApiV4ProjectsIdReleasesPermalinkLatestSuffixPath({
    path: { id: "1" },
    query: { suffix_path: "query-only" },
  });
  await client.getApiV4ProjectsIdReleasesPermalinkLatestSuffixPath({
    path: { id: "1", suffix_path: "downloads/file" },
    query: { suffix_path: "query-suffix" },
  });

  assertEquals(captured.map((request) => request.url), [
    "https://gitlab.test/api/v4/groups/1/-/search?scope=blobs&search=needle",
    "https://gitlab.test/api/v4/groups/1/search?scope=blobs&search=needle",
    "https://gitlab.test/api/v4/projects/1/-/search?scope=blobs&search=needle",
    "https://gitlab.test/api/v4/projects/1/search?scope=blobs&search=needle",
    "https://gitlab.test/api/v4/projects/1/trigger/pipeline",
    "https://gitlab.test/api/v4/projects/1/ref/main/trigger/pipeline",
    "https://gitlab.test/api/v4/projects/1/packages/generic/pkg/1.0/file.bin?package_version=query-version",
    "https://gitlab.test/api/v4/projects/1/packages/generic/pkg/1.0/nested/dir/file.bin?package_version=query-version&path=query-dir",
    "https://gitlab.test/api/v4/projects/1/packages/ml_models/2/files/model.bin",
    "https://gitlab.test/api/v4/projects/1/packages/ml_models/2/files/nested/dir/model.bin",
    "https://gitlab.test/api/v4/projects/1/releases/permalink/latest?suffix_path=query-only",
    "https://gitlab.test/api/v4/projects/1/releases/permalink/latest/downloads/file?suffix_path=query-suffix",
  ]);
});

function compareGeneratedStaticMediaTypes(
  provider: ProviderName,
  audit: OpenApiDocumentAudit,
  generatedSource: string,
): StaticTypeMismatch[] {
  const symbols: Readonly<Record<string, string>> = publicNames.providers[provider].symbols;
  const requestAliases = new Map<string, string>();
  const responseAliases = new Map<string, string>();
  for (const branch of audit.requestMedia) {
    requestAliases.set(
      branch.operationKey,
      requiredSymbol(symbols, `input:${branch.operationKey}`),
    );
  }
  for (const branch of audit.responseMedia) {
    responseAliases.set(
      branch.operationKey,
      requiredSymbol(symbols, `response:${branch.operationKey}`),
    );
  }
  for (const branch of audit.defaultNoContentResponses) {
    responseAliases.set(
      branch.operationKey,
      requiredSymbol(symbols, `response:${branch.operationKey}`),
    );
  }

  const aliases = extractExportedTypeAliases(
    generatedSource,
    new Set([...requestAliases.values(), ...responseAliases.values()]),
  );
  const requestCache = new Map<string, ParsedRequestBodyType[]>();
  const responseCache = new Map<string, ParsedResponseType[]>();
  const mismatches: StaticTypeMismatch[] = [];
  for (const branch of audit.requestMedia) {
    const aliasName = requiredMapValue(requestAliases, branch.operationKey, "request alias");
    let parsed = requestCache.get(aliasName);
    if (parsed === undefined) {
      parsed = parseRequestBodyTypes(requiredAlias(aliases, aliasName));
      requestCache.set(aliasName, parsed);
    }
    mismatches.push(...compareStaticRequestBranch(branch, parsed));
  }
  for (const branch of audit.responseMedia) {
    const aliasName = requiredMapValue(responseAliases, branch.operationKey, "response alias");
    let parsed = responseCache.get(aliasName);
    if (parsed === undefined) {
      parsed = parseResponseTypes(requiredAlias(aliases, aliasName));
      responseCache.set(aliasName, parsed);
    }
    mismatches.push(...compareStaticResponseBranch(branch, parsed));
  }
  for (const branch of audit.defaultNoContentResponses) {
    const aliasName = requiredMapValue(responseAliases, branch.operationKey, "response alias");
    let parsed = responseCache.get(aliasName);
    if (parsed === undefined) {
      parsed = parseResponseTypes(requiredAlias(aliases, aliasName));
      responseCache.set(aliasName, parsed);
    }
    mismatches.push(...compareStaticDefaultNoContentBranch(branch, parsed));
  }
  return mismatches;
}

function compareStaticRequestBranch(
  expected: OpenApiRequestMediaBranch,
  actual: readonly ParsedRequestBodyType[],
): StaticTypeMismatch[] {
  const matches = actual.filter((branch) => branch.mediaType === expected.mediaType);
  if (matches.length !== 1) {
    return [staticTypeMismatch(
      "request",
      "branch",
      expected.key,
      "exactly one static RestBody member",
      `${matches.length} matching members`,
    )];
  }
  const [generated] = matches;
  return generated.family === expected.expectedBodyFamily ? [] : [staticTypeMismatch(
    "request",
    "bodyFamily",
    expected.key,
    expected.expectedBodyFamily,
    generated.family === "unrecognized"
      ? `unrecognized: ${generated.bodySyntax}`
      : generated.family,
  )];
}

function compareStaticResponseBranch(
  expected: OpenApiResponseMediaBranch,
  actual: readonly ParsedResponseType[],
): StaticTypeMismatch[] {
  const expectedMediaType = expected.expectedBodyFamily === "undefined"
    ? undefined
    : expected.mediaType;
  const matches = actual.filter((branch) =>
    branch.status === expected.status && branch.mediaType === expectedMediaType
  );
  if (expected.status === "default") {
    return compareStaticDefaultResponseMembers(expected, matches);
  }
  if (matches.length !== 1) {
    return [staticTypeMismatch(
      "response",
      "branch",
      expected.key,
      "exactly one static RestResponse member",
      `${matches.length} matching members`,
    )];
  }
  const [generated] = matches;
  const mismatches: StaticTypeMismatch[] = [];
  if (generated.family !== expected.expectedBodyFamily) {
    mismatches.push(staticTypeMismatch(
      "response",
      "bodyFamily",
      expected.key,
      expected.expectedBodyFamily,
      generated.family === "unrecognized"
        ? `unrecognized: ${generated.bodySyntax}`
        : generated.family,
    ));
  }
  const expectedOk = typeof expected.status === "number" && expected.status >= 200 &&
    expected.status < 300;
  if (generated.ok !== expectedOk) {
    mismatches.push(staticTypeMismatch(
      "response",
      "ok",
      expected.key,
      String(expectedOk),
      String(generated.ok),
    ));
  }
  return mismatches;
}

function compareStaticDefaultResponseMembers(
  expected: OpenApiResponseMediaBranch,
  matches: readonly ParsedResponseType[],
): StaticTypeMismatch[] {
  const mismatches: StaticTypeMismatch[] = [];
  const domains = [
    ["success", true],
    ["failure", false],
  ] as const;
  for (const [domain, expectedOk] of domains) {
    const domainMatches = matches.filter((branch) => branch.statusDomain === domain);
    if (domainMatches.length !== 1) {
      mismatches.push(staticTypeMismatch(
        "response",
        "branch",
        expected.key,
        `exactly one default ${domain} RestResponse member`,
        `${domainMatches.length} matching members`,
      ));
      continue;
    }
    const [generated] = domainMatches;
    if (
      domain === "success" && expected.expectedBodyFamily !== "undefined" &&
      (!generated.excludedStatuses.includes(204) || !generated.excludedStatuses.includes(205))
    ) {
      mismatches.push(staticTypeMismatch(
        "response",
        "branch",
        expected.key,
        "default success status excluding 204 and 205",
        `${generated.statusSyntax} overlaps 204/205`,
      ));
    }
    if (generated.family !== expected.expectedBodyFamily) {
      mismatches.push(staticTypeMismatch(
        "response",
        "bodyFamily",
        expected.key,
        expected.expectedBodyFamily,
        generated.family === "unrecognized"
          ? `unrecognized: ${generated.bodySyntax}`
          : generated.family,
      ));
    }
    if (generated.ok !== expectedOk) {
      mismatches.push(staticTypeMismatch(
        "response",
        "ok",
        expected.key,
        String(expectedOk),
        String(generated.ok),
      ));
    }
  }
  for (
    const generated of matches.filter((branch) =>
      branch.statusDomain !== "success" && branch.statusDomain !== "failure"
    )
  ) {
    mismatches.push(staticTypeMismatch(
      "response",
      "branch",
      expected.key,
      "split default success/failure domains",
      `${generated.statusSyntax} has ${generated.statusDomain} domain`,
    ));
  }
  return mismatches;
}

function compareStaticDefaultNoContentBranch(
  expected: OpenApiDefaultNoContentResponseBranch,
  actual: readonly ParsedResponseType[],
): StaticTypeMismatch[] {
  const matches = actual.filter((branch) =>
    branch.status === expected.status && branch.mediaType === undefined
  );
  if (matches.length !== 1) {
    return [staticTypeMismatch(
      "response",
      "branch",
      expected.key,
      "exactly one default-backed no-content RestResponse member",
      `${matches.length} matching members`,
    )];
  }
  const [generated] = matches;
  const mismatches: StaticTypeMismatch[] = [];
  if (generated.family !== expected.expectedBodyFamily) {
    mismatches.push(staticTypeMismatch(
      "response",
      "bodyFamily",
      expected.key,
      expected.expectedBodyFamily,
      generated.family === "unrecognized"
        ? `unrecognized: ${generated.bodySyntax}`
        : generated.family,
    ));
  }
  if (generated.ok !== true) {
    mismatches.push(staticTypeMismatch(
      "response",
      "ok",
      expected.key,
      "true",
      String(generated.ok),
    ));
  }
  return mismatches;
}

function compareRequestMediaBranches(
  expected: readonly OpenApiRequestMediaBranch[],
  actual: readonly GeneratedRequestMediaBranch[],
): MediaMismatch[] {
  const mismatches: MediaMismatch[] = [];
  const actualByKey = uniqueByKey(actual, "generated request");
  for (const branch of expected) {
    const generated = actualByKey.get(branch.key);
    if (generated === undefined) {
      mismatches.push(mismatch("request", "branch", branch.key, "present", "missing"));
      continue;
    }
    actualByKey.delete(branch.key);
    if (generated.bodyFamily !== branch.expectedBodyFamily) {
      mismatches.push(mismatch(
        "request",
        "bodyFamily",
        branch.key,
        branch.expectedBodyFamily,
        generated.bodyFamily,
      ));
    }
  }
  for (const key of actualByKey.keys()) {
    mismatches.push(mismatch("request", "branch", key, "missing", "present"));
  }
  return mismatches;
}

function compareResponseMediaBranches(
  expected: readonly OpenApiResponseMediaBranch[],
  actual: readonly GeneratedResponseMediaBranch[],
): MediaMismatch[] {
  const mismatches: MediaMismatch[] = [];
  const actualByKey = uniqueByKey(actual, "generated response");
  for (const branch of expected) {
    const generated = actualByKey.get(branch.key);
    if (generated === undefined) {
      mismatches.push(mismatch("response", "branch", branch.key, "present", "missing"));
      continue;
    }
    actualByKey.delete(branch.key);
    if (generated.decoder !== branch.expectedDecoder) {
      mismatches.push(mismatch(
        "response",
        "decoder",
        branch.key,
        branch.expectedDecoder,
        String(generated.decoder),
      ));
    }
    if (generated.bodyFamily !== branch.expectedBodyFamily) {
      mismatches.push(mismatch(
        "response",
        "bodyFamily",
        branch.key,
        branch.expectedBodyFamily,
        String(generated.bodyFamily),
      ));
    }
  }
  for (const key of actualByKey.keys()) {
    mismatches.push(mismatch("response", "branch", key, "missing", "present"));
  }
  return mismatches;
}

function uniqueByKey<T extends { key: string }>(
  branches: readonly T[],
  label: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const branch of branches) {
    if (result.has(branch.key)) throw new Error(`Duplicate ${label} branch: ${branch.key}`);
    result.set(branch.key, branch);
  }
  return result;
}

function generatedBodyFamily(
  method: string,
  status: number | "default",
  decoder: OpenApiResponseDecoder | undefined,
): OpenApiResponseBodyFamily | undefined {
  if (method === "HEAD" || status === 204 || status === 205) return "undefined";
  if (decoder === "json") return "json";
  if (decoder === "text") return "string";
  if (decoder === "binary") return "blob";
  return undefined;
}

function mismatch(
  direction: MediaMismatch["direction"],
  field: MediaMismatch["field"],
  key: string,
  expected: string,
  actual: string,
): MediaMismatch {
  return { direction, field, key, expected, actual };
}

function compareMismatches(left: MediaMismatch, right: MediaMismatch): number {
  return compareText(left.key, right.key) || compareText(left.field, right.field) ||
    compareText(left.direction, right.direction);
}

function staticTypeMismatch(
  direction: StaticTypeMismatch["direction"],
  field: StaticTypeMismatch["field"],
  key: string,
  expected: string,
  actual: string,
): StaticTypeMismatch {
  return { direction, field, key, expected, actual };
}

function compareStaticTypeMismatches(
  left: StaticTypeMismatch,
  right: StaticTypeMismatch,
): number {
  return compareText(left.key, right.key) || compareText(left.field, right.field) ||
    compareText(left.direction, right.direction);
}

function requiredSymbol(symbols: Readonly<Record<string, string>>, key: string): string {
  const value = symbols[key];
  if (value === undefined) throw new Error(`Missing locked public symbol ${key}`);
  return value;
}

function requiredAlias(aliases: ReadonlyMap<string, string>, name: string): string {
  return requiredMapValue(aliases, name, "type alias");
}

function requiredMapValue<TKey, TValue>(
  values: ReadonlyMap<TKey, TValue>,
  key: TKey,
  label: string,
): TValue {
  const value = values.get(key);
  if (value === undefined) throw new Error(`Missing ${label} ${String(key)}`);
  return value;
}

function responseExpectation(
  mediaType: string,
  decoder: OpenApiResponseDecoder,
  bodyFamily: OpenApiResponseBodyFamily,
): OpenApiResponseMediaBranch {
  const key = responseMediaBranchKey("fixture", "GET", "/swap", "swap", 200, mediaType);
  return {
    key,
    pointer: "#/fixture",
    operationKey: "paths:get:/swap",
    operationId: "swap",
    method: "GET",
    path: "/swap",
    status: 200,
    mediaType,
    expectedDecoder: decoder,
    expectedBodyFamily: bodyFamily,
    policy: "fixture",
  };
}

function responseActual(
  mediaType: string,
  decoder: OpenApiResponseDecoder,
  bodyFamily: OpenApiResponseBodyFamily,
): GeneratedResponseMediaBranch {
  return {
    key: responseMediaBranchKey("fixture", "GET", "/swap", "swap", 200, mediaType),
    decoder,
    bodyFamily,
  };
}

function sumBaseline(
  field:
    | "requestMediaBranches"
    | "responseHeaderUses"
    | "responseMediaBranches"
    | "securityRequirements",
): number {
  return Object.values(auditBaseline).reduce(
    (count, audit) => count + audit.summary[field],
    0,
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(action: () => unknown, message: string): void {
  try {
    action();
  } catch {
    return;
  }
  throw new Error(message);
}

type IsExactly<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true
  : false;

type DocumentedAtStatus<TResponse, TStatus extends number> = TResponse extends {
  documented: true;
  status: infer TRange extends number;
} ? TStatus extends TRange ? TResponse : never
  : never;

function assertType<TExpected>(_value: TExpected): void {
  // Compile-time assertion only.
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
