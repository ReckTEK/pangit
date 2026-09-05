import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import type {
  RepositoryContainerData,
  RepositoryData,
} from "../../fluent-api/adapter-contract/repositories.ts";
import {
  type Adapter,
  array,
  body,
  call,
  door,
  type Dto,
  extra,
  extraPage,
  id,
  invalid,
  numericId,
  object,
  optional,
  page,
  path,
  required,
  text,
} from "./shared.ts";
import { pollGitLab } from "./response.ts";
import { commitFiles } from "./content.ts";
import { NotFoundError } from "../../fluent-api/adapter-contract/errors.ts";

export async function repository<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<RepositoryData<"gitlab", V>> {
  const fullName = required(c, "normalizeRepository", p.path_with_namespace);
  const split = fullName.lastIndexOf("/");
  if (split < 1) invalid(c, "normalizeRepository", "Project has no namespace");
  const parent = p.forked_from_project
    ? object(c, "normalizeRepository", p.forked_from_project)
    : undefined;
  const parentName = parent && required(c, "normalizeRepository", parent.path_with_namespace);
  return Object.freeze({
    id: id(c, "normalizeRepository", p.id),
    owner: fullName.slice(0, split),
    name: fullName.slice(split + 1),
    fullName,
    description: text(p.description),
    defaultBranch: text(p.default_branch),
    private: p.visibility === "private",
    url: text(p.web_url),
    ...(parent && parentName
      ? {
        parent: {
          provider: "gitlab" as const,
          id: id(c, "normalizeRepository", parent.id),
          owner: parentName.slice(0, parentName.lastIndexOf("/")),
          name: parentName.slice(parentName.lastIndexOf("/") + 1),
          fullName: parentName,
        },
      }
      : {}),
    native: await door(c, "repository", p),
  });
}
async function container<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<RepositoryContainerData<"gitlab", V>> {
  if (p.kind !== "user" && p.kind !== "group") {
    invalid(c, "normalizeContainer", "Unsupported GitLab namespace kind");
  }
  return Object.freeze({
    id: id(c, "normalizeContainer", p.id),
    kind: p.kind,
    name: required(c, "normalizeContainer", p.full_path),
    displayName: text(p.name),
    native: await door(c, "repositoryContainer", p),
  });
}
export function repositories<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "listRepositoryContainers"
    | "getRepositoryContainer"
    | "listRepositories"
    | "getRepository"
    | "findRepository"
    | "hasRepository"
    | "createRepository"
    | "renameRepository"
    | "deleteRepository"
    | "listForks"
    | "createFork"
  > = {
    listRepositoryContainers: (q) =>
      page(c, "listRepositoryContainers", "getApiV4Namespaces", {}, q, (p) => container(c, p)),
    getRepositoryContainer: async (name, o) => {
      try {
        return await container(
          c,
          object(
            c,
            "getRepositoryContainer",
            (await call(
              c,
              "getRepositoryContainer",
              "getApiV4NamespacesId",
              { path: { id: name } },
              o,
            )).body,
          ),
        );
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error;
        // Namespace administration visibility is narrower than project access. A project
        // collaborator can still address another user's projects through the public user.
        if (!name.includes("/")) {
          const users = array(
            c,
            "getRepositoryContainer",
            (await extra(
              c,
              "getRepositoryContainer",
              "GET",
              "/users",
              { query: { username: name } },
              o,
            )).body,
          );
          const user = users.find((p) => text(p.username)?.toLowerCase() === name.toLowerCase());
          if (user) {
            return Object.freeze({
              id: `user:${id(c, "getRepositoryContainer", user.id)}`,
              kind: "user" as const,
              name: required(c, "getRepositoryContainer", user.username),
              displayName: text(user.name),
              native: await door(c, "repositoryContainer", user),
            });
          }
        }
        const group = await optional(async () =>
          object(
            c,
            "getRepositoryContainer",
            (await call(
              c,
              "getRepositoryContainer",
              "getApiV4GroupsId",
              { path: { id: name } },
              o,
            )).body,
          )
        );
        if (!group) throw error;
        return Object.freeze({
          id: id(c, "getRepositoryContainer", group.id),
          kind: "group" as const,
          name: required(c, "getRepositoryContainer", group.full_path),
          displayName: text(group.name),
          native: await door(c, "repositoryContainer", group),
        });
      }
    },
    listRepositories: (ns, q) =>
      ns.kind === "group"
        ? page(
          c,
          "listRepositories",
          "getApiV4GroupsIdProjects",
          { path: { id: ns.id }, query: { include_subgroups: false, with_shared: false } },
          q,
          (p) => repository(c, p),
        )
        : extraPage(
          c,
          "listRepositories",
          "/users/{id}/projects",
          { path: { id: ns.name } },
          q,
          (p) => repository(c, p),
        ),
    getRepository: async (ns, name, o) =>
      repository(
        c,
        object(
          c,
          "getRepository",
          (await call(c, "getRepository", "getApiV4ProjectsId", {
            path: { id: `${ns.name}/${name}` },
          }, o)).body,
        ),
      ),
    findRepository: (ns, name, o) => optional(() => ops.getRepository(ns, name, o)),
    hasRepository: async (ns, name, o) => (await ops.findRepository(ns, name, o)) !== undefined,
    createRepository: async (ns, name, o) => {
      const files = o.files ?? [];
      // A user identity is not a namespace ID. Resolve write authority explicitly.
      const namespaceId = ns.id.startsWith("user:")
        ? id(
          c,
          "createRepository",
          object(
            c,
            "createRepository",
            (await call(
              c,
              "createRepository",
              "getApiV4NamespacesId",
              { path: { id: ns.name } },
              o,
            )).body,
          ).id,
        )
        : ns.id;
      const p = object(
        c,
        "createRepository",
        (await call(c, "createRepository", "postApiV4Projects", {
          body: body({
            name,
            path: name,
            namespace_id: numericId(c, "createRepository", namespaceId),
            description: o.description,
            visibility: o.private ? "private" as const : "public" as const,
            initialize_with_readme: (o.initialize ?? false) && files.length === 0,
            default_branch: o.defaultBranch ?? "main",
          }),
        }, o)).body,
      );
      let r = await repository(c, p);
      if (files.length) {
        await commitFiles(c, r, {
          branch: o.defaultBranch ?? "main",
          message: o.initialCommitMessage ?? "Initial commit",
          changes: files.map((f) => ({
            operation: "create" as const,
            path: f.path,
            content: f.content,
          })),
        }, o);
        r = await ops.getRepository(ns, name, o);
      }
      return r;
    },
    renameRepository: async (r, name, o) =>
      repository(
        c,
        object(
          c,
          "renameRepository",
          (await call(c, "renameRepository", "putApiV4ProjectsId", {
            path: path(r),
            body: body({ name, path: name }),
          }, o)).body,
        ),
      ),
    deleteRepository: async (r, o) => {
      await call(c, "deleteRepository", "deleteApiV4ProjectsId", { path: path(r) }, o);
    },
    listForks: (r, q) =>
      page(
        c,
        "listForks",
        "getApiV4ProjectsIdForks",
        { path: path(r) },
        q,
        (p) => repository(c, p),
      ),
    createFork: async (r, o) => {
      const p = object(
        c,
        "createFork",
        (await call(c, "createFork", "postApiV4ProjectsIdFork", {
          path: path(r),
          body: body({
            namespace_path: o.destination.name,
            name: o.name,
            path: o.name,
          }),
        }, o)).body,
      );
      const forkId = id(c, "createFork", p.id);
      const intervalMs = o.pollIntervalMs ?? 200;
      if (intervalMs <= 0) invalid(c, "createFork", "pollIntervalMs must be positive");
      return await pollGitLab(c, { universal: "createFork" }, {
        attempts: Math.ceil((o.timeoutMs ?? 30000) / intervalMs),
        intervalMs,
        signal: o.signal,
      }, async () => {
        const fresh = object(
          c,
          "createFork",
          (await call(c, "createFork", "getApiV4ProjectsId", { path: { id: forkId } }, o)).body,
        );
        if (fresh.import_status === "failed") invalid(c, "createFork", "GitLab fork import failed");
        return fresh.import_status === "finished" || fresh.import_status === "none"
          ? await repository(c, fresh)
          : undefined;
      });
    },
  };
  return ops;
}
