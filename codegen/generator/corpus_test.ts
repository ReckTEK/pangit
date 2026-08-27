import { describeClientOperations, expectedRestClientProviders } from "./generate.ts";
import { parseOpenApiDocument } from "./openapi.ts";

type CorpusBaseline = {
  providers: Record<string, { operations: number }>;
  totalOperations: number;
};

const baseline = JSON.parse(
  await Deno.readTextFile(new URL("./corpus-baseline.json", import.meta.url)),
) as CorpusBaseline;

Deno.test("generated corpus preserves reviewed provider and operation inventory", async () => {
  assertEquals(Object.keys(baseline.providers).toSorted(), expectedRestClientProviders);
  let total = 0;

  for (const provider of expectedRestClientProviders) {
    const document = parseOpenApiDocument(
      await Deno.readTextFile(
        new URL(`../specs/normalized/${provider}.json`, import.meta.url),
      ),
      provider,
    );
    const operations = describeClientOperations(document);
    const expectedCount = baseline.providers[provider]?.operations;
    assertEquals(operations.length, expectedCount);
    total += operations.length;

    const source = await Deno.readTextFile(
      new URL(`../../src/generated/${provider}.ts`, import.meta.url),
    );
    assertEquals(count(source, " * @operationId "), expectedCount);

    for (const operation of operations) {
      const method = generatedMethod(source, operation.methodName);
      assert(
        [
          ...source.matchAll(
            new RegExp(`\\n    ${escapeRegExp(operation.methodName)}:\\s*\\{`, "g"),
          ),
        ].length === 1,
        `${provider}.${operation.methodName} does not have exactly one registry entry`,
      );
      assert(
        count(source, `export type ${method.inputType} =`) === 1,
        `${provider}.${operation.methodName} input type ${method.inputType} is not one-to-one`,
      );
      assert(
        count(source, `export type ${method.responseType} =`) === 1,
        `${provider}.${operation.methodName} response type ${method.responseType} is not one-to-one`,
      );
      assert(
        count(method.source, `.${operation.methodName}`) === 1,
        `${provider}.${operation.methodName} does not delegate exactly once`,
      );
    }
  }

  assertEquals(total, baseline.totalOperations);
});

function generatedMethod(
  source: string,
  name: string,
): { inputType: string; responseType: string; source: string } {
  const marker = `\n  ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `Missing generated method ${name}`);
  assert(source.indexOf(marker, start + marker.length) < 0, `Duplicate generated method ${name}`);
  const end = source.indexOf("\n  }", start);
  assert(end >= 0, `Unterminated generated method ${name}`);
  const method = source.slice(start, end + "\n  }".length);
  const inputType = /input:\s*([A-Za-z_$][\w$]*)/.exec(method)?.[1];
  const responseType = /\): Promise<\s*([A-Za-z_$][\w$]*)\s*>/.exec(method)?.[1];
  assert(inputType !== undefined, `Missing input type for ${name}`);
  assert(responseType !== undefined, `Missing response type for ${name}`);
  return { inputType, responseType, source: method };
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
