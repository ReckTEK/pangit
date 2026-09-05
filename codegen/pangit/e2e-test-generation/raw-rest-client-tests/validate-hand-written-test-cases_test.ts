import { validateHandWrittenTestCases } from "./validate-hand-written-test-cases.ts";
import type { RawRestClientTestCases } from "../../../../tests/e2e/hand-written/raw-rest-client-test-cases/raw-rest-client-test-case-types.ts";

Deno.test("Raw GitLab wildcard paths are filled from the generated runtime even when absent from OpenAPI parameters", () => {
  const cases: RawRestClientTestCases = {
    schemaVersion: 1,
    variables: {},
    parameterDefaults: { package_name: "fixture/name" },
    scenarios: [],
    negativeCases: [{ operationId: "getPackage", expect: { status: [404] } }],
  };
  const result = validateHandWrittenTestCases("gitlab", "19.3.1", cases, [{
    id: "getPackage",
    method: "GET",
    methodName: "getPackage",
    path: "/packages/{package_name}",
    pathParameters: [{ name: "package_name", multiSegment: true }],
  }], new Map([["getPackage", { parameters: [], requestBody: {} }]]));
  if (
    JSON.stringify(result.negativeCases[0].input?.path) !==
      JSON.stringify({ package_name: "fixture/name" })
  ) throw new Error("Missing wildcard path default");
});

Deno.test("Version-specific raw expectations remain exact and cannot hide uncovered operations", () => {
  const cases: RawRestClientTestCases = {
    schemaVersion: 1,
    variables: {},
    parameterDefaults: {},
    scenarios: [],
    negativeCases: [
      { operationId: "probe", versions: ["18.11.11"], expect: { status: [403] } },
      { operationId: "probe", versions: ["19.3.1"], expect: { status: [401] } },
    ],
  };
  const operations = [{ id: "probe", methodName: "probe", method: "GET", path: "/probe" }];
  const schema = new Map([["probe", { parameters: [], requestBody: {} }]]);
  for (const [version, status] of [["18.11.11", 403], ["19.3.1", 401]] as const) {
    const result = validateHandWrittenTestCases("gitlab", version, cases, operations, schema);
    if (result.negativeCases.length !== 1 || result.negativeCases[0].expect.status[0] !== status) {
      throw new Error("Wrong version expectation selected");
    }
  }
  try {
    validateHandWrittenTestCases("gitlab", "20.0.0", cases, operations, schema);
  } catch (error) {
    if (error instanceof Error && error.message.includes("missing real raw")) return;
    throw error;
  }
  throw new Error("Filtering every case must fail coverage validation");
});
