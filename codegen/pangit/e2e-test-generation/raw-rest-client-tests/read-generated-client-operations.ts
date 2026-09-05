import type { JsonRecord } from "../../../../tests/e2e/hand-written/raw-rest-client-test-cases/raw-rest-client-test-case-types.ts";

export type RestClientOperation = {
  id: string;
  method: string;
  path: string;
  methodName: string;
  pathParameters?: readonly { name: string; multiSegment?: boolean }[];
};

export type OpenAPIOperation = {
  parameters: JsonRecord[];
  requestBody: JsonRecord;
};

function resolve(document: JsonRecord, value: unknown): JsonRecord {
  const object = (value ?? {}) as JsonRecord;
  if (typeof object.$ref !== "string") return object;
  let target: unknown = document;
  for (const key of object.$ref.slice(2).split("/")) {
    target = (target as JsonRecord)[key.replaceAll("~1", "/").replaceAll("~0", "~")];
  }
  return resolve(document, target);
}

/** Match the generated client registry to its normalized OpenAPI operation model. */
export async function readGeneratedClientOperations(
  gitHost: string,
  version: string,
  document: JsonRecord,
  clientModule: URL,
  variablePrefix: string,
): Promise<{
  operations: RestClientOperation[];
  openAPIOperations: Map<string, OpenAPIOperation>;
}> {
  const client = await import(clientModule.href);
  const registry = client[`${variablePrefix}Operations`] as Record<
    string,
    { id: string; method: string; path: string }
  >;
  const operations = Object.entries(registry).map(([methodName, operation]) => ({
    ...operation,
    methodName,
  }));
  const openAPIOperations = new Map<string, OpenAPIOperation>();
  for (const item of Object.values(document.paths as JsonRecord) as JsonRecord[]) {
    for (const operation of Object.values(item) as JsonRecord[]) {
      if (typeof operation.operationId !== "string") continue;
      openAPIOperations.set(operation.operationId, {
        parameters: [
          ...(item.parameters as JsonRecord[] ?? []),
          ...(operation.parameters as JsonRecord[] ?? []),
        ].map((parameter) => resolve(document, parameter)),
        requestBody: resolve(document, operation.requestBody),
      });
    }
  }
  if (
    JSON.stringify(operations.map(({ id }) => id).toSorted()) !==
      JSON.stringify([...openAPIOperations.keys()].toSorted())
  ) {
    throw new Error(`${gitHost} ${version}: generated client and OpenAPI operations differ`);
  }
  return { operations, openAPIOperations };
}
