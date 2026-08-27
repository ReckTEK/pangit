import { auditOpenApiDocument, type OpenApiDiagnosticEntry } from "./audit.ts";
import { parseOpenApiDocument } from "./openapi.ts";

Deno.test("audit semantics retain exact unsupported and lossy use sites", () => {
  const document = parseOpenApiDocument(
    JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Audit fixture", version: "1" },
      servers: [{ url: "https://{region}.example.test", variables: { region: {} } }],
      security: [{ bearer: [] }],
      paths: {
        "/items/{id}/*wild": {
          post: {
            parameters: [
              { in: "query", name: "filter", style: "deepObject", schema: {} },
              { in: "query", name: "wild", schema: { type: "string" } },
              { in: "query", name: "raw", allowReserved: true, schema: {} },
              { in: "cookie", name: "session", schema: {} },
            ],
            security: [{ bearer: [] }, { token: [] }],
            servers: [{ url: "https://{stage}.example.test", variables: { stage: {} } }],
            requestBody: {
              content: {
                "multipart/form-data": { schema: {}, encoding: { file: {} } },
                "application/json": {},
                "application/x-www-form-urlencoded": { schema: { type: "object" } },
                "text/plain": { schema: { type: "object", properties: { value: {} } } },
                "application/octet-stream": { schema: { type: "string", format: "binary" } },
                "application/vnd.github.object": {
                  schema: { $ref: "#/components/schemas/TextPayload" },
                },
              },
            },
            callbacks: { completed: {} },
            responses: {
              "200": { $ref: "#/components/responses/Success" },
              "404": { description: "missing" },
              "4XX": {
                description: "wildcard",
                content: { "application/json": { schema: {} } },
              },
              default: {
                description: "default JSON",
                content: { "application/json": {} },
              },
            },
          },
        },
        "/trace": {
          trace: { responses: { "204": { description: "ok" } } },
        },
      },
      components: {
        headers: { Trace: { schema: { type: "string" } } },
        responses: {
          Success: {
            description: "ok",
            headers: { "x-trace": { $ref: "#/components/headers/Trace" } },
            content: {
              "application/json": { schema: {} },
              "text/plain": { schema: { type: "string" } },
              "application/octocat-stream": {
                schema: { $ref: "#/components/schemas/TextPayload" },
              },
              "application/zip": { schema: { type: "string", format: "binary" } },
              "application/vnd.github.object": { schema: { type: "object" } },
            },
          },
        },
        schemas: {
          TextPayload: { type: "string" },
          Conditional: {
            type: "object",
            properties: {
              counter: { type: "integer", format: "int64" },
              value: true,
            },
            oneOf: [
              { properties: { kind: { const: "ready" } }, required: ["value"] },
              { const: "short-circuit", required: ["counter"] },
            ],
          },
          MalformedArray: {
            type: "array",
            items: { type: "string" },
            required: ["not-an-array-property"],
          },
          External: { $ref: "https://schemas.example.test/external.json" },
        },
      },
    }),
    "audit-fixture",
  );

  const audit = auditOpenApiDocument(document, "fixture");
  assertEquals(audit.summary, {
    operations: 1,
    traceOperationUses: 1,
    missingOperationIds: 1,
    synthesizedPathParameters: 2,
    requestMediaBranches: 6,
    requestJsonMediaBranches: 1,
    requestFormMediaBranches: 2,
    requestTextMediaBranches: 1,
    requestBinaryMediaBranches: 2,
    fetchForbiddenRequestBodies: 0,
    responseMediaBranches: 7,
    responseJsonDecoderBranches: 4,
    responseTextDecoderBranches: 2,
    responseBinaryDecoderBranches: 1,
    defaultNoContentResponseBranches: 2,
    missingMediaSchemas: 2,
    requestMediaSchemaConflicts: 1,
    optionalPathGroups: 0,
    literalOptionalPathGroups: 0,
    non2xxResponses: 1,
    non2xxResponsesMissingBodies: 1,
    responseHeaderUses: 1,
    securityRequirements: 2,
    conditionalOuterPropertyRequiredLosses: 1,
    malformedRequiredNonObjectUses: 1,
    int64SchemaOccurrences: 1,
    cookieParameterUses: 1,
    deepObjectParameterUses: 1,
    allowReservedParameterUses: 1,
    wildcardStatuses: 1,
    requestEncodingUses: 1,
    callbackUses: 1,
    serverVariableDeclarations: 2,
    externalReferenceUses: 1,
  });

  const operationPointer = "#/paths/~1items~1{id}~1*wild/post";
  const expectedDiagnostics: OpenApiDiagnosticEntry[] = [
    [
      "fixture",
      `${operationPointer}/operationId`,
      "missing-operation-id",
      "synthesize-stable-operation-name",
    ],
    [
      "fixture",
      `${operationPointer}/parameters/$synthesized/id`,
      "synthesized-path-parameter",
      "synthesize-required-string",
    ],
    [
      "fixture",
      `${operationPointer}/parameters/$synthesized/wild`,
      "synthesized-path-parameter",
      "synthesize-required-string",
    ],
    [
      "fixture",
      `${operationPointer}/parameters/2/allowReserved`,
      "allow-reserved-parameter",
      "reject-unsupported-query-serialization",
    ],
    [
      "fixture",
      `${operationPointer}/parameters/3`,
      "cookie-parameter",
      "reject-unsupported-parameter-location",
    ],
    [
      "fixture",
      `${operationPointer}/callbacks/completed`,
      "callback",
      "reject-unsupported-callback",
    ],
    [
      "fixture",
      `${operationPointer}/requestBody/content/multipart~1form-data/encoding`,
      "request-encoding",
      "reject-unsupported-request-encoding",
    ],
    [
      "fixture",
      `${operationPointer}/requestBody/content/application~1json/schema`,
      "missing-media-schema",
      "emit-strict-json-data",
    ],
    [
      "fixture",
      `${operationPointer}/requestBody/content/text~1plain/schema`,
      "request-media-schema-conflict",
      "honor-wire-text-discard-object-schema",
    ],
    [
      "fixture",
      `${operationPointer}/responses/404/content`,
      "non-2xx-response-without-body",
      "preserve-undefined-body",
    ],
    [
      "fixture",
      `${operationPointer}/responses/4XX`,
      "wildcard-response-status",
      "reject-unsupported-wildcard-status",
    ],
    [
      "fixture",
      `${operationPointer}/responses/default/content/application~1json/schema`,
      "missing-media-schema",
      "emit-strict-json-data",
    ],
    ["fixture", "#/paths/~1trace/trace", "trace-operation", "reject-unsupported-http-method"],
    [
      "fixture",
      "#/components/schemas/Conditional/oneOf/1/required/0",
      "conditional-required-loss",
      "reject-unpreserved-required-field",
    ],
    [
      "fixture",
      "#/components/schemas/MalformedArray/required",
      "malformed-required-non-object",
      "preserve-upstream-schema-diagnostic",
    ],
    [
      "fixture",
      "#/components/schemas/External/$ref",
      "external-reference",
      "reject-external-reference",
    ],
    [
      "fixture",
      "#/servers/0/variables/region",
      "server-variable",
      "require-explicit-server-substitution",
    ],
    [
      "fixture",
      `${operationPointer}/servers/0/variables/stage`,
      "server-variable",
      "require-explicit-server-substitution",
    ],
  ];
  assertEquals(audit.diagnostics, expectedDiagnostics.toSorted(compareDiagnostics));
  assertEquals(audit.requestMedia.length, audit.summary.requestMediaBranches);
  assertEquals(audit.responseMedia.length, audit.summary.responseMediaBranches);
  assertEquals(
    audit.defaultNoContentResponses.map((branch) => [branch.status, branch.expectedBodyFamily]),
    [[204, "undefined"], [205, "undefined"]],
  );

  const requestProviderObject = audit.requestMedia.find((branch) =>
    branch.mediaType === "application/vnd.github.object"
  );
  assertEquals(requestProviderObject?.expectedBodyFamily, "binary");
  const responseProviderObject = audit.responseMedia.find((branch) =>
    branch.mediaType === "application/vnd.github.object"
  );
  assertEquals(
    [responseProviderObject?.expectedDecoder, responseProviderObject?.expectedBodyFamily],
    ["json", "json"],
  );
  const schemaText = audit.responseMedia.find((branch) =>
    branch.mediaType === "application/octocat-stream"
  );
  assertEquals([schemaText?.expectedDecoder, schemaText?.expectedBodyFamily], ["text", "string"]);
});

Deno.test("audit preserves exact GET and HEAD body limitations", () => {
  const document = parseOpenApiDocument(
    JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Fetch body fixture", version: "1" },
      paths: {
        "/get": {
          get: {
            operationId: "getWithBody",
            requestBody: { content: { "application/json": { schema: { type: "object" } } } },
            responses: { "204": { description: "none" } },
          },
        },
        "/head": {
          head: {
            operationId: "headWithBody",
            requestBody: {
              content: {
                "application/octet-stream": { schema: { type: "string", format: "binary" } },
              },
            },
            responses: { "204": { description: "none" } },
          },
        },
      },
      components: { schemas: {} },
    }),
    "fetch-body-fixture",
  );

  const audit = auditOpenApiDocument(document, "fixture");
  assertEquals(audit.summary.fetchForbiddenRequestBodies, 2);
  assertEquals(
    audit.diagnostics.filter((entry) => entry[2] === "fetch-forbidden-request-body"),
    [
      [
        "fixture",
        "#/paths/~1get/get/requestBody",
        "fetch-forbidden-request-body",
        "preserve-provider-contract-document-native-fetch-limitation",
      ],
      [
        "fixture",
        "#/paths/~1head/head/requestBody",
        "fetch-forbidden-request-body",
        "preserve-provider-contract-document-native-fetch-limitation",
      ],
    ],
  );
});

Deno.test("audit records exact optional path-group policies without treating escaped literals as groups", () => {
  const document = parseOpenApiDocument(
    JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Path group fixture", version: "1" },
      paths: {
        "/projects/{id}/(-/)search": {
          get: {
            operationId: "search",
            responses: { "204": { description: "none" } },
          },
        },
        "/releases/latest(/)(*suffix)": {
          get: {
            operationId: "release",
            parameters: [{ in: "query", name: "suffix", schema: { type: "string" } }],
            responses: { "204": { description: "none" } },
          },
        },
        "/odata/Packages\\(Id='{id}'\\)": {
          get: {
            operationId: "odata",
            responses: { "204": { description: "none" } },
          },
        },
      },
      components: { schemas: {} },
    }),
    "path-group-fixture",
  );

  const audit = auditOpenApiDocument(document, "fixture");
  assertEquals(audit.summary.optionalPathGroups, 3);
  assertEquals(audit.summary.literalOptionalPathGroups, 2);
  assertEquals(
    audit.diagnostics.filter((entry) => entry[2].includes("optional-path-group")),
    [
      [
        "fixture",
        "#/paths/~1projects~1{id}~1(-~1)search/get/$optionalPathGroups/0",
        "literal-optional-path-group",
        "expose-typed-include-selector-default-true",
      ],
      [
        "fixture",
        "#/paths/~1releases~1latest(~1)(*suffix)/get/$optionalPathGroups/0",
        "literal-optional-path-group",
        "bind-literal-group-to-adjacent-parameters",
      ],
      [
        "fixture",
        "#/paths/~1releases~1latest(~1)(*suffix)/get/$optionalPathGroups/1",
        "parameterized-optional-path-group",
        "emit-all-or-none-optional-path-group",
      ],
    ],
  );
});

function compareDiagnostics(
  left: OpenApiDiagnosticEntry,
  right: OpenApiDiagnosticEntry,
): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
