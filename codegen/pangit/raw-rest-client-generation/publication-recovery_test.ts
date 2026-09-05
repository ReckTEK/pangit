import { generatedComment } from "../../generated-notices.ts";
import {
  publishGeneratedClientOutput,
  withGeneratedOwnershipMarkers,
} from "./publish-generated-rest-clients.ts";

function snapshot(value: string) {
  const notice = generatedComment("//");
  const sources = new Map([
    ["mod.ts", `${notice}export * from "./client-options.ts";\n`],
    ["runtime/mod.ts", `${notice}export * from "./rest-client.ts";\n`],
    ["runtime/rest-client.ts", `export const snapshot = ${JSON.stringify(value)};\n`],
    ["fixture/v1/mod.ts", `${notice}export * from "./FixtureRestClient.ts";\n`],
    ["fixture/v1/FixtureRestClient.ts", `export const snapshot = ${JSON.stringify(value)};\n`],
  ]);
  for (
    const file of [
      "client-options",
      "create-rest-client",
      "git-host",
      "rest-client-type-map",
      "supported-versions",
    ]
  ) {
    sources.set(`${file}.ts`, `export const snapshot = ${JSON.stringify(value)};\n`);
  }
  return withGeneratedOwnershipMarkers(sources);
}

Deno.test("failed publication rollback retains original files and a recovery map", async () => {
  const directory = await Deno.makeTempDir({ prefix: "pangit-publication-recovery-" });
  const root = new URL(`file://${directory}/`);
  const output = new URL("generated/", root);
  const failure = new Error("injected publication failure");
  try {
    await publishGeneratedClientOutput(output, snapshot("previous"), {
      validate: () => Promise.resolve(),
    });
    let caught: unknown;
    try {
      await publishGeneratedClientOutput(output, snapshot("next"), {
        validate: () => Promise.resolve(),
        async afterOutputSwap() {
          // Simulate another process replacing the provider directory during publication.
          await Deno.remove(new URL("fixture/", output), { recursive: true });
          await Deno.writeTextFile(new URL("fixture", output), "blocks restoration");
          throw failure;
        },
      });
    } catch (error) {
      caught = error;
    }
    const transactions: string[] = [];
    for await (const entry of Deno.readDir(root)) {
      if (entry.name.startsWith(".pangit-codegen-transaction-")) transactions.push(entry.name);
    }
    if (transactions.length !== 1) throw new Error("Failed rollback discarded the recovery files");
    const transaction = new URL(`${transactions[0]}/`, root);
    if (
      !(caught instanceof AggregateError) || !caught.errors.includes(failure) ||
      !caught.message.includes(transaction.pathname)
    ) {
      throw new Error("Failed rollback omitted its cause or recovery location");
    }
    const recovery: { original: string; backup: string }[] = JSON.parse(
      await Deno.readTextFile(new URL("recovery.json", transaction)),
    );
    const retained = recovery.find((target) =>
      target.original === new URL("fixture/v1/", output).href
    );
    if (!retained) throw new Error("Recovery map omitted the failed target");
    const source = await Deno.readTextFile(new URL("FixtureRestClient.ts", `${retained.backup}/`));
    if (source !== snapshot("previous").get("fixture/v1/FixtureRestClient.ts")) {
      throw new Error("Recovery backup did not preserve the original client");
    }
    // Failure restoring one provider must not prevent restoration of unrelated targets.
    if (
      await Deno.readTextFile(new URL("client-options.ts", output)) !==
        snapshot("previous").get("client-options.ts")
    ) {
      throw new Error("Rollback stopped before restoring the root registry");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("rollback reports a missing original backup and preserves the installed replacement", async () => {
  const directory = await Deno.makeTempDir({ prefix: "pangit-publication-missing-backup-" });
  const root = new URL(`file://${directory}/`);
  const output = new URL("generated/", root);
  const failure = new Error("injected publication failure");
  let transaction: URL | undefined;
  try {
    await publishGeneratedClientOutput(output, snapshot("previous"), {
      validate: () => Promise.resolve(),
    });
    let caught: unknown;
    try {
      await publishGeneratedClientOutput(output, snapshot("next"), {
        validate: () => Promise.resolve(),
        async afterOutputSwap() {
          for await (const entry of Deno.readDir(root)) {
            if (entry.name.startsWith(".pangit-codegen-transaction-")) {
              transaction = new URL(`${entry.name}/`, root);
            }
          }
          if (!transaction) throw new Error("Missing transaction");
          const recovery: { original: string; backup: string }[] = JSON.parse(
            await Deno.readTextFile(new URL("recovery.json", transaction)),
          );
          const target = recovery.find((entry) =>
            entry.original === new URL("client-options.ts", output).href
          )!;
          await Deno.remove(new URL(target.backup));
          throw failure;
        },
      });
    } catch (error) {
      caught = error;
    }
    if (!(caught instanceof AggregateError) || !caught.errors.includes(failure)) {
      throw new Error("Missing original was silently treated as restored");
    }
    if (
      await Deno.readTextFile(new URL("client-options.ts", output)) !==
        snapshot("next").get("client-options.ts")
    ) {
      throw new Error("Rollback destroyed the only remaining copy of a target");
    }
    await Deno.stat(new URL("recovery.json", transaction));
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
