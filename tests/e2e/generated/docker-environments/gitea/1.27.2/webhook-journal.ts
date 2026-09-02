type JournalEntry = Readonly<{
  event: string;
  body: unknown;
}>;

const events = new Map<string, JournalEntry[]>();

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

Deno.serve({ hostname: "0.0.0.0", port: 8080 }, async (request) => {
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
      event: request.headers.get("x-gitea-event") ?? "unknown",
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
