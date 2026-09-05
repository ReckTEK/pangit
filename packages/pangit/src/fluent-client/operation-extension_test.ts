import { giteaExtensions } from "../fluent-providers/gitea/extensions/runtime.ts";
import { createOperationExtension } from "../fluent-api/provider-extensions/OperationExtension.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("operation extensions expose only the selected provider and configure once", async () => {
  let callbacks = 0;
  let received: Readonly<{ contentVersion: number | bigint }> | undefined;
  const signal = new AbortController().signal;
  const operation = createOperationExtension<
    "issues.update",
    "gitea",
    "1.27.2",
    string
  >({
    operation: "issues.update",
    support: giteaExtensions["issues.update"],
    provider: "gitea",
    version: "1.27.2",
    context: { issueNumber: 7 },
    execute(extension, options) {
      received = extension;
      assert(options.signal === signal, "operation signal was not forwarded");
      return Promise.resolve("updated");
    },
  });
  const executable = operation.gitea((context) => {
    callbacks++;
    assert(Object.isFrozen(context), "extension callback context was mutable");
    assertEquals(context, { issueNumber: 7 }, "extension context changed");
    return { contentVersion: 3 };
  });
  assertEquals(await executable.execute({ signal }), "updated", "extension result changed");
  assertEquals(callbacks, 1, "extension callback count changed");
  assertEquals(received, { contentVersion: 3 }, "extension options were not forwarded");
  assert(Object.isFrozen(received), "extension options were mutable");
  assert(!("gitea" in executable), "configured operation still exposed an extension method");

  let rejected = false;
  try {
    operation.gitea(() => ({ contentVersion: 4 }));
  } catch (error) {
    rejected = error instanceof TypeError;
  }
  assert(rejected, "the same extension builder configured twice");
});

Deno.test("version-restricted extensions are absent at runtime on unsupported versions", async () => {
  const input = {
    operation: "commits.compare" as const,
    support: giteaExtensions["commits.compare"],
    provider: "gitea" as const,
    context: { repositoryFullName: "owner/repository", base: "main", head: "feature" },
    execute: () => Promise.resolve("common comparison"),
  };
  const legacy = createOperationExtension<"commits.compare", "gitea", "1.26.4", string>({
    ...input,
    version: "1.26.4",
  });
  assert(!("gitea" in legacy), "Gitea 1.26.4 exposed the 1.27.2-only compare extension");
  assertEquals(await legacy.execute(), "common comparison", "common comparison was unavailable");

  const current = createOperationExtension<"commits.compare", "gitea", "1.27.2", string>({
    ...input,
    version: "1.27.2",
  });
  assert("gitea" in current, "Gitea 1.27.2 omitted its compare extension");
});
