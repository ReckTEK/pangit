import type {
  JsonRecord,
  RawRestClientTestCases,
  RawRestClientTestStep,
} from "../../../../tests/e2e/hand-written/raw-rest-client-test-cases/raw-rest-client-test-case-types.ts";
import type { OpenAPIOperation, RestClientOperation } from "./read-generated-client-operations.ts";

/** Validate declarative cases, fill path defaults, and prove every generated operation is covered. */
export function validateHandWrittenTestCases(
  gitHost: string,
  version: string,
  cases: RawRestClientTestCases,
  operations: readonly RestClientOperation[],
  openAPIOperations: ReadonlyMap<string, OpenAPIOperation>,
): Pick<RawRestClientTestCases, "scenarios" | "negativeCases"> {
  const byId = new Map(operations.map((operation) => [operation.id, operation]));
  const covered = new Set<string>();
  const prepare = (step: RawRestClientTestStep): RawRestClientTestStep[] => {
    if (step.fixture) {
      if (!step.operationId.startsWith("$fixture/") || byId.has(step.operationId)) {
        throw new Error("Fixture requests must be explicitly separate from spec operations");
      }
      return [step];
    }
    if (!byId.has(step.operationId)) {
      if (step.optional) return [];
      throw new Error(`${gitHost} ${version}: unknown test operation ${step.operationId}`);
    }
    const input = structuredClone(step.input ?? {});
    const path = { ...(input.path as JsonRecord ?? {}) };
    for (const parameter of openAPIOperations.get(step.operationId)!.parameters) {
      if (parameter.in !== "path") continue;
      const name = parameter.name as string;
      if (!(name in path)) {
        if (!(name in cases.parameterDefaults)) {
          throw new Error(`${step.operationId}: no case value for path parameter ${name}`);
        }
        path[name] = cases.parameterDefaults[name];
      }
    }
    if (Object.keys(path).length) input.path = path;
    if (!step.expect.status.length) {
      throw new Error(`${step.operationId}: no explicit expected status`);
    }
    if (step.poll && byId.get(step.operationId)!.method.toUpperCase() !== "GET") {
      throw new Error(`${step.operationId}: polling is only permitted for read operations`);
    }
    covered.add(step.operationId);
    return [{ ...step, input }];
  };

  const scenarios = cases.scenarios.map((scenario) => ({
    ...scenario,
    steps: scenario.steps.flatMap(prepare),
  }));
  const negativeCases = cases.negativeCases.flatMap(prepare);
  const missing = operations.filter(({ id }) => !covered.has(id)).map(({ id }) => id);
  if (missing.length) {
    throw new Error(
      `${gitHost} ${version}: missing real raw REST-client E2E cases (${missing.length}): ${
        missing.join(", ")
      }`,
    );
  }
  return { scenarios, negativeCases };
}
