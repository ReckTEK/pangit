# Publish a release and its artifact

[All examples](../../../../examples.md) ·
[Previous: Triage an issue](../issue-triage/issue-triage.md) ·
[Next: Report external CI status](../ci-status/ci-status.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 6 of 8**

Publish the output of a real build—a CLI archive, application package, or site bundle—along with
release notes. You will create a draft, upload its artifact, and publish only after the upload
request succeeds.

**Before you start:** complete [client setup](../getting-started/getting-started.md) and use a
repository where you can create releases. Build and test the artifact separately, and prepare a
Markdown release-notes file. This example does not perform the build or tests.

**Writes:** a draft release, an attached file, and the final publication. Publication can create the
tag if it does not exist.

## 1. Choose the artifact and release commit

Use a new release tag and the exact commit that produced your artifact. Replace the paths below with
files that exist locally.

```bash
export RELEASE_TAG='v0.1.0'
export RELEASE_TARGET='replace-with-the-full-tested-commit-sha'
export RELEASE_ASSET='./dist/my-tool.zip'
export RELEASE_NOTES_FILE='./release-notes.md'
```

Save the TypeScript blocks below, in order, as [`release-with-asset.ts`](release-with-asset.ts)
**beside `client.ts` in your own Deno project**.

Read both files before creating a draft, so a missing local file cannot leave remote work behind.

```ts
/** Upload a built artifact to a draft release, then publish only after the upload succeeds. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, printJson, repositoryPath, required } from "./client.ts";

const path = repositoryPath();
const tag = env("RELEASE_TAG");
const target = env("RELEASE_TARGET");
const assetPath = env("RELEASE_ASSET");
const filename = assetPath.split(/[\\/]/).at(-1);
if (!filename) throw new Error("RELEASE_ASSET must point to a file.");
// Missing/unreadable local files should not leave a draft behind.
const bytes = await Deno.readFile(assetPath);
const notes = await Deno.readTextFile(env("RELEASE_NOTES_FILE"));
const client = await createClient();
```

## 2. Create the draft and retain its ID

`draft: true` holds publication until the file is attached. The returned release ID identifies the
resource used by the upload and publish requests.

```ts
const release = unwrapRestResponse(
  await client.repoCreateRelease({
    path,
    body: {
      mediaType: "application/json",
      value: {
        tag_name: tag,
        target_commitish: target,
        name: tag,
        body: notes,
        draft: true,
        prerelease: false,
      },
    },
  }),
);
const releasePath = { ...path, id: required(release.id, "release.id") };
```

`RELEASE_TARGET` selects the commit for a new tag. If the tag already exists, it identifies its own
commit; this field does not move it.

## 3. Upload the artifact as multipart data

A `File` preserves the attachment's filename. Let the client construct the multipart body and its
boundary rather than setting a `Content-Type` header manually.

```ts
const attachment = unwrapRestResponse(
  await client.repoCreateReleaseAttachment({
    path: releasePath,
    query: { name: filename },
    body: {
      mediaType: "multipart/form-data",
      // Let the transport set the multipart boundary; do not set Content-Type manually.
      value: { attachment: new File([bytes], filename, { type: "application/octet-stream" }) },
    },
  }),
);
```

This example buffers the complete file in memory and uses the shared request timeout. Your
instance's upload limits and configuration still apply.

## 4. Publish after the upload completes

The `await` above must finish successfully before `draft: false` is sent. Print the release and
download URLs only after publication succeeds.

```ts
const published = unwrapRestResponse(
  await client.repoEditRelease({
    path: releasePath,
    body: { mediaType: "application/json", value: { draft: false } },
  }),
);

printJson({ release: published.html_url, tag, asset: attachment.browser_download_url });
```

## Run it

```bash
deno run --allow-env --allow-net --allow-read="$RELEASE_ASSET,$RELEASE_NOTES_FILE" \
  release-with-asset.ts
```

## Check the result

Open the printed release URL. It should be published with your Markdown notes and an attachment
bearing the original filename. Download the asset and compare it with your local build output.

**Running again:** the script does not replace an existing release or resume an upload. If upload or
publication fails, inspect the remaining draft and finish or remove it in Gitea before retrying.

Next, connect an external build job's result to the commit it tested.

[All examples](../../../../examples.md) ·
[Previous: Triage an issue](../issue-triage/issue-triage.md) ·
[Next: Report external CI status](../ci-status/ci-status.md)
