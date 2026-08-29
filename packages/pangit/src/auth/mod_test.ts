import { PanGit } from "../client/mod.ts";

Deno.test("Gitea token authorization verifies the token with the selected raw client", async () => {
  let captured: Request | undefined;
  const selected = PanGit.createClient("gitea", "1.27.2", {
    baseUrl: "https://gitea.test/api/v1",
    fetch: (request) => {
      captured = request instanceof Request ? request : new Request(request);
      return Promise.resolve(
        new Response('{"id":1,"login":"sandbox"}', {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  });

  const authorized = await selected.auth.token({ token: "gitea-token" });

  assert(captured !== undefined, "Gitea current-user verification did not make a request");
  assertEquals(captured.url, "https://gitea.test/api/v1/user");
  assertEquals(captured.method, "GET");
  assertEquals(captured.headers.get("authorization"), "token gitea-token");
  assertEquals(authorized.provider, "gitea");
  assertEquals(authorized.version, "1.27.2");
});

Deno.test("Gitea token authorization reports a clear non-success error", async () => {
  const selected = PanGit.createClient("gitea", "1.27.2", {
    baseUrl: "https://gitea.test/api/v1",
    fetch: () =>
      Promise.resolve(
        new Response('{"message":"unauthorized"}', {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
  });

  let thrown: unknown;
  try {
    await selected.auth.token({ token: "must-not-leak" });
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof Error, "Gitea token authorization did not reject");
  assertEquals(
    thrown.message,
    "Gitea token authorization failed: GET /user returned HTTP 401",
  );
  assert(!thrown.message.includes("must-not-leak"), "Authorization error leaked the token");
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
