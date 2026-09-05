type JournalEntry = Readonly<{
  event: string;
  body: unknown;
}>;

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

/** Start the disposable webhook fixture with graceful Docker/terminal shutdown. */
export function startWebhookJournal(
  options: Deno.ServeTcpOptions = { hostname: "0.0.0.0", port: 8080 },
): Deno.HttpServer<Deno.NetAddr> {
  const events = new Map<string, JournalEntry[]>();
  const server = Deno.serve(options, async (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ready: true });

    if (request.method === "POST" && url.pathname.startsWith("/hooks/")) {
      const key = decodeURIComponent(url.pathname.slice("/hooks/".length));
      if (key.length === 0) return json({ error: "missing hook key" }, 400);
      const text = await request.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // Retain non-JSON deliveries verbatim for diagnostic evidence.
      }
      const entry = Object.freeze({
        event: request.headers.get("x-forgejo-event") ?? "unknown",
        body,
      });
      events.set(key, [...(events.get(key) ?? []), entry]);
      return json({ accepted: true }, 202);
    }

    if (url.pathname === "/events") {
      const key = url.searchParams.get("key");
      if (key === null || key.length === 0) return json({ error: "missing key" }, 400);
      if (request.method === "DELETE") {
        events.delete(key);
        return new Response(null, { status: 204 });
      }
      if (request.method === "GET") {
        const event = url.searchParams.get("event");
        const selected = (events.get(key) ?? []).filter((entry) =>
          event === null || entry.event === event
        );
        return json({ events: selected });
      }
    }

    return json({ error: "not found" }, 404);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.shutdown().catch((error: unknown) => {
      console.error("Webhook journal shutdown failed:", error);
      Deno.exitCode = 1;
    });
  };
  Deno.addSignalListener("SIGTERM", shutdown);
  Deno.addSignalListener("SIGINT", shutdown);
  const removeSignalListeners = () => {
    Deno.removeSignalListener("SIGTERM", shutdown);
    Deno.removeSignalListener("SIGINT", shutdown);
  };
  void server.finished.then(removeSignalListeners, removeSignalListeners);
  return server;
}

if (import.meta.main) await startWebhookJournal().finished;
