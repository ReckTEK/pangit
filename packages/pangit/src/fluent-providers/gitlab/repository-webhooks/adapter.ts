import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { body, call, numericId, object, page, path } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { hook } from "./normalize.ts";
import { hookInput } from "./input.ts";

export function repositoryWebhooks<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "repositoryWebhookSupport"
  | "listRepositoryWebhooks"
  | "getRepositoryWebhook"
  | "createRepositoryWebhook"
  | "updateRepositoryWebhook"
  | "deleteRepositoryWebhook"
> {
  const ops: Pick<
    Adapter<V>,
    | "repositoryWebhookSupport"
    | "listRepositoryWebhooks"
    | "getRepositoryWebhook"
    | "createRepositoryWebhook"
    | "updateRepositoryWebhook"
    | "deleteRepositoryWebhook"
  > = {
    repositoryWebhookSupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        list: "one-page",
        get: "direct",
        create: "direct",
        update: "direct",
        delete: "direct",
      }),
      providerConfiguration: "native-only",
      deliveryInspection: "native-only",
      testDelivery: "native-only",
    }),
    listRepositoryWebhooks: (r, q) =>
      page(
        c,
        "listRepositoryWebhooks",
        "getApiV4ProjectsIdHooks",
        { path: path(r) },
        q,
        (p) => hook(c, p),
      ),
    getRepositoryWebhook: async (r, n, o) =>
      hook(
        c,
        object(
          c,
          "getRepositoryWebhook",
          (await call(c, "getRepositoryWebhook", "getApiV4ProjectsIdHooksHookId", {
            path: { ...path(r), hook_id: numericId(c, "getRepositoryWebhook", n) },
          }, o)).body,
        ),
      ),
    createRepositoryWebhook: async (r, i, o) =>
      hook(
        c,
        object(
          c,
          "createRepositoryWebhook",
          (await call(c, "createRepositoryWebhook", "postApiV4ProjectsIdHooks", {
            path: path(r),
            body: body({ ...hookInput(c, i), url: i.url.toString(), token: i.secret }),
          }, o)).body,
        ),
      ),
    updateRepositoryWebhook: async (r, h, i, o) =>
      hook(
        c,
        object(
          c,
          "updateRepositoryWebhook",
          (await call(c, "updateRepositoryWebhook", "putApiV4ProjectsIdHooksHookId", {
            path: { ...path(r), hook_id: numericId(c, "updateRepositoryWebhook", h.id) },
            body: body({ ...hookInput(c, i), url: i.url?.toString() ?? h.url }),
          }, o)).body,
        ),
      ),
    deleteRepositoryWebhook: async (r, h, o) => {
      await call(c, "deleteRepositoryWebhook", "deleteApiV4ProjectsIdHooksHookId", {
        path: { ...path(r), hook_id: numericId(c, "deleteRepositoryWebhook", h.id) },
      }, o);
    },
  };
  return ops;
}
