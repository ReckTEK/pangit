import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const releases = {
  title: "repo.releases",
  source: "fluent-api/capabilities/optional/RepositoryReleases.ts",
  methods: {
    "list": "list(request?) \u2192 Page<Release>. Fetch one page of releases.",
    "get": "get(id, options?) \u2192 Release. Fetch by returned release ID.",
    "getByTag": "getByTag(tagName, options?) \u2192 Release. Fetch the release attached to a tag.",
    "create":
      "create({ tagName, name?, description?, draft?, prerelease?, target? }, options?) \u2192 Release. Draft and prerelease are unavailable on GitLab.",
    "update":
      "update(release, { name?, description?, draft?, prerelease? }, options?) \u2192 Release. Return a new snapshot.",
    "delete": "delete(release, options?) \u2192 void. Delete the release.",
  } satisfies MethodDescriptions<api.RepositoryReleases<"gitea", "1.27.2">>,
};

export const assets = {
  title: "repo.releases.assets",
  source: "fluent-api/capabilities/optional/RepositoryReleases.ts",
  methods: {
    "list":
      "list(release, { maxItems, signal? }) \u2192 readonly ReleaseAsset[]. Explicitly bound the unpaged result.",
    "get": "get(release, id, options?) \u2192 ReleaseAsset. Fetch one asset.",
    "upload":
      "upload(release, { name, data }, options?) \u2192 ReleaseAsset. Data may be ArrayBuffer, Uint8Array, or a web Blob.",
    "update": "update(release, asset, { name }, options?) \u2192 ReleaseAsset. Rename an asset.",
    "delete":
      "delete(release, asset, options?) \u2192 void. Delete the release asset; on GitLab this removes its link, not the underlying project upload.",
  } satisfies MethodDescriptions<api.RepositoryReleases<"gitea", "1.27.2">["assets"]>,
};

export const packages = {
  title: "git.packages",
  source: "fluent-api/capabilities/optional/Packages.ts",
  methods: {
    "list":
      "list(owner, { query?, type?, limit?, cursor?, signal? }) \u2192 Page<PackageVersion>. List versions owned by an account or GitLab project.",
    "versions":
      "versions({ owner, type, name }, request?) \u2192 Page<PackageVersion>. List versions of one package.",
    "get":
      "get({ owner, type, name, version }, options?) \u2192 PackageVersion. Read an exact version.",
    "find":
      "find(identity, options?) \u2192 PackageVersion | undefined. Return undefined only for a missing version.",
    "files":
      "files(identity, { maxFiles, signal? }) \u2192 readonly PackageFile[]. Inspect names, sizes, and available digests within an explicit bound.",
    "deleteVersion": "deleteVersion(identity, options?) \u2192 void. Remove an exact version.",
    "delete":
      "delete({ owner, type, name }, options?) \u2192 void. Remove the package and its versions.",
  } satisfies MethodDescriptions<api.Packages<"gitea", "1.27.2">>,
};
