import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import type {
  PackageVersionData,
  PackageVersionIdentity,
} from "../../fluent-api/adapter-contract/optional/packages.ts";
import { NotFoundError } from "../../fluent-api/adapter-contract/errors.ts";
import {
  type Adapter,
  call,
  context,
  door,
  type Dto,
  id,
  invalid,
  number,
  numericId,
  object,
  optional,
  page,
  required,
  text,
} from "./shared.ts";
import { gitlabPackageSupport } from "./support.ts";
const formats = [
  "composer",
  "conan",
  "generic",
  "golang",
  "helm",
  "maven",
  "npm",
  "nuget",
  "pypi",
  "terraform_module",
  "rpm",
  "debian",
  "cargo",
  "ml_model",
] as const;
function format(c: GitLabAdapterContext<GitLabVersion>, value: string | undefined) {
  if (value === undefined) return undefined;
  if (!(formats as readonly string[]).includes(value)) {
    invalid(c, "packages", "Unsupported GitLab package format");
  }
  return value as typeof formats[number];
}
async function pkg<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  owner: string,
  p: Dto,
): Promise<PackageVersionData<"gitlab", V>> {
  return Object.freeze({
    id: id(c, "normalizePackage", p.id),
    owner,
    type: required(c, "normalizePackage", p.package_type),
    name: required(c, "normalizePackage", p.name),
    version: required(c, "normalizePackage", p.version),
    createdAt: text(p.created_at),
    repositoryFullName: owner,
    url: p._links ? text(object(c, "normalizePackage", p._links).web_path) : undefined,
    native: await door(c, "package", p),
  });
}
export function packages<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const find = async (i: PackageVersionIdentity, o: { signal?: AbortSignal } = {}) => {
    let cursor: string | undefined;
    let inspected = 0;
    let found: PackageVersionData<"gitlab", V> | undefined;
    do {
      const values = await page(
        c,
        "findPackageVersion",
        "getApiV4ProjectsIdPackages",
        {
          path: { id: i.owner },
          query: {
            package_name: i.name,
            package_type: format(c, i.type),
            package_version: i.version,
          },
        },
        { limit: 100, cursor, ...o },
        (p) => pkg(c, i.owner, p),
      );
      const matches = values.items.filter((p) =>
        p.name === i.name && p.type === i.type && p.version === i.version
      );
      if (matches.length > 1 || matches.length && found) {
        invalid(c, "findPackageVersion", "GitLab returned ambiguous package coordinates");
      }
      if (matches.length) found = matches[0];
      inspected += values.items.length;
      cursor = values.nextCursor;
      if (inspected >= 1000 && cursor) {
        invalid(c, "findPackageVersion", "Package lookup exceeds 1000 entries");
      }
    } while (cursor);
    return found;
  };
  const ops: Pick<
    Adapter<V>,
    | "packageSupport"
    | "listPackages"
    | "listPackageVersions"
    | "getPackageVersion"
    | "findPackageVersion"
    | "listPackageFiles"
    | "deletePackageVersion"
    | "deletePackage"
  > = {
    packageSupport: gitlabPackageSupport,
    listPackages: (owner, q) =>
      page(
        c,
        "listPackages",
        "getApiV4ProjectsIdPackages",
        { path: { id: owner }, query: { package_name: q.query, package_type: format(c, q.type) } },
        q,
        (p) => pkg(c, owner, p),
      ),
    listPackageVersions: async (i, q) => {
      const result = await page(
        c,
        "listPackageVersions",
        "getApiV4ProjectsIdPackages",
        { path: { id: i.owner }, query: { package_name: i.name, package_type: format(c, i.type) } },
        q,
        (p) => pkg(c, i.owner, p),
      );
      return Object.freeze({
        ...result,
        items: Object.freeze(result.items.filter((p) => p.name === i.name && p.type === i.type)),
        totalCount: undefined,
      });
    },
    findPackageVersion: (i, o) => optional(() => find(i, o)),
    getPackageVersion: async (i, o) => {
      const found = await find(i, o);
      if (!found) {
        throw new NotFoundError("Package version was not found", {
          ...context(c, "getPackageVersion"),
          status: 404,
        });
      }
      return found;
    },
    listPackageFiles: async (i, o) => {
      const version = await ops.getPackageVersion(i, o);
      const result:
        import("../../fluent-api/adapter-contract/optional/packages.ts").PackageFileData<
          "gitlab",
          V
        >[] = [];
      let cursor: string | undefined;
      do {
        const values = await page(
          c,
          "listPackageFiles",
          "getApiV4ProjectsIdPackagesPackageIdPackageFiles",
          { path: { id: i.owner, package_id: numericId(c, "listPackageFiles", version.id) } },
          { limit: Math.min(100, o.maxFiles - result.length + 1), cursor, ...o },
          async (p) =>
            Object.freeze({
              id: id(c, "normalizePackageFile", p.id),
              name: required(c, "normalizePackageFile", p.file_name),
              size: number(c, "normalizePackageFile", p.size),
              digests: Object.freeze({
                md5: text(p.file_md5),
                sha1: text(p.file_sha1),
                sha256: text(p.file_sha256),
              }),
              native: await door(c, "packageFile", p),
            }),
        );
        result.push(...values.items);
        if (result.length > o.maxFiles) {
          invalid(c, "listPackageFiles", "Package files exceed maxFiles");
        }
        cursor = values.nextCursor;
      } while (cursor);
      return Object.freeze(result);
    },
    deletePackageVersion: async (i, o) => {
      const version = await ops.getPackageVersion(i, o);
      await call(c, "deletePackageVersion", "deleteApiV4ProjectsIdPackagesPackageId", {
        path: { id: i.owner, package_id: numericId(c, "deletePackageVersion", version.id) },
      }, o);
    },
    deletePackage: async (i, o) => {
      // Snapshot all exact matching IDs before deleting, so offset pagination cannot skip versions.
      const ids: string[] = [];
      let pages = 0;
      let cursor: string | undefined;
      do {
        const values = await ops.listPackageVersions(i, { limit: 100, cursor, ...o });
        ids.push(...values.items.map((p) => p.id));
        cursor = values.nextCursor;
        if (++pages >= 10 && cursor || ids.length > 1000) {
          invalid(c, "deletePackage", "Package deletion exceeds 1000 versions");
        }
      } while (cursor);
      for (const packageId of ids) {
        await call(c, "deletePackage", "deleteApiV4ProjectsIdPackagesPackageId", {
          path: { id: i.owner, package_id: numericId(c, "deletePackage", packageId) },
        }, o);
      }
    },
  };
  return ops;
}
