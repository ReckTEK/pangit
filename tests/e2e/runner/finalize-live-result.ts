/** Include host-side execution and teardown in the result produced inside the test container. */
export async function finalizeLiveResult(
  results: URL,
  passed: boolean,
): Promise<void> {
  const path = new URL("summary.json", results);
  let source: string;
  try {
    source = await Deno.readTextFile(path);
  } catch (error) {
    // Startup or test-report failures may leave no summary. They are already reported by the host.
    if (!passed && error instanceof Deno.errors.NotFound) return;
    throw error;
  }
  const summary = JSON.parse(source);
  if (
    summary === null || typeof summary !== "object" ||
    typeof summary.passed !== "boolean"
  ) {
    throw new Error("Live E2E summary has no valid pass/fail result");
  }
  await Deno.writeTextFile(
    path,
    JSON.stringify(
      {
        ...summary,
        passed: summary.passed && passed,
        hostExecution: { passed },
      },
      null,
      2,
    ) + "\n",
  );
}
