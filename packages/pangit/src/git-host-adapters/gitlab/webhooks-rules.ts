import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import { rejectGitLabProtectionDefect } from "./known-defects.ts";
import type {
  RepositoryWebhookData,
  RepositoryWebhookEvent,
  UpdateRepositoryWebhookInput,
} from "../../fluent-api/adapter-contract/optional/repository-webhooks.ts";
import type {
  BranchRuleData,
  BranchRuleFields,
} from "../../fluent-api/adapter-contract/optional/branch-rules.ts";
import {
  type Adapter,
  array,
  body,
  call,
  door,
  type Dto,
  id,
  invalid,
  numericId,
  object,
  page,
  path,
  required,
  text,
  unavailable,
} from "./shared.ts";
const events = {
  push: "push_events",
  "pull-request": "merge_requests_events",
  issue: "issues_events",
  release: "releases_events",
} as const;
async function hook<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<RepositoryWebhookData<"gitlab", V>> {
  return Object.freeze({
    id: id(c, "normalizeWebhook", p.id),
    url: required(c, "normalizeWebhook", p.url),
    name: text(p.name),
    active: p.alert_status !== "disabled" && !p.disabled_until,
    events: Object.freeze(
      (Object.keys(events) as RepositoryWebhookEvent[]).filter((e) => p[events[e]] === true),
    ),
    providerEvents: Object.freeze(
      Object.keys(p).filter((k) => k.endsWith("_events") && p[k] === true),
    ),
    contentType: "json",
    providerContentType: "application/json",
    createdAt: text(p.created_at),
    native: await door(c, "repositoryWebhook", p),
  });
}
function hookInput(c: GitLabAdapterContext<GitLabVersion>, i: UpdateRepositoryWebhookInput) {
  if (i.active === false) {
    unavailable(c, "repositoryWebhooks", "GitLab has no portable enabled/disabled webhook toggle");
  }
  if (i.contentType && i.contentType !== "json") {
    unavailable(c, "repositoryWebhooks", "GitLab webhook payloads use JSON");
  }
  return {
    url: i.url?.toString(),
    name: i.name,
    ...(i.events
      ? Object.fromEntries(
        Object.entries(events).map((
          [key, value],
        ) => [value, i.events!.includes(key as RepositoryWebhookEvent)]),
      )
      : {}),
  };
}
async function rule<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<BranchRuleData<"gitlab", V>> {
  const levels = array(c, "normalizeBranchRule", p.push_access_levels);
  return Object.freeze({
    name: required(c, "normalizeBranchRule", p.name),
    pushAllowed: levels.some((p) => Number(p.access_level) > 0 || p.user_id || p.group_id),
    forcePushAllowed: typeof p.allow_force_push === "boolean" ? p.allow_force_push : undefined,
    statusCheckContexts: Object.freeze([]),
    native: await door(c, "configuredRule", p),
  });
}
function ruleInput(c: GitLabAdapterContext<GitLabVersion>, i: BranchRuleFields) {
  for (const key of Object.keys(i)) {
    if (key !== "pushAllowed" && key !== "forcePushAllowed" && key !== "name") {
      unavailable(
        c,
        "branchRules",
        `GitLab protected branches cannot express ${key} through the portable contract`,
      );
    }
  }
  return {
    push_access_level: i.pushAllowed === undefined
      ? undefined
      : i.pushAllowed
      ? 30 as const
      : 0 as const,
    allow_force_push: i.forcePushAllowed,
  };
}
export function webhooksRules<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "repositoryWebhookSupport"
    | "listRepositoryWebhooks"
    | "getRepositoryWebhook"
    | "createRepositoryWebhook"
    | "updateRepositoryWebhook"
    | "deleteRepositoryWebhook"
    | "branchRuleSupport"
    | "listBranchRules"
    | "getBranchRule"
    | "createBranchRule"
    | "updateBranchRule"
    | "deleteBranchRule"
    | "getEffectiveBranchProtection"
    | "setBranchRuleOrder"
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
    branchRuleSupport: Object.freeze({
      configuredRules: Object.freeze({
        supported: true,
        operations: Object.freeze({
          list: "bounded",
          get: "direct",
          create: "direct",
          update: "bounded",
          delete: "direct",
        }),
      }),
      effectiveProtection: Object.freeze({ supported: false, get: "direct" }),
      orderedPriority: "unsupported",
    }),
    listBranchRules: async (r, o) => {
      const values: BranchRuleData<"gitlab", V>[] = [];
      let cursor: string | undefined;
      do {
        const p = await page(
          c,
          "listBranchRules",
          "getApiV4ProjectsIdProtectedBranches",
          { path: path(r) },
          { limit: Math.min(100, o.maxRules - values.length + 1), cursor, ...o },
          (p) => rule(c, p),
        );
        values.push(...p.items);
        if (values.length > o.maxRules) invalid(c, "listBranchRules", "Rules exceed maxRules");
        cursor = p.nextCursor;
      } while (cursor);
      return Object.freeze(values);
    },
    getBranchRule: async (r, name, o) =>
      rule(
        c,
        object(
          c,
          "getBranchRule",
          (await call(c, "getBranchRule", "getApiV4ProjectsIdProtectedBranchesName", {
            path: { ...path(r), name },
          }, o)).body,
        ),
      ),
    createBranchRule: async (r, i, o) =>
      rule(
        c,
        object(
          c,
          "createBranchRule",
          (await call(c, "createBranchRule", "postApiV4ProjectsIdProtectedBranches", {
            path: path(r),
            body: body({ name: i.name, ...ruleInput(c, i) }),
          }, o)).body,
        ),
      ),
    updateBranchRule: async (r, b, i, o) => {
      const fields = ruleInput(c, i);
      const old = object(
        c,
        "updateBranchRule",
        (await call(c, "updateBranchRule", "getApiV4ProjectsIdProtectedBranchesName", {
          path: { ...path(r), name: b.name },
        }, o)).body,
      );
      const allowed = fields.push_access_level === undefined ? undefined : [
        ...array(c, "updateBranchRule", old.push_access_levels).map((p) => ({
          id: numericId(c, "updateBranchRule", id(c, "updateBranchRule", p.id)),
          _destroy: true,
        })),
        { access_level: fields.push_access_level },
      ];
      return await rule(
        c,
        object(
          c,
          "updateBranchRule",
          (await call(c, "updateBranchRule", "patchApiV4ProjectsIdProtectedBranchesName", {
            path: { ...path(r), name: b.name },
            body: body({ allow_force_push: i.forcePushAllowed, allowed_to_push: allowed }),
          }, o)).body,
        ),
      );
    },
    deleteBranchRule: async (r, b, o) => {
      await call(c, "deleteBranchRule", "deleteApiV4ProjectsIdProtectedBranchesName", {
        path: { ...path(r), name: b.name },
      }, o);
    },
    getEffectiveBranchProtection: async () => {
      await Promise.resolve();
      return rejectGitLabProtectionDefect(c.version);
    },
    setBranchRuleOrder: () =>
      Promise.reject(
        unavailable(
          c,
          "setBranchRuleOrder",
          "GitLab combines matching protected-branch rules without an ordered-priority API",
        ),
      ),
  };
  return ops;
}
