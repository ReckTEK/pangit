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

const published = unwrapRestResponse(
  await client.repoEditRelease({
    path: releasePath,
    body: { mediaType: "application/json", value: { draft: false } },
  }),
);

printJson({ release: published.html_url, tag, asset: attachment.browser_download_url });
