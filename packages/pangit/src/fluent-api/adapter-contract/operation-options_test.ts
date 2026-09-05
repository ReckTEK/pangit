import { ValidationError } from "./errors.ts";
import { requireIdentity, requirePositiveInteger } from "./operation-options.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: ${String(actual)} != ${String(expected)}`);
}

Deno.test("operation option validators use the stable fluent validation taxonomy", () => {
  for (
    const execute of [
      () => requireIdentity(" \t", "repository name"),
      () => requirePositiveInteger(0, "page limit"),
    ]
  ) {
    let rejected: unknown;
    try {
      execute();
    } catch (error) {
      rejected = error;
    }
    assert(rejected instanceof ValidationError, "invalid input leaked a built-in error type");
    assert(rejected.operation.startsWith("validate"), "local validation operation was not stable");
    assertEquals(rejected.provider, undefined, "pre-provider validation invented a provider");
    assertEquals(rejected.version, undefined, "pre-provider validation invented a version");
  }
});

Deno.test("operation option validators preserve supplied provider and operation detail", () => {
  let rejected: unknown;
  try {
    requireIdentity("", "branch name", {
      provider: "test-provider",
      version: "1.0",
      operation: "getBranch",
    });
  } catch (error) {
    rejected = error;
  }
  assert(rejected instanceof ValidationError, "invalid identity did not use ValidationError");
  assertEquals(rejected.provider, "test-provider", "provider detail changed");
  assertEquals(rejected.version, "1.0", "version detail changed");
  assertEquals(rejected.operation, "getBranch", "universal operation identity changed");
});
