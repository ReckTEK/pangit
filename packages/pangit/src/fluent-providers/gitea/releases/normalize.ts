import type {
  ReleaseAssetData,
  ReleaseData,
} from "../../../fluent-api/adapter-contract/optional/releases.ts";

import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaReleaseEntityNative,
  type GiteaReleaseEntityPayload,
} from "../native/GiteaReleaseNative.ts";

import {
  type AnyGiteaRelease,
  type AnyGiteaReleaseAsset,
  optionalInt64,
  optionalText,
  requiredText,
} from "./validate-payload.ts";

export function normalizeGiteaRelease<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaRelease,
): ReleaseData<"gitea", TVersion> {
  const tagName = requiredText(payload.tag_name, "release tag name");
  return Object.freeze({
    id: requiredText(payload.id, `release ${tagName} id`),
    tagName,
    ...(optionalText(payload.name) === undefined ? {} : { name: optionalText(payload.name) }),
    ...(optionalText(payload.body) === undefined
      ? {}
      : { description: optionalText(payload.body) }),
    ...(optionalText(payload.author?.login) === undefined
      ? {}
      : { author: optionalText(payload.author?.login) }),
    draft: payload.draft === true,
    prerelease: payload.prerelease === true,
    ...(optionalText(payload.target_commitish) === undefined
      ? {}
      : { target: optionalText(payload.target_commitish) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    ...(optionalText(payload.published_at) === undefined
      ? {}
      : { publishedAt: optionalText(payload.published_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createGiteaReleaseEntityNative(
      "release",
      client,
      payload as GiteaReleaseEntityPayload<TVersion, "release">,
    ),
  });
}

export function normalizeGiteaReleaseAsset<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaReleaseAsset,
): ReleaseAssetData<"gitea", TVersion> {
  const id = requiredText(payload.id, "release asset id");
  return Object.freeze({
    id,
    name: requiredText(payload.name, `release asset ${id} name`),
    ...(optionalInt64(payload.size) === undefined ? {} : { size: optionalInt64(payload.size) }),
    ...(optionalInt64(payload.download_count) === undefined
      ? {}
      : { downloadCount: optionalInt64(payload.download_count) }),
    ...(optionalText(payload.browser_download_url) === undefined
      ? {}
      : { downloadUrl: optionalText(payload.browser_download_url) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    native: createGiteaReleaseEntityNative(
      "releaseAsset",
      client,
      payload as GiteaReleaseEntityPayload<TVersion, "releaseAsset">,
    ),
  });
}
