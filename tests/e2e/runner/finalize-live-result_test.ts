import { finalizeLiveResult } from "./finalize-live-result.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("E2E summaries retain suite failures and include host execution failures", async () => {
  const directory = await Deno.makeTempDir({ prefix: "pangit-e2e-finalize-" });
  const results = new URL(`file://${directory}/`);
  const path = new URL("summary.json", results);
  try {
    for (
      const [suitePassed, hostPassed] of [
        [true, false],
        [false, true],
        [false, false],
        [true, true],
      ]
    ) {
      const suite = { passed: suitePassed, evidence: "original" };
      await Deno.writeTextFile(
        path,
        JSON.stringify({ passed: suitePassed, suites: { suite } }),
      );
      await finalizeLiveResult(results, hostPassed);
      const actual = JSON.parse(await Deno.readTextFile(path));
      assert(
        actual.passed === (suitePassed && hostPassed),
        "Overall result hid a failure",
      );
      assert(
        actual.hostExecution.passed === hostPassed,
        "Host result was not retained",
      );
      assert(
        JSON.stringify(actual.suites.suite) === JSON.stringify(suite),
        "Suite evidence changed",
      );
    }
    await Deno.remove(path);
    await finalizeLiveResult(results, false);
    let missingRejected = false;
    try {
      await finalizeLiveResult(results, true);
    } catch (error) {
      missingRejected = error instanceof Deno.errors.NotFound;
    }
    assert(
      missingRejected,
      "Successful host execution accepted missing evidence",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
