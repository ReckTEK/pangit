import { createPage, resolvePageRequest } from "./pagination.ts";
import { ValidationError } from "./errors.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("page requests validate caller bounds before provider work", () => {
  assertEquals(resolvePageRequest(), { limit: 50 }, "default page request changed");
  assertEquals(
    resolvePageRequest({ limit: 17, cursor: "opaque" }),
    { limit: 17, cursor: "opaque" },
    "explicit page request changed",
  );
  for (const limit of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    let rejected = false;
    try {
      resolvePageRequest({ limit });
    } catch (error) {
      rejected = error instanceof ValidationError &&
        error.operation === "validatePageRequest";
    }
    assert(rejected, `Invalid page limit was accepted: ${limit}`);
  }
});

Deno.test("page request validation preserves public operation context", () => {
  let caught: unknown;
  try {
    resolvePageRequest({ limit: 0 }, 50, {
      provider: "test-provider",
      version: "1.0",
      operation: "listBranches",
    });
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof ValidationError, "invalid page did not use ValidationError");
  assertEquals(caught.provider, "test-provider", "page validation lost provider context");
  assertEquals(caught.version, "1.0", "page validation lost version context");
  assertEquals(caught.operation, "listBranches", "page validation lost operation context");
});

Deno.test("page results are immutable snapshots", () => {
  const input = [{ id: 1 }];
  const page = createPage(input, { nextCursor: "next", totalCount: 2 });
  input.push({ id: 2 });
  assertEquals(page.items, [{ id: 1 }], "page retained a mutable input array");
  assert(Object.isFrozen(page), "page object is mutable");
  assert(Object.isFrozen(page.items), "page item array is mutable");
});
