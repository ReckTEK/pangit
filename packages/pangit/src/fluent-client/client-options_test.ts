import { createClient } from "./create-client.ts";

for (
  const [provider, version] of [
    ["gitea", "1.27.2"],
    ["forgejo", "16.0.3"],
    ["gitlab", "19.3.1"],
  ] as const
) {
  Deno.test(`${provider} snapshots mutable configuration before lazy authentication`, async () => {
    const baseUrl = new URL(`https://${provider}.invalid`);
    const query = { hint: ["original"] };
    const requests: URL[] = [];
    const pending = createClient(provider, version, {
      baseUrl,
      query,
      fetch(input, init) {
        requests.push(new URL(new Request(input, init).url));
        return Promise.resolve(Response.json({ id: 1, login: "user", username: "user" }));
      },
    });
    baseUrl.hostname = "changed.invalid";
    query.hint[0] = "changed";
    const client = await pending;
    await client.auth.token("test-token");
    if (requests.length !== 1 || requests[0].hostname !== `${provider}.invalid`) {
      throw new Error("Caller mutation redirected authentication to another server");
    }
    if (requests[0].searchParams.get("hint") !== "original") {
      throw new Error("Caller mutation changed the configured default query");
    }
  });
}

Deno.test("Codeberg snapshots options before loading its provider", async () => {
  const { createCodebergClient } = await import("./create-codeberg-client.ts");
  const query = { hint: ["original"] };
  const requests: Request[] = [];
  const options = {
    query,
    fetch(input: Request | URL | string, init?: RequestInit) {
      requests.push(new Request(input, init));
      return Promise.resolve(Response.json({ id: 1, login: "user" }));
    },
  };
  const pending = createCodebergClient("16.0.3", options);
  query.hint[0] = "changed";
  const client = await pending;
  await client.auth.token("test-token");
  if (requests.length !== 1 || new URL(requests[0].url).searchParams.get("hint") !== "original") {
    throw new Error("Codeberg configuration changed during provider loading");
  }
});
