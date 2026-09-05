import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import {
  array,
  call,
  extra,
  id,
  object,
  optional,
  page,
  required,
  text,
} from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { door } from "../native/door.ts";

import { NotFoundError } from "../../../fluent-api/adapter-contract/errors.ts";
import { container } from "./normalize.ts";
export function repositoryContainers<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "listRepositoryContainers" | "getRepositoryContainer"> {
  const ops: Pick<Adapter<V>, "listRepositoryContainers" | "getRepositoryContainer"> = {
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
  };
  return ops;
}
