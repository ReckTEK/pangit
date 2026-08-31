import type { E2ERelease } from "./e2e-releases.ts";
import { e2eResultOwnershipMarker, prepareE2EResultTree } from "./e2e-result-tree.ts";

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

Deno.test("E2E result preparation clears active output and removes owned orphan versions", async () => {
  const directory = await Deno.makeTempDir({ dir: "tests", prefix: ".result-tree-test-" });
  const providers = new URL(`file://${Deno.cwd()}/${directory}/providers/`);
  const active = new URL("gitea/1.0.0/results/", providers);
  const obsolete = new URL("gitea/0.9.0/results/", providers);
  try {
    for (const results of [active, obsolete]) {
      await Deno.mkdir(results, { recursive: true });
      await Deno.writeTextFile(new URL(".generated", results), e2eResultOwnershipMarker);
      await Deno.writeTextFile(new URL("stale.json", results), "stale");
    }
    await prepareE2EResultTree(providers, [{ results: active } as E2ERelease]);
    assert(!await pathExists(new URL("stale.json", active)), "Active stale result survived");
    assert(
      await Deno.readTextFile(new URL(".generated", active)) === e2eResultOwnershipMarker,
      "Active result ownership was not restored",
    );
    assert(!await pathExists(new URL("gitea/0.9.0/", providers)), "Owned orphan remained");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("E2E result preparation refuses to delete unowned orphan evidence", async () => {
  const directory = await Deno.makeTempDir({ dir: "tests", prefix: ".result-tree-test-" });
  const providers = new URL(`file://${Deno.cwd()}/${directory}/providers/`);
  const active = new URL("gitea/1.0.0/results/", providers);
  const unowned = new URL("gitea/0.9.0/results/", providers);
  try {
    await Deno.mkdir(active, { recursive: true });
    await Deno.mkdir(unowned, { recursive: true });
    await Deno.writeTextFile(new URL("human.txt", unowned), "keep");
    let rejected = false;
    try {
      await prepareE2EResultTree(providers, [{ results: active } as E2ERelease]);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("unowned E2E results");
    }
    assert(rejected, "Unowned orphan evidence was accepted");
    assert(await Deno.readTextFile(new URL("human.txt", unowned)) === "keep", "Evidence changed");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
