import { allocateNames, toIdentifier } from "./naming.ts";

Deno.test("operation identifiers are readable and source-safe", () => {
  assertEquals(toIdentifier("repos/get-content", "camel"), "reposGetContent");
  assertEquals(
    toIdentifier("Repositories_Get Deleted Repositories", "camel"),
    "repositoriesGetDeletedRepositories",
  );
  assertEquals(toIdentifier("123-status", "pascal"), "N123Status");
});

Deno.test("name allocation is deterministic and collision-safe", () => {
  const requests = [
    { key: "first", preferred: "foo-bar" },
    { key: "second", preferred: "foo_bar" },
    { key: "third", preferred: "normal" },
  ];
  const forward = allocateNames(requests, "camel");
  const reverse = allocateNames(requests.toReversed(), "camel");

  assertEquals([...forward], [...reverse]);
  assert(
    forward.get("first") !== forward.get("second"),
    "colliding names must receive stable suffixes",
  );
  assertEquals(forward.get("third"), "normal");
});

Deno.test("locked public names survive newly introduced collisions", () => {
  const original = allocateNames([{ key: "old", preferred: "get-item" }], "camel");
  const evolved = allocateNames(
    [
      { key: "new", preferred: "get_item" },
      { key: "old", preferred: "get-item" },
    ],
    "camel",
    new Set(),
    96,
    original,
  );

  assertEquals(evolved.get("old"), "getItem");
  assert(evolved.get("new") !== "getItem", "new collision must not rename locked API");
});

Deno.test("reviewed locked names can grandfather newly reserved globals", () => {
  const names = allocateNames(
    [
      { key: "legacy", preferred: "Error" },
      { key: "future", preferred: "Error" },
    ],
    "pascal",
    new Set(["Error"]),
    96,
    new Map([["legacy", "Error"]]),
  );

  assertEquals(names.get("legacy"), "Error");
  assert(names.get("future") !== "Error", "new name reused grandfathered global");
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
