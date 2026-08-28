# Report external CI status

[All examples](../../../../examples.md) ·
[Previous: Publish a release and its artifact](../releases/releases.md) ·
[Next: Connect a webhook](../webhooks/webhooks.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 7 of 8**

Connect an external CI service to Gitea's commit status display. You will report the state of one
job against its exact commit, then read the combined state across all job contexts.

**Before you start:** complete [client setup](../getting-started/getting-started.md). Your token
needs permission to write repository commit statuses. Supply the SHA actually checked out by the
external job and its log URL.

**Writes:** one commit status per run. This does not execute tests, dispatch an Actions workflow, or
merge a PR.

## 1. Identify the job and immutable commit

Start with `pending` when the job begins. Use a stable context for the same kind of job, such as
`external/tests`; separate jobs should have different contexts.

```bash
export COMMIT_SHA='replace-with-the-full-tested-commit-sha'
export CI_CONTEXT='external/tests'
export CI_URL='https://ci.example.com/jobs/123'
export CI_STATE='pending'
```

Save the TypeScript blocks below, in order, as [`report-ci-status.ts`](report-ci-status.ts) **beside
`client.ts` in your own Deno project**.

A full SHA avoids reporting against a moving branch name. Validate the requested state before
sending it.

```ts
/** Report an external CI job's actual state against its exact tested commit. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, printJson, repositoryPath } from "./client.ts";

const path = repositoryPath();
const sha = env("COMMIT_SHA");
if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(sha)) {
  throw new Error("COMMIT_SHA must be a full commit SHA, not a moving branch name.");
}
const inputState = env("CI_STATE");
const states = ["pending", "success", "failure", "error", "warning", "skipped"] as const;
const state = states.find((candidate) => candidate === inputState);
if (!state) throw new Error(`CI_STATE must be one of: ${states.join(", ")}.`);
const context = env("CI_CONTEXT");
const targetUrl = env("CI_URL");
const client = await createClient();
```

## 2. Publish that job's state

`context` identifies the status stream, and `target_url` lets a reviewer reach the external logs.
Set `CI_DESCRIPTION` if you want a more specific status message.

```ts
unwrapRestResponse(
  await client.repoCreateStatus({
    path: { ...path, sha },
    body: {
      mediaType: "application/json",
      value: {
        state,
        context,
        target_url: targetUrl,
        description: Deno.env.get("CI_DESCRIPTION") ?? `${context}: ${state}`,
      },
    },
  }),
);
```

## 3. Read the combined result

Your job may be successful while another context is still pending or failing. Read
`repoGetCombinedStatusByRef` for the same SHA and report both states.

```ts
// The aggregate can still be pending or failing because of other CI contexts.
const combined = unwrapRestResponse(
  await client.repoGetCombinedStatusByRef({
    path: { ...path, ref: sha },
  }),
);

printJson({
  commit: sha,
  context,
  reported_state: state,
  combined_state: combined.state,
  status_count: combined.total_count,
});
```

## Run it

```bash
deno run --allow-env --allow-net report-ci-status.ts
```

When the job finishes, set `CI_STATE` to its actual outcome and run the same command again, keeping
the same SHA and context. Use `success` for a passed job, `failure` for a failed job, or `error` for
an execution problem. Gitea also accepts `warning` and `skipped`.

## Check the result

The commit's status display should show your context and link to `CI_URL`. The output's
`reported_state` is this job's state; `combined_state` is Gitea's aggregate and can differ.

**Running again:** posts another status for the supplied SHA and context. It reports the value you
supply; it does not discover whether the job really passed.

Next, configure Gitea to notify your own service when repository events happen.

[All examples](../../../../examples.md) ·
[Previous: Publish a release and its artifact](../releases/releases.md) ·
[Next: Connect a webhook](../webhooks/webhooks.md)
