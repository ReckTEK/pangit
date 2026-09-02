import type { LiveTestRelease } from "../runner/discover-generated-live-tests.ts";
import {
  liveTestResultOwnershipMarker,
  prepareResultDirectories,
} from "./prepare-result-directories.ts";

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
  const resultsRoot = new URL(`file://${Deno.cwd()}/${directory}/results/`);
  const active = new URL("gitea/1.0.0/", resultsRoot);
  const obsolete = new URL("gitea/0.9.0/", resultsRoot);
  try {
    for (const results of [active, obsolete]) {
      await Deno.mkdir(results, { recursive: true });
      await Deno.writeTextFile(new URL(".generated", results), liveTestResultOwnershipMarker);
      await Deno.writeTextFile(new URL("stale.json", results), "stale");
    }
    await prepareResultDirectories(resultsRoot, [{ results: active } as LiveTestRelease]);
    assert(!await pathExists(new URL("stale.json", active)), "Active stale result survived");
    assert(
      await Deno.readTextFile(new URL(".generated", active)) === liveTestResultOwnershipMarker,
      "Active result ownership was not restored",
    );
    assert(!await pathExists(new URL("gitea/0.9.0/", resultsRoot)), "Owned orphan remained");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("E2E result preparation refuses to delete unowned orphan evidence", async () => {
  const directory = await Deno.makeTempDir({ dir: "tests", prefix: ".result-tree-test-" });
  const resultsRoot = new URL(`file://${Deno.cwd()}/${directory}/results/`);
  const active = new URL("gitea/1.0.0/", resultsRoot);
  const unowned = new URL("gitea/0.9.0/", resultsRoot);
  try {
    await Deno.mkdir(active, { recursive: true });
    await Deno.mkdir(unowned, { recursive: true });
    await Deno.writeTextFile(new URL("human.txt", unowned), "keep");
    let rejected = false;
    try {
      await prepareResultDirectories(resultsRoot, [{ results: active } as LiveTestRelease]);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("unowned E2E results");
    }
    assert(rejected, "Unowned orphan evidence was accepted");
    assert(await Deno.readTextFile(new URL("human.txt", unowned)) === "keep", "Evidence changed");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("focused result preparation cannot replace complete evidence", async () => {
  const directory = await Deno.makeTempDir({ dir: "tests", prefix: ".result-tree-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  const complete = new URL("results/gitea/1.27.2/", root);
  const focusedRoot = new URL(".focused-results/", root);
  const focused = new URL("gitea/1.27.2/", focusedRoot);
  try {
    await Deno.mkdir(complete, { recursive: true });
    await Deno.writeTextFile(new URL("summary.json", complete), "complete-evidence");
    await prepareResultDirectories(focusedRoot, [{ results: focused } as LiveTestRelease]);
    assert(
      await Deno.readTextFile(new URL("summary.json", complete)) === "complete-evidence",
      "Focused result preparation changed complete evidence",
    );
    assert(
      await Deno.readTextFile(new URL(".generated", focused)) === liveTestResultOwnershipMarker,
      "Focused result ownership marker was not created",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("focused result preparation preserves other independently focused versions", async () => {
  const directory = await Deno.makeTempDir({ dir: "tests", prefix: ".result-tree-test-" });
  const focusedRoot = new URL(`file://${Deno.cwd()}/${directory}/.focused-results/`);
  const selected = new URL("gitea/1.27.2/", focusedRoot);
  const other = new URL("gitea/1.26.4/", focusedRoot);
  try {
    await Deno.mkdir(other, { recursive: true });
    await Deno.writeTextFile(new URL(".generated", other), liveTestResultOwnershipMarker);
    await Deno.writeTextFile(new URL("summary.json", other), "older-focused-evidence");
    await prepareResultDirectories(
      focusedRoot,
      [{ results: selected } as LiveTestRelease],
      { pruneUnselected: false },
    );
    assert(
      await Deno.readTextFile(new URL("summary.json", other)) === "older-focused-evidence",
      "A focused run removed another version's independent evidence",
    );
    assert(
      await Deno.readTextFile(new URL(".generated", selected)) === liveTestResultOwnershipMarker,
      "Selected focused result ownership marker was not created",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
