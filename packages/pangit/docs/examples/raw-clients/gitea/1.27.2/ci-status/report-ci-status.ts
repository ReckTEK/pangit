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
