/** Create or update a named repository webhook for an existing site or automation service. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, paginate, printJson, repositoryPath, required } from "./client.ts";

const path = repositoryPath();
const name = env("WEBHOOK_NAME");
const url = env("WEBHOOK_URL");
const secret = env("WEBHOOK_SECRET");
const client = await createClient();
const matches = [];

for await (
  const hook of paginate(async (page, limit) =>
    unwrapRestResponse(await client.repoListHooks({ path, query: { page, limit } }))
  )
) {
  if (hook.name === name) matches.push(hook);
}
if (matches.length > 1) {
  throw new Error(`More than one webhook is named ${name}; use a unique name.`);
}
const existing = matches[0];
if (existing && existing.type !== "gitea") {
  throw new Error(`${name} is not a Gitea-format webhook; use a different name.`);
}

const settings = {
  name,
  active: true,
  branch_filter: "*",
  events: ["push", "pull_request", "release"],
  config: { url, content_type: "json", secret },
};

const hook = existing
  ? unwrapRestResponse(
    await client.repoEditHook({
      path: { ...path, id: required(existing.id, "hook.id") },
      body: { mediaType: "application/json", value: settings },
    }),
  )
  : unwrapRestResponse(
    await client.repoCreateHook({
      path,
      body: { mediaType: "application/json", value: { ...settings, type: "gitea" } },
    }),
  );

// Hook config can contain secrets. Print only the fields useful to the operator.
printJson({
  action: existing ? "updated" : "created",
  id: hook.id,
  name,
  url,
  events: hook.events,
});
