/** Publish a local document to a review branch, creating or updating the file without a clone. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, printJson, repositoryPath, required } from "./client.ts";

const path = repositoryPath();
const filepath = env("REPO_FILE");
const branch = env("CHANGE_BRANCH");
const title = env("PR_TITLE");
// Read before creating anything remotely. Encoding bytes preserves UTF-8 and binary content.
const content = (await Deno.readFile(env("CONTENT_FILE"))).toBase64();
const client = await createClient();
const repository = unwrapRestResponse(await client.repoGet({ path }));
const base = Deno.env.get("BASE_BRANCH") ?? required(repository.default_branch, "default_branch");
if (branch === base) throw new Error("CHANGE_BRANCH must differ from the base branch.");

// Use a fresh branch name. Never force-push or overwrite an existing review branch.
unwrapRestResponse(
  await client.repoCreateBranch({
    path,
    body: {
      mediaType: "application/json",
      value: { new_branch_name: branch, old_ref_name: base },
    },
  }),
);

const filePath = { ...path, filepath };
const existing = await client.repoGetContents({ path: filePath, query: { ref: branch } });
const change = { branch, content, message: title };

if (existing.status === 404) {
  // Only a missing file selects the create path; authentication/server errors still fail.
  unwrapRestResponse(
    await client.repoCreateFile({
      path: filePath,
      body: { mediaType: "application/json", value: change },
    }),
  );
} else {
  const file = unwrapRestResponse(existing);
  if (Array.isArray(file) || file.type !== "file") {
    throw new Error(`${filepath} is not a regular file.`);
  }
  unwrapRestResponse(
    await client.repoUpdateFile({
      path: filePath,
      body: {
        mediaType: "application/json",
        // The file's blob SHA protects against silently overwriting a concurrent edit.
        value: { ...change, sha: required(file.sha, "file.sha") },
      },
    }),
  );
}

const pull = unwrapRestResponse(
  await client.repoCreatePullRequest({
    path,
    body: {
      mediaType: "application/json",
      value: {
        head: branch,
        base,
        title,
        body: `Update \`${filepath}\` from a local file.\n\nPlease review before merging.`,
      },
    },
  }),
);

printJson({ branch, base, pull_request: pull.html_url, number: pull.number });
