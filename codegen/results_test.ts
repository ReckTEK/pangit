import { cleanGeneratedArtifacts, rawResultDirectories } from "./results.ts";
import { replaceGeneratedDirectory } from "./generator/generate.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

async function fixture(run: (generated: URL) => Promise<void>): Promise<void> {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".results-test-" });
  const generated = new URL(`file://${Deno.cwd()}/${directory}/generated/`);
  try {
    for (const version of ["old", "current"]) {
      const folder = new URL(`provider/${version}/tests/results/coverage/`, generated);
      await Deno.mkdir(folder, { recursive: true });
      const file = new URL("index.html", folder);
      await Deno.writeTextFile(file, `raw ${version}`);
      await Deno.utime(file, new Date("2020-01-01Z"), new Date("2020-01-01Z"));
      await Deno.writeTextFile(new URL(`provider/${version}/client.ts`, generated), "old client");
      await Deno.writeTextFile(
        new URL(`provider/${version}/tests/stale.ts`, generated),
        "old test",
      );
    }
    await Deno.writeTextFile(new URL("stale.ts", generated), "stale root");
    await run(generated);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}

async function assertEvidence(generated: URL): Promise<void> {
  const reports = await rawResultDirectories(generated);
  assert(reports.length === 2, "Retired/current report directories were not both preserved");
  for (const { directory, version } of reports) {
    const file = new URL("coverage/index.html", directory);
    assert(await Deno.readTextFile(file) === `raw ${version}`, "Raw bytes changed");
    assert(
      (await Deno.stat(file)).mtime?.toISOString() === "2020-01-01T00:00:00.000Z",
      "Raw mtime changed",
    );
  }
}

async function assertMissing(file: URL): Promise<void> {
  try {
    await Deno.stat(file);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return;
    throw error;
  }
  throw new Error(`Stale artifact retained: ${file.pathname}`);
}

Deno.test("generation cleanup preserves current and retired raw results, and removes stale artifacts", async () => {
  await fixture(async (generated) => {
    await cleanGeneratedArtifacts(generated);
    await assertEvidence(generated);
    await assertMissing(new URL("stale.ts", generated));
    for (const version of ["old", "current"]) {
      await assertMissing(new URL(`provider/${version}/client.ts`, generated));
      await assertMissing(new URL(`provider/${version}/tests/stale.ts`, generated));
    }
    await cleanGeneratedArtifacts(generated);
    await assertEvidence(generated);
  });
});

Deno.test("client swaps and rollback preserve raw results even for retired versions", async () => {
  await fixture(async (generated) => {
    const sources = new Map([["provider/current/client.ts", "export const current = true;\n"]]);
    await replaceGeneratedDirectory(generated, sources, { validate: () => Promise.resolve() });
    await assertEvidence(generated);
    await assertMissing(new URL("provider/old/client.ts", generated));
    await assertMissing(new URL("provider/old/tests/stale.ts", generated));
    let failed = false;
    try {
      await replaceGeneratedDirectory(generated, new Map([["mod.ts", "export {};\n"]]), {
        validate: () => Promise.resolve(),
        afterGeneratedSwap: () => {
          throw new Error("injected swap failure");
        },
      });
    } catch (error) {
      failed = error instanceof Error && error.message === "injected swap failure";
    }
    assert(failed, "Expected swap failure");
    await assertEvidence(generated);
    assert(
      await Deno.readTextFile(new URL("provider/current/client.ts", generated)) ===
        sources.values().next().value,
      "Rollback lost the client",
    );
  });
});
