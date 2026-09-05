import { createCodebergClient } from "./codeberg.ts";
import { createCodebergClient as createHostedClient } from "../../../fluent-client/mod.ts";

for (const create of [createCodebergClient, createHostedClient]) {
  Deno.test(`Codeberg ${create === createHostedClient ? "catalog" : "standalone"} factory preserves Forgejo identity and transport hooks`, async () => {
    const requests: Request[] = [];
    const client = await create("16.0.3", {
      fetch(input, init) {
        const request = new Request(input, init);
        requests.push(request);
        return Promise.resolve(Response.json({ id: 1, login: "sandbox" }));
      },
    });
    if (Number(requests.length) !== 0) throw new Error("construction performed HTTP");
    const git = await client.auth.token("fixture-token");
    const request = requests[0];
    if (Number(requests.length) !== 1 || request.url !== "https://codeberg.org/api/v1/user") {
      throw new Error("hosted authentication went to the wrong endpoint");
    }
    if (request.headers.get("authorization") !== "token fixture-token") {
      throw new Error("credentials lost");
    }
    await git.native.forgejo(({ client }) => {
      if (typeof client.listActionRunJobs !== "function") throw new Error("wrong native version");
    });
    if (Number(requests.length) !== 1) throw new Error("native access performed HTTP");
  });
}
