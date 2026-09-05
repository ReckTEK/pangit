import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type {
  ReleaseAssetData,
  ReleaseData,
} from "../../../fluent-api/adapter-contract/optional/releases.ts";
import {
  body,
  call,
  type Dto,
  extra,
  id,
  invalid,
  numericId,
  object,
  page,
  path,
  required,
  text,
  unavailable,
} from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { door } from "../native/door.ts";
async function release<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<ReleaseData<"gitlab", V, GitLabProviderTypes>> {
  const tagName = required(c, "normalizeRelease", p.tag_name);
  return Object.freeze({
    id: tagName,
    tagName,
    name: text(p.name),
    description: text(p.description),
    author: p.author ? text(object(c, "normalizeRelease", p.author).username) : undefined,
    draft: false,
    prerelease: false,
    target: p.commit ? text(object(c, "normalizeRelease", p.commit).id) : undefined,
    createdAt: text(p.created_at),
    publishedAt: text(p.released_at),
    url: p._links ? text(object(c, "normalizeRelease", p._links).self) : undefined,
    native: await door(c, "release", p),
  });
}
async function asset<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<ReleaseAssetData<"gitlab", V, GitLabProviderTypes>> {
  return Object.freeze({
    id: id(c, "normalizeReleaseAsset", p.id),
    name: required(c, "normalizeReleaseAsset", p.name),
    downloadUrl: text(p.direct_asset_url) ?? text(p.url),
    native: await door(c, "releaseAsset", p),
  });
}
function modes(
  c: GitLabAdapterContext<GitLabVersion>,
  i: { draft?: boolean; prerelease?: boolean },
) {
  if (i.draft || i.prerelease) {
    unavailable(c, "releases", "GitLab releases do not have draft or prerelease modes");
  }
}
export function releases<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "releaseSupport"
    | "listReleases"
    | "getRelease"
    | "getReleaseByTag"
    | "createRelease"
    | "updateRelease"
    | "deleteRelease"
    | "listReleaseAssets"
    | "getReleaseAsset"
    | "uploadReleaseAsset"
    | "updateReleaseAsset"
    | "deleteReleaseAsset"
  > = {
    releaseSupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        list: "one-page",
        get: "direct",
        "get-by-tag": "direct",
        create: "direct",
        update: "direct",
        delete: "direct",
        "list-assets": "bounded",
        "get-asset": "direct",
        "upload-asset": "bounded",
        "update-asset": "direct",
        "delete-asset": "direct",
      }),
      signing: "native-only",
    }),
    listReleases: (r, q) =>
      page(
        c,
        "listReleases",
        "getApiV4ProjectsIdReleases",
        { path: path(r) },
        q,
        (p) => release(c, p),
      ),
    getRelease: (r, n, o) => ops.getReleaseByTag(r, n, o),
    getReleaseByTag: async (r, tag, o) =>
      release(
        c,
        object(
          c,
          "getReleaseByTag",
          (await call(c, "getReleaseByTag", "getApiV4ProjectsIdReleasesTagName", {
            path: { ...path(r), tag_name: tag },
          }, o)).body,
        ),
      ),
    createRelease: async (r, i, o) => {
      modes(c, i);
      return await release(
        c,
        object(
          c,
          "createRelease",
          (await call(c, "createRelease", "postApiV4ProjectsIdReleases", {
            path: path(r),
            body: body({
              tag_name: i.tagName,
              name: i.name,
              description: i.description ?? "",
              ref: i.target,
            }),
          }, o)).body,
        ),
      );
    },
    updateRelease: async (r, p, i, o) => {
      modes(c, i);
      return await release(
        c,
        object(
          c,
          "updateRelease",
          (await call(c, "updateRelease", "putApiV4ProjectsIdReleasesTagName", {
            path: { ...path(r), tag_name: p.tagName },
            body: body({ name: i.name, description: i.description }),
          }, o)).body,
        ),
      );
    },
    deleteRelease: async (r, p, o) => {
      await call(c, "deleteRelease", "deleteApiV4ProjectsIdReleasesTagName", {
        path: { ...path(r), tag_name: p.tagName },
      }, o);
    },
    listReleaseAssets: async (r, p, o) => {
      const result: ReleaseAssetData<"gitlab", V, GitLabProviderTypes>[] = [];
      let cursor: string | undefined;
      do {
        const values = await page(
          c,
          "listReleaseAssets",
          "getApiV4ProjectsIdReleasesTagNameAssetsLinks",
          { path: { ...path(r), tag_name: p.tagName } },
          { limit: Math.min(100, o.maxItems - result.length + 1), cursor, ...o },
          (p) => asset(c, p),
        );
        result.push(...values.items);
        if (result.length > o.maxItems) invalid(c, "listReleaseAssets", "Assets exceed maxItems");
        cursor = values.nextCursor;
      } while (cursor);
      return Object.freeze(result);
    },
    getReleaseAsset: async (r, p, n, o) =>
      asset(
        c,
        object(
          c,
          "getReleaseAsset",
          (await call(c, "getReleaseAsset", "getApiV4ProjectsIdReleasesTagNameAssetsLinksLinkId", {
            path: { ...path(r), tag_name: p.tagName, link_id: numericId(c, "getReleaseAsset", n) },
          }, o)).body,
        ),
      ),
    uploadReleaseAsset: async (r, p, i, o) => {
      const upload = object(
        c,
        "uploadReleaseAsset",
        (await extra(c, "uploadReleaseAsset", "POST", "/projects/{id}/uploads", {
          path: path(r),
          body: {
            mediaType: "multipart/form-data",
            value: {
              file: new File([i.data instanceof Uint8Array ? i.data.slice() : i.data], i.name),
            },
          },
        }, o)).body,
      );
      const url = new URL(required(c, "uploadReleaseAsset", upload.full_path), c.webBaseUrl()).href;
      return await asset(
        c,
        object(
          c,
          "uploadReleaseAsset",
          (await call(c, "uploadReleaseAsset", "postApiV4ProjectsIdReleasesTagNameAssetsLinks", {
            path: { ...path(r), tag_name: p.tagName },
            body: body({ name: i.name, url }),
          }, o)).body,
        ),
      );
    },
    updateReleaseAsset: async (r, p, a, i, o) =>
      asset(
        c,
        object(
          c,
          "updateReleaseAsset",
          (await call(
            c,
            "updateReleaseAsset",
            "putApiV4ProjectsIdReleasesTagNameAssetsLinksLinkId",
            {
              path: {
                ...path(r),
                tag_name: p.tagName,
                link_id: numericId(c, "updateReleaseAsset", a.id),
              },
              body: body({ name: i.name }),
            },
            o,
          )).body,
        ),
      ),
    deleteReleaseAsset: async (r, p, a, o) => {
      await call(c, "deleteReleaseAsset", "deleteApiV4ProjectsIdReleasesTagNameAssetsLinksLinkId", {
        path: {
          ...path(r),
          tag_name: p.tagName,
          link_id: numericId(c, "deleteReleaseAsset", a.id),
        },
      }, o);
    },
  };
  return ops;
}
