import type { WorkspacePaths } from "../../workspace-layout.ts";
import {
  cleanGeneratedE2EArtifacts,
  generatedE2EOwnershipMarker,
} from "./clean-generated-e2e-output.ts";

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

function fixturePaths(root: URL): WorkspacePaths {
  return {
    root,
    codegen: {
      root: new URL("codegen/", root),
      pangit: new URL("codegen/pangit/", root),
      pangitSite: new URL("codegen/pangit-site/", root),
    },
    packages: {
      pangit: new URL("packages/pangit/", root),
      site: new URL("packages/pangit-site/", root),
    },
  };
}

Deno.test("generation cleans only the two explicit generated E2E branches", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".e2e-tree-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  const raw = new URL(
    "tests/e2e/generated/raw-rest-client-tests/gitea/1.0.0/",
    root,
  );
  const docker = new URL(
    "tests/e2e/generated/docker-environments/gitea/1.0.0/",
    root,
  );
  const rawCases = new URL(
    "tests/e2e/hand-written/raw-rest-client-test-cases/gitea.json",
    root,
  );
  const fluentApiTest = new URL(
    "tests/e2e/hand-written/git-host-adapter-tests/gitea/gitea-fluent-api-e2e_test.ts",
    root,
  );
  const results = new URL("tests/e2e/results/gitea/1.0.0/summary.json", root);
  try {
    for (const generated of [raw, docker]) {
      await Deno.mkdir(generated, { recursive: true });
      await Deno.writeTextFile(new URL(".generated", generated), generatedE2EOwnershipMarker);
      await Deno.writeTextFile(new URL("stale.txt", generated), "stale");
    }
    for (const authored of [rawCases, fluentApiTest, results]) {
      await Deno.mkdir(new URL("./", authored), { recursive: true });
      await Deno.writeTextFile(authored, "authored");
    }

    await cleanGeneratedE2EArtifacts(fixturePaths(root));

    assert(!await pathExists(raw), "Generated raw REST-client suite survived cleanup");
    assert(!await pathExists(docker), "Generated Docker environment survived cleanup");
    assert(await Deno.readTextFile(rawCases) === "authored", "Hand-written cases were changed");
    assert(
      await Deno.readTextFile(fluentApiTest) === "authored",
      "Hand-written fluent API test was changed",
    );
    assert(await Deno.readTextFile(results) === "authored", "E2E evidence was changed");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("generation refuses unmarked generated E2E directories", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".e2e-tree-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  const raw = new URL(
    "tests/e2e/generated/raw-rest-client-tests/gitea/1.0.0/",
    root,
  );
  try {
    await Deno.mkdir(raw, { recursive: true });
    await Deno.writeTextFile(new URL("human.txt", raw), "keep");
    let rejected = false;
    try {
      await cleanGeneratedE2EArtifacts(fixturePaths(root));
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("unowned generated E2E");
    }
    assert(rejected, "Unowned generated-tree content was accepted");
    assert(await Deno.readTextFile(new URL("human.txt", raw)) === "keep", "Content changed");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
