import { assertCleanServiceShutdown } from "./run-all-live-tests.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function shutdownError(containers: Parameters<typeof assertCleanServiceShutdown>[0]): Error {
  try {
    assertCleanServiceShutdown(containers);
  } catch (error) {
    assert(error instanceof Error, "Shutdown failure did not produce an Error");
    return error;
  }
  throw new Error("Unclean service shutdown was accepted");
}

Deno.test("E2E shutdown accepts clean exits and ordinary SIGTERM termination", () => {
  assertCleanServiceShutdown([]);
  assertCleanServiceShutdown([
    { Name: "/webhook-journal", State: { Running: false, ExitCode: 0 } },
    { Name: "/gitea", State: { Running: false, ExitCode: 143, Error: "" } },
  ]);
});

Deno.test("E2E shutdown reports crashes and forced kills even when containers stopped", () => {
  const error = shutdownError([
    { Name: "/webhook-journal", State: { Running: false, ExitCode: 139 } },
    { Name: "/actions", State: { Running: false, ExitCode: 137 } },
    { Name: "/gitea", State: { Running: false, ExitCode: 0 } },
  ]);
  assert(error.message.includes("webhook-journal (exit 139)"), "Crash evidence was lost");
  assert(error.message.includes("actions (exit 137)"), "Forced-kill evidence was lost");
  assert(!error.message.includes("gitea"), "Clean service was reported as a failure");
});

Deno.test("E2E shutdown rejects still-running services and other nonzero exits", () => {
  const running = shutdownError([
    { Name: "/webhook-journal", State: { Running: true, ExitCode: 0 } },
  ]);
  assert(running.message.includes("still running"), "Running service state was lost");
  const failed = shutdownError([
    { Name: "/actions", State: { Running: false, ExitCode: 1 } },
  ]);
  assert(failed.message.includes("actions (exit 1)"), "Nonzero exit evidence was lost");
});

Deno.test("E2E shutdown rejects Docker state errors even with an accepted exit code", () => {
  for (const exitCode of [0, 143]) {
    const error = shutdownError([
      {
        Name: "/webhook-journal",
        State: { Running: false, ExitCode: exitCode, Error: "fixture runtime error" },
      },
    ]);
    assert(error.message.includes("fixture runtime error"), "Docker state error was lost");
  }
});
