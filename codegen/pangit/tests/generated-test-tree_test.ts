import {
  cleanGeneratedTestArtifacts,
  generatedTestOwnershipMarker,
} from "./generated-test-tree.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

Deno.test("generated E2E cleanup removes suite files and preserves result evidence", async () => {
  const root = await Deno.makeTempDir({ dir: "codegen", prefix: ".suite-cleanup-test-" });
  const providers = new URL(`file://${Deno.cwd()}/${root}/providers/`);
  const version = new URL("gitea/1.0.0/", providers);
  try {
    await Deno.mkdir(new URL("results/", version), { recursive: true });
    await Deno.writeTextFile(new URL(".generated", version), generatedTestOwnershipMarker);
    await Deno.writeTextFile(new URL("e2e_test.ts", version), "generated suite");
    await Deno.writeTextFile(new URL("results/summary.json", version), "saved evidence");

    await cleanGeneratedTestArtifacts(providers);

    assert(!await pathExists(new URL("e2e_test.ts", version)), "Generated suite file remained");
    assert(!await pathExists(new URL(".generated", version)), "Suite marker remained");
    assert(
      await Deno.readTextFile(new URL("results/summary.json", version)) === "saved evidence",
      "Result evidence changed",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("generated E2E cleanup rejects unmarked suite content", async () => {
  const root = await Deno.makeTempDir({ dir: "codegen", prefix: ".suite-cleanup-test-" });
  const providers = new URL(`file://${Deno.cwd()}/${root}/providers/`);
  const version = new URL("gitea/1.0.0/", providers);
  try {
    await Deno.mkdir(version, { recursive: true });
    await Deno.writeTextFile(new URL("authored.ts", version), "keep");
    let rejected = false;
    try {
      await cleanGeneratedTestArtifacts(providers);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("unmarked provider test");
    }
    assert(rejected, "Unmarked suite content was not rejected");
    assert(await pathExists(new URL("authored.ts", version)), "Unmarked content was deleted");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
