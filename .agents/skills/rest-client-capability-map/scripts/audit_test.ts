import { audit, type Comparison, type Ledger, type Task } from "./audit.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}

function setComposite(comparison: Comparison) {
  comparison.status = "composite";
  const ids = comparison.operationIds.length === 1
    ? [comparison.operationIds[0], comparison.operationIds[0]]
    : comparison.operationIds;
  comparison.steps = ids.map((operationId, i) => ({
    operationId,
    description: `Execute native operation for step ${i + 1}.`,
  }));
}

function fixture(versions: [string, string, number][] = [
  ["gitea", "1", 1],
  ["github", "1", 1],
  ["gitlab", "1", 1],
]) {
  const clients = versions.map(([provider, version, operationCount]) => ({
    id: `${provider}@${version}`,
    provider,
    version,
    operationCount,
    selected: true,
  }));
  const inventory = {
    schemaVersion: 1,
    sourceFingerprint: "sha256:fixture",
    providers: [...new Set(clients.map((client) => client.provider))].map((id) => ({
      id,
      displayName: id,
      selected: clients.find((client) => client.provider === id)!.version,
    })),
    clients,
    operations: clients.flatMap((client) =>
      Array.from({ length: client.operationCount }, (_, i) => {
        const operationKey = `paths:get:/tasks/${i}`;
        return {
          id: `${client.id}::${operationKey}`,
          clientId: client.id,
          provider: client.provider,
          version: client.version,
          operationKey,
          methodName: `nativeRead${i}`,
        };
      })
    ),
  };
  const task = (id: string, bucket: Task["bucket"], matches = clients.map((c) => c.id)): Task => ({
    id,
    title: "Read task information",
    domain: "tasks",
    intent: "Read the task identified by its native ID",
    bucket,
    comparisons: clients.map((client): Comparison => {
      const supported = matches.includes(client.id);
      return {
        clientId: client.id,
        status: supported ? "direct" : "absent",
        operationIds: supported
          ? inventory.operations.filter((op) => op.clientId === client.id).map((op) => op.id)
          : [],
        description: supported
          ? "Read the native task record."
          : "No equivalent task in this client.",
        inputMapping: supported ? "Task ID maps to the native path parameter." : "Not applicable.",
        outputMapping: supported
          ? "Native task fields supply the described result."
          : "Not applicable.",
        constraints: "None documented in this fixture.",
        evidence: [{
          source: `${client.id}.json`,
          locator: "#/paths",
          note: "Reviewed task operations.",
        }],
        ...(supported ? {} : {
          search: {
            terms: ["task", "read"],
            candidateOperationIds: [],
            reason: "Inspected all task operations; no equivalent outcome in this fixture.",
          },
        }),
      };
    }),
  });
  const ledger: Ledger = {
    schemaVersion: 1,
    sourceFingerprint: inventory.sourceFingerprint,
    tasks: [task("read", "shared")],
    operationReviews: [],
  };
  const syncReviews = () => {
    ledger.operationReviews = inventory.operations.map((op) => ({
      operationId: op.id,
      reviewed: true,
      residualReview:
        "Reviewed parameters, responses, and modes; no residual behavior in this fixture.",
      taskIds: ledger.tasks.filter((task) =>
        task.comparisons.some((comparison) =>
          (comparison.status === "direct" || comparison.status === "composite") &&
          comparison.operationIds.includes(op.id)
        )
      ).map((task) => task.id),
    }));
  };
  syncReviews();
  return { inventory, ledger, task, syncReviews };
}

Deno.test("audit closes a common task across every provider", () => {
  const { inventory, ledger } = fixture();
  const result = audit(inventory, ledger);
  assert(result.finalReady, JSON.stringify(result));
  assert(result.operations.reviewed === 3 && result.operations.shared_only === 3);
  assert(result.decisions.done === 3 && result.decisions.expected === 3);
  assert(result.caveat.includes("Structural closure only"));
});

Deno.test("draft preserves pending unknown comparisons and omitted operation reviews", () => {
  const { inventory, ledger } = fixture();
  ledger.tasks[0].comparisons[0].status = "unknown";
  ledger.operationReviews.shift();
  const result = audit(inventory, ledger, { draft: true });
  assert(result.valid && !result.finalReady && result.draft, JSON.stringify(result));
  assert(result.pending.some((issue) => issue.includes("comparison is unknown")));
  assert(result.operations.reviewed === 2 && result.operations.unreviewed === 1);
  assert(result.decisions.done === 2);
});

Deno.test("missing reviews or comparisons cannot pass the final gate", () => {
  const { inventory, ledger } = fixture();
  ledger.operationReviews.pop();
  assert(!audit(inventory, ledger).finalReady);
  ledger.tasks[0].comparisons.pop();
  const result = audit(inventory, ledger, { draft: true });
  assert(result.valid && !result.finalReady, JSON.stringify(result));
  assert(result.pending.some((issue) => issue.includes("missing comparison")));
});

Deno.test("other-provider subset tasks must compare back to Gitea", () => {
  const { inventory, ledger, task, syncReviews } = fixture();
  ledger.tasks.push(task("subset", "extension", ["github@1", "gitlab@1"]));
  syncReviews();
  let result = audit(inventory, ledger);
  assert(result.finalReady && result.tasks.shared_subset === 1, JSON.stringify(result));
  assert(result.operations.shared_only === 1 && result.operations.mixed === 2);
  ledger.tasks[1].comparisons.shift();
  result = audit(inventory, ledger);
  assert(!result.finalReady && result.pending.some((issue) => issue.includes("gitea@1")));
});

Deno.test("two client versions still count as one provider for provider-only tasks", () => {
  const { inventory, ledger, task, syncReviews } = fixture([
    ["gitea", "1", 1],
    ["gitea", "2", 1],
    ["github", "1", 1],
  ]);
  ledger.tasks.push(task("only", "extension", ["gitea@1", "gitea@2"]));
  syncReviews();
  const result = audit(inventory, ledger);
  assert(result.finalReady && result.tasks.provider_only === 1, JSON.stringify(result));
  assert(result.tasks.shared_subset === 0 && result.providers === 2 && result.clients === 3);
});

Deno.test("coverage in every provider but not every version is version-limited", () => {
  const { inventory, ledger, task, syncReviews } = fixture([
    ["gitea", "1", 1],
    ["gitea", "2", 1],
    ["github", "1", 1],
  ]);
  ledger.tasks.push(task("newer", "extension", ["gitea@2", "github@1"]));
  syncReviews();
  const result = audit(inventory, ledger);
  assert(result.finalReady && result.tasks.version_limited === 1, JSON.stringify(result));
});

Deno.test("many-to-many composite mappings count operations once and require residual review", () => {
  const { inventory, ledger, task, syncReviews } = fixture([
    ["gitea", "1", 2],
    ["github", "1", 2],
  ]);
  ledger.tasks[0].comparisons.forEach(setComposite);
  ledger.tasks.push(task("residual", "extension", ["gitea@1"]));
  syncReviews();
  let result = audit(inventory, ledger);
  assert(result.finalReady && result.operations.total === 4 && result.operations.mixed === 2);
  ledger.operationReviews[0].residualReview = "";
  result = audit(inventory, ledger);
  assert(!result.valid && result.errors.some((issue) => issue.includes("residualReview")));
});

Deno.test("composite can invoke the same endpoint repeatedly without duplicating membership", () => {
  const { inventory, ledger } = fixture();
  ledger.tasks[0].comparisons.forEach(setComposite);
  const result = audit(inventory, ledger);
  assert(result.finalReady && result.operations.total === 3, JSON.stringify(result));
  assert(result.operations.reviewed === 3 && result.operations.shared_only === 3);
});

Deno.test("composite rejects orphan endpoint members and noncanonical first-use order", () => {
  const { inventory, ledger } = fixture([["gitea", "1", 2], ["github", "1", 1]]);
  const comparison = ledger.tasks[0].comparisons[0];
  setComposite(comparison);
  comparison.steps![1].operationId = comparison.operationIds[0];
  let result = audit(inventory, ledger, { draft: true });
  assert(!result.valid && result.errors.some((issue) => issue.includes("step membership")));
  setComposite(comparison);
  comparison.operationIds.reverse();
  result = audit(inventory, ledger, { draft: true });
  assert(!result.valid && result.errors.some((issue) => issue.includes("order of first use")));
});

Deno.test("an operation may be extension-only without a universal capability", () => {
  const { inventory, ledger, task, syncReviews } = fixture();
  ledger.tasks = inventory.clients.map((client, i) => task(`only-${i}`, "extension", [client.id]));
  syncReviews();
  const result = audit(inventory, ledger);
  assert(result.finalReady && result.operations.extension_only === 3, JSON.stringify(result));
});

const invalidChanges: [string, (f: ReturnType<typeof fixture>) => void, string][] = [
  [
    "unknown method ID",
    ({ ledger }) => ledger.tasks[0].comparisons[0].operationIds = ["nativeRead0"],
    "unknown operation",
  ],
  [
    "wrong client's operation",
    ({ ledger, inventory }) =>
      ledger.tasks[0].comparisons[0].operationIds = [inventory.operations[1].id],
    "another client",
  ],
  [
    "unknown client",
    ({ ledger }) => ledger.tasks[0].comparisons[0].clientId = "bogus@1",
    "unknown client",
  ],
  ["stale fingerprint", ({ ledger }) => ledger.sourceFingerprint = "sha256:old", "stale inventory"],
  ["missing absence search", ({ ledger, task, syncReviews }) => {
    ledger.tasks.push(task("only", "extension", ["gitea@1"]));
    delete ledger.tasks[1].comparisons[1].search;
    syncReviews();
  }, ".search"],
  ["absence search from another client", ({ ledger, task, inventory, syncReviews }) => {
    ledger.tasks.push(task("only", "extension", ["gitea@1"]));
    ledger.tasks[1].comparisons[1].search!.candidateOperationIds = [inventory.operations[0].id];
    syncReviews();
  }, "another client"],
  ["conflicting shared bucket", ({ ledger, task, syncReviews }) => {
    ledger.tasks.push(task("false-common", "shared", ["gitea@1"]));
    syncReviews();
  }, "shared bucket conflicts"],
  [
    "conflicting extension bucket",
    ({ ledger }) => ledger.tasks[0].bucket = "extension",
    "extension requires",
  ],
  ["extension with no supporting client", ({ ledger, task, syncReviews }) => {
    ledger.tasks.push(task("unsupported", "extension", []));
    syncReviews();
  }, "extension requires"],
  [
    "composite without ordered steps",
    ({ ledger }) => ledger.tasks[0].comparisons[0].status = "composite",
    "two ordered steps",
  ],
  ["composite with only one step", ({ ledger }) => {
    const comparison = ledger.tasks[0].comparisons[0];
    setComposite(comparison);
    comparison.steps!.pop();
  }, "two ordered steps"],
  ["unknown composite step", ({ ledger }) => {
    const comparison = ledger.tasks[0].comparisons[0];
    setComposite(comparison);
    comparison.steps![1].operationId = "invented-step";
  }, "unknown operation"],
  ["foreign composite step", ({ ledger, inventory }) => {
    const comparison = ledger.tasks[0].comparisons[0];
    setComposite(comparison);
    comparison.steps![1].operationId = inventory.operations[1].id;
  }, "another client"],
  ["empty composite step description", ({ ledger }) => {
    const comparison = ledger.tasks[0].comparisons[0];
    setComposite(comparison);
    comparison.steps![1].description = "";
  }, ".steps[1].description"],
  ["steps on a direct comparison", ({ ledger }) => {
    const comparison = ledger.tasks[0].comparisons[0];
    setComposite(comparison);
    comparison.status = "direct";
  }, "only composite"],
  [
    "duplicate operation review",
    ({ ledger }) => ledger.operationReviews.push(ledger.operationReviews[0]),
    "duplicate operationId",
  ],
  [
    "duplicate comparison",
    ({ ledger }) => ledger.tasks[0].comparisons.push(ledger.tasks[0].comparisons[0]),
    "duplicate comparison",
  ],
  ["duplicate task", ({ ledger }) => ledger.tasks.push(ledger.tasks[0]), "duplicate id"],
  [
    "duplicate mapping",
    ({ ledger }) =>
      ledger.tasks[0].comparisons[0].operationIds.push(
        ledger.tasks[0].comparisons[0].operationIds[0],
      ),
    "duplicate entries",
  ],
  [
    "missing membership",
    ({ ledger }) => ledger.operationReviews[0].taskIds = [],
    "supported task memberships",
  ],
  [
    "invented review task",
    ({ ledger }) => ledger.operationReviews[0].taskIds.push("invented"),
    "unknown task",
  ],
  [
    "missing supported description",
    ({ ledger }) => ledger.tasks[0].comparisons[0].description = "",
    ".description",
  ],
  [
    "nonstring description",
    ({ ledger }) => Object.assign(ledger.tasks[0].comparisons[0], { description: 123 }),
    ".description",
  ],
  [
    "nonstring evidence source",
    ({ ledger }) => Object.assign(ledger.tasks[0].comparisons[0].evidence[0], { source: 123 }),
    ".evidence.source",
  ],
  [
    "object instead of operation ID array",
    ({ ledger }) => Object.assign(ledger.tasks[0].comparisons[0], { operationIds: { id: "read" } }),
    ".operationIds: expected array",
  ],
  [
    "nonboolean review flag",
    ({ ledger }) => Object.assign(ledger.operationReviews[0], { reviewed: "true" }),
    ".reviewed: expected boolean",
  ],
  [
    "missing evidence",
    ({ ledger }) => ledger.tasks[0].comparisons[0].evidence = [],
    "evidence is required",
  ],
  [
    "wrong inventory count",
    ({ inventory }) => inventory.clients[0].operationCount++,
    "disagrees with inventory",
  ],
  [
    "wrong inventory operation version",
    ({ inventory }) => inventory.operations[0].version = "wrong",
    "provider/version",
  ],
];
for (const [name, change, expected] of invalidChanges) {
  Deno.test(`audit rejects ${name}, including in draft`, () => {
    const f = fixture();
    change(f);
    const result = audit(f.inventory, f.ledger, { draft: true });
    assert(!result.valid && !result.finalReady, JSON.stringify(result));
    assert(result.errors.some((issue) => issue.includes(expected)), JSON.stringify(result.errors));
  });
}

for (const field of ["description", "inputMapping", "outputMapping", "constraints"] as const) {
  Deno.test(`audit rejects empty absent ${field}`, () => {
    const { inventory, ledger, task, syncReviews } = fixture();
    ledger.tasks.push(task("only", "extension", ["gitea@1"]));
    ledger.tasks[1].comparisons[1][field] = "";
    syncReviews();
    const result = audit(inventory, ledger, { draft: true });
    assert(!result.valid && result.errors.some((issue) => issue.includes(`.${field}`)));
  });
}

Deno.test("malformed JSON structures return diagnostics instead of throwing", () => {
  for (const bad of [null, [], "text", { schemaVersion: 1 }]) {
    const result = audit(bad, bad, { draft: true });
    assert(!result.valid && !result.finalReady && result.errors.length > 0);
  }
});

Deno.test("unreviewed records are pending and audit function preserves all diagnostics", () => {
  const { inventory, ledger } = fixture([["gitea", "1", 25], ["github", "1", 25]]);
  ledger.operationReviews.forEach((review) => {
    review.reviewed = false;
    review.residualReview = "";
  });
  const result = audit(inventory, ledger, { draft: true });
  assert(result.valid && !result.finalReady, JSON.stringify(result));
  assert(result.pending.length === 50 && result.operations.unreviewed === 50);
});
