import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import { rejectGitLabProtectionDefect } from "../known-defects.ts";

import type { BranchRuleData } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import {
  array,
  body,
  call,
  id,
  invalid,
  numericId,
  object,
  page,
  path,
  unavailable,
} from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { rule } from "./normalize.ts";
import { ruleInput } from "./input.ts";

export function branchRules<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "branchRuleSupport"
  | "listBranchRules"
  | "getBranchRule"
  | "createBranchRule"
  | "updateBranchRule"
  | "deleteBranchRule"
  | "getEffectiveBranchProtection"
  | "setBranchRuleOrder"
> {
  const ops: Pick<
    Adapter<V>,
    | "branchRuleSupport"
    | "listBranchRules"
    | "getBranchRule"
    | "createBranchRule"
    | "updateBranchRule"
    | "deleteBranchRule"
    | "getEffectiveBranchProtection"
    | "setBranchRuleOrder"
  > = {
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
      const values: BranchRuleData<"gitlab", V, GitLabProviderTypes>[] = [];
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
