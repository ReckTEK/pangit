import { aggregateContributors } from "./contributor-aggregation.ts";

Deno.test("contributors group Git author identities consistently and skip missing identities", () => {
  const result = aggregateContributors([
    { author: { name: "Alice", email: "ALICE@example.test" } },
    { author: { name: "Alice Renamed", email: "alice@example.test" } },
    { author: { name: "Alice", email: "another@example.test" } },
    { author: { name: "Name only" } },
    { author: { name: "Name only" } },
    {},
    { author: {} },
  ]);
  const expected = [
    { name: "Alice", email: "ALICE@example.test", commits: 2 },
    { name: "Alice", email: "another@example.test", commits: 1 },
    { name: "Name only", commits: 2 },
  ];
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error("Incorrect author aggregation");
  }
  if (!Object.isFrozen(result) || !result.every(Object.isFrozen)) {
    throw new Error("Mutable contributor result");
  }
});
