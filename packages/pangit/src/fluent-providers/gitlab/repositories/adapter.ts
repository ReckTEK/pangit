import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import {
  body,
  call,
  extraPage,
  id,
  numericId,
  object,
  optional,
  page,
  path,
} from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

import { commitFiles } from "../content/mod.ts";

import { repository } from "./normalize.ts";
export function repositories<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "listRepositories"
  | "getRepository"
  | "findRepository"
  | "hasRepository"
  | "createRepository"
  | "renameRepository"
  | "deleteRepository"
> {
  const ops: Pick<
    Adapter<V>,
    | "listRepositories"
    | "getRepository"
    | "findRepository"
    | "hasRepository"
    | "createRepository"
    | "renameRepository"
    | "deleteRepository"
  > = {
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
  };
  return ops;
}
