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
    const client = await createClient(provider, version, {
      baseUrl,
      query,
      fetch(input, init) {
        requests.push(new URL(new Request(input, init).url));
        return Promise.resolve(Response.json({ id: 1, login: "user", username: "user" }));
      },
    });
    baseUrl.hostname = "changed.invalid";
    query.hint[0] = "changed";
    await client.auth.token("test-token");
    if (requests.length !== 1 || requests[0].hostname !== `${provider}.invalid`) {
      throw new Error("Caller mutation redirected authentication to another server");
    }
    if (requests[0].searchParams.get("hint") !== "original") {
      throw new Error("Caller mutation changed the configured default query");
    }
  });
}
