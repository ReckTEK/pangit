import { workspace, type WorkspacePaths } from "../../codegen/workspace-layout.ts";
import type { E2ERelease } from "../e2e-releases.ts";
import { renderE2EMarkdownReport } from "./e2e-markdown-report.ts";
import { readE2EReportSnapshots } from "./e2e-report-snapshots.ts";

/** Marker proving that the complete published report tree may be atomically replaced. */
export const e2eDocumentationOwnershipMarker =
  "# Owned by deno task e2e. This complete report tree is replaced after each E2E publication.\n";

async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function assertReplaceableReportTree(output: URL): Promise<void> {
  if (!await pathExists(output)) return;
  const marker = new URL(".generated", output);
  if (
    await pathExists(marker) &&
    await Deno.readTextFile(marker) === e2eDocumentationOwnershipMarker
  ) return;

  throw new Error(`Refusing to replace unowned E2E documentation: ${output.pathname}`);
}

function assertManualReadmeLinks(readme: string, expected: readonly string[]): void {
  const found = [...readme.matchAll(/\]\(([^)]+\/test-result\.md)\)/g)]
    .map((match) => match[1])
    .filter((path) => path.includes("/docs/test-results/"))
    .toSorted();
  const wanted = [...expected].toSorted();
  if (JSON.stringify(found) !== JSON.stringify(wanted)) {
    throw new Error(
      `README E2E report links must exactly match the manifest. Expected ${
        wanted.join(", ")
      }; found ${found.join(", ") || "none"}`,
    );
  }
}

async function recoverInterruptedReplacement(output: URL, stage: URL, backup: URL): Promise<void> {
  if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
  if (!await pathExists(backup)) return;
  if (!await pathExists(output)) await Deno.rename(backup, output);
  else await Deno.remove(backup, { recursive: true });
}

async function replaceReportTree(output: URL, reports: ReadonlyMap<string, string>): Promise<void> {
  const parent = new URL("../", output);
  const stage = new URL(".test-results.next/", parent);
  const backup = new URL(".test-results.previous/", parent);
  await Deno.mkdir(parent, { recursive: true });
  await recoverInterruptedReplacement(output, stage, backup);
  await assertReplaceableReportTree(output);

  await Deno.mkdir(stage);
  try {
    await Deno.writeTextFile(new URL(".generated", stage), e2eDocumentationOwnershipMarker);
    for (const [path, markdown] of reports) {
      const file = new URL(path, stage);
      await Deno.mkdir(new URL("./", file), { recursive: true });
      await Deno.writeTextFile(file, markdown);
    }
    if (await pathExists(output)) await Deno.rename(output, backup);
    await Deno.rename(stage, output);
    if (await pathExists(backup)) await Deno.remove(backup, { recursive: true });
  } catch (error) {
    if (!await pathExists(output) && await pathExists(backup)) await Deno.rename(backup, output);
    if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
    if (await pathExists(backup) && await pathExists(output)) {
      await Deno.remove(backup, { recursive: true });
    }
    throw error;
  }
}

/**
 * Publish all manifest-declared E2E reports as one validated replacement transaction.
 * The human-authored README is verified but never rewritten.
 */
export async function publishE2EDocumentation(
  paths: WorkspacePaths = workspace,
  releases?: readonly E2ERelease[],
): Promise<void> {
  const snapshots = await readE2EReportSnapshots(paths, releases);
  const readme = await Deno.readTextFile(new URL("README.md", paths.root));
  assertManualReadmeLinks(readme, snapshots.map((snapshot) => snapshot.readmeLink));

  const reports = new Map<string, string>();
  for (const snapshot of snapshots) {
    reports.set(snapshot.reportPath, await renderE2EMarkdownReport(snapshot));
  }
  await replaceReportTree(new URL("docs/test-results/", paths.packages.pangit), reports);
}

if (import.meta.main) await publishE2EDocumentation();
