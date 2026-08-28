# Connect a webhook

[All examples](../../../../examples.md) ·
[Previous: Report external CI status](../ci-status/ci-status.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 8 of 8**

Notify an existing site or automation service when code is pushed, a pull request changes, or a
release is published. You will manage one named repository webhook and leave other integrations
alone.

**Before you start:** complete [client setup](../getting-started/getting-started.md). Your account
needs repository administration access. The receiver must already handle Gitea payloads and verify
their signatures with the shared secret.

**Writes:** creates the named webhook if absent; otherwise updates that hook's URL, secret, events,
activation, and branch filter. This lesson does not implement the receiver.

## 1. Name the integration and provide its receiver

Choose a name belonging to this integration, rather than reusing the name of another service's hook.

```bash
export WEBHOOK_NAME='personal-site'
export WEBHOOK_URL='https://automation.example.com/hooks/gitea'
read -rs -p 'Webhook secret: ' WEBHOOK_SECRET
echo
export WEBHOOK_SECRET
```

Save the TypeScript blocks below, in order, as [`configure-webhook.ts`](configure-webhook.ts)
**beside `client.ts` in your own Deno project**.

Load the repository, hook identity, and secret before making requests.

```ts
/** Create or update a named repository webhook for an existing site or automation service. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, paginate, printJson, repositoryPath, required } from "./client.ts";

const path = repositoryPath();
const name = env("WEBHOOK_NAME");
const url = env("WEBHOOK_URL");
const secret = env("WEBHOOK_SECRET");
const client = await createClient();
const matches = [];
```

## 2. Find the existing hook across every page

Match the exact name. Duplicate matches are ambiguous, and a different hook type has a different
configuration contract, so either situation stops the workflow.

```ts
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
```

## 3. Declare the events and destination

Request `push`, `pull_request`, and `release` notifications for all branches. Edit this object if
your receiver needs a narrower event set or branch filter.

```ts
const settings = {
  name,
  active: true,
  branch_filter: "*",
  events: ["push", "pull_request", "release"],
  config: { url, content_type: "json", secret },
};
```

## 4. Create or update the matched resource

Use the existing ID when updating. Only the creation request needs `type: "gitea"`. Print useful
configuration fields without dumping the hook config, which can contain secrets.

```ts
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
```

## Run it

```bash
deno run --allow-env --allow-net configure-webhook.ts
```

## Check configuration and delivery

The first run should print `action: "created"`; another run with the same name should print
`action: "updated"` and the same hook ID. Check the repository's webhook settings for the URL and
event selections.

Configuration success does not prove delivery. Trigger an event, such as the content PR from an
earlier lesson, then inspect the delivery result in Gitea and the receiver's logs. The receiver
should reject payloads whose signature does not match the secret.

**Running again:** refreshes this named hook's settings without creating another hook or changing
hooks with other names. It is not a synchronization transaction; do not run competing updates for
the same name concurrently.

You have reached the end of the raw Gitea client tutorial. Return to the example index to revisit
any area.

[All examples](../../../../examples.md) ·
[Previous: Report external CI status](../ci-status/ci-status.md)
