import type {} from "../registration.ts";
import { normalizeWorkflowPath } from "./workflows.ts";
import { normalizeForgejoCiRun } from "./runs.ts";
import { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

Deno.test("Forgejo preserves explicit workflow directories and rejects ambiguous paths", () => {
  for (const directory of [".forgejo", ".gitea", ".github"]) {
    const path = `${directory}/workflows/build.yaml`;
    if (normalizeWorkflowPath(path) !== path) throw new Error("workflow directory changed");
  }
  if (normalizeWorkflowPath("build.yaml") !== ".forgejo/workflows/build.yaml") {
    throw new Error("default directory changed");
  }
  for (const path of ["../build.yaml", ".github/workflows/../build.yaml", "src/build.yaml"]) {
    let rejected = false;
    try {
      normalizeWorkflowPath(path);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("invalid workflow path accepted");
  }
});

Deno.test("Forgejo run metadata does not invent a directory for native workflow filenames", async () => {
  const context = new ForgejoAdapterContext("16.0.3", {
    baseUrl: "https://forgejo.invalid/api/v1",
  });
  const raw = { id: 1, workflow_id: "build.yaml", status: "success" };
  const run = normalizeForgejoCiRun(await context.client(), raw);
  if (run.workflowPath !== undefined) throw new Error("workflow directory was fabricated");
  const original = await run.native.forgejo(({ run }) => run);
  if (original !== raw) throw new Error("native workflow identity was lost");
});
