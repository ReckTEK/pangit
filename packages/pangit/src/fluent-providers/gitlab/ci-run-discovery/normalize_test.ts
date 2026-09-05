import { state } from "./normalize.ts";
import { status } from "../commit-statuses/normalize.ts";
import { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";

Deno.test("Unknown GitLab states retain native values without becoming inherited object members", async () => {
  const context = new GitLabAdapterContext("19.3.1", { baseUrl: "https://gitlab.invalid" });
  for (const value of ["constructor", "toString", "__proto__", "future-state"]) {
    const execution = state({ status: value });
    if (
      execution.status !== "unknown" || execution.conclusion !== undefined ||
      execution.providerStatus !== value
    ) {
      throw new Error("Unknown execution state was misrepresented as a completed run");
    }
    const commit = await status(context, { id: 1, name: "check", status: value }, "a".repeat(40));
    if (commit.state !== undefined || commit.providerState !== value) {
      throw new Error("Unknown commit status lost its native value or gained an invalid state");
    }
  }
});
