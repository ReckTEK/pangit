import { startWebhookJournal } from "./webhook-journal.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

type ShutdownSignal = "SIGTERM" | "SIGINT";

/** Exercise real HTTP and signal handling without opening a port in the parent test process. */
async function exerciseJournal(signal: ShutdownSignal): Promise<void> {
  const timeout = setTimeout(() => {
    console.error("Webhook journal subprocess timed out");
    Deno.exit(1);
  }, 5_000);
  const server = startWebhookJournal({
    hostname: "127.0.0.1",
    port: 0,
    onListen: () => {},
  });
  const origin = `http://127.0.0.1:${server.addr.port}`;
  const request = async (path: string, expectedStatus: number, init?: RequestInit) => {
    const response = await fetch(`${origin}${path}`, {
      ...init,
      signal: AbortSignal.timeout(2_000),
    });
    assert(response.status === expectedStatus, `${path}: unexpected HTTP ${response.status}`);
    return response.status === 204 ? undefined : await response.json();
  };

  try {
    assert((await request("/health", 200)).ready === true, "Journal is not healthy");
    await request("/hooks/read%20helpers", 202, {
      method: "POST",
      headers: { "x-gitea-event": "push" },
      body: JSON.stringify({ message: "hello" }),
    });
    await request("/hooks/read%20helpers", 202, {
      method: "POST",
      body: "plain delivery",
    });
    await request("/hooks/other", 202, {
      method: "POST",
      headers: { "x-gitea-event": "push" },
      body: JSON.stringify({ message: "other key" }),
    });

    const all = await request("/events?key=read%20helpers", 200);
    assert(all.events.length === 2, "Journal did not isolate the hook key");
    assert(all.events[0].event === "push", "Journal lost the event header");
    assert(all.events[0].body.message === "hello", "Journal lost the JSON body");
    assert(all.events[1].event === "unknown", "Journal lost the default event name");
    assert(all.events[1].body === "plain delivery", "Journal lost the non-JSON body");
    const selected = await request("/events?key=read%20helpers&event=push", 200);
    assert(selected.events.length === 1, "Journal did not filter the event name");

    await request("/events?key=read%20helpers", 204, { method: "DELETE" });
    assert(
      (await request("/events?key=read%20helpers", 200)).events.length === 0,
      "Journal did not clear the hook key",
    );
    assert(
      (await request("/events?key=other", 200)).events.length === 1,
      "Clearing one key changed another key",
    );
    await request("/hooks/", 400, { method: "POST" });
    await request("/events", 400);
    await request("/missing", 404);

    Deno.kill(Deno.pid, signal);
    await server.finished;
    console.log(`${signal}: journal stopped cleanly`);
  } finally {
    clearTimeout(timeout);
  }
}

if (import.meta.main) {
  const signal = Deno.args[0];
  assert(signal === "SIGTERM" || signal === "SIGINT", "Expected a shutdown signal");
  await exerciseJournal(signal);
} else {
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    Deno.test({
      name: `webhook journal preserves deliveries and exits cleanly on ${signal}`,
      ignore: Deno.build.os === "windows",
      async fn() {
        const child = new Deno.Command(Deno.execPath(), {
          args: [
            "run",
            "--no-config",
            "--no-lock",
            "--allow-net=127.0.0.1",
            import.meta.url,
            signal,
          ],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        }).spawn();
        let timedOut = false;
        const timeout = setTimeout(() => {
          timedOut = true;
          try {
            child.kill("SIGKILL");
          } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) throw error;
          }
        }, 10_000);
        try {
          const output = await child.output();
          const decoder = new TextDecoder();
          assert(!timedOut, `${signal}: journal retained resources after shutdown`);
          assert(
            output.success && output.code === 0,
            `${signal}: journal exited ${output.code}: ${decoder.decode(output.stderr)}`,
          );
          assert(
            decoder.decode(output.stdout).includes(`${signal}: journal stopped cleanly`),
            `${signal}: journal did not finish shutdown`,
          );
        } finally {
          clearTimeout(timeout);
        }
      },
    });
  }
}
