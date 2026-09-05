import type { ForgejoProviderTypes } from "../provider-types.ts";
import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  BranchRuleData,
  ListBranchRulesOptions,
} from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejo, requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyForgejoRule, isRulePayload, requireRuleArray } from "./validate-payload.ts";
import { normalizeForgejoBranchRule } from "./normalize.ts";

/** Read Forgejo's unpaginated configured-rule result once and enforce the caller's hard bound. */
export async function listForgejoBranchRules<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  options: ListBranchRulesOptions,
): Promise<readonly BranchRuleData<"forgejo", TVersion, ForgejoProviderTypes>[]> {
  const operation = {
    universal: "listBranchRules",
    native: "repoListBranchProtection",
  } as const;
  const maxRules = requirePositiveInteger(options.maxRules, "maximum branch rules");
  const client = await context.client();
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.repoListBranchProtection(
        { path: repositoryPath(repository) },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  const rules = requireRuleArray(context, operation.universal, response.body);
  if (rules.length > maxRules) {
    throw new ValidationError(
      `repoListBranchProtection returned ${rules.length} rules, exceeding the ${maxRules} item limit`,
      {
        provider: "forgejo",
        version: context.version,
        operation: operation.universal,
        cause: response,
      },
    );
  }
  return Object.freeze(rules.map((rule) => normalizeForgejoBranchRule(client, rule)));
}

/** Fetch one configured rule directly by its name or pattern. */
export async function getForgejoBranchRule<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  name: string,
  options: OperationOptions = {},
): Promise<BranchRuleData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "getBranchRule", native: "repoGetBranchProtection" } as const;
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRule, TVersion>(
    context,
    operation,
    () =>
      client.repoGetBranchProtection(
        {
          path: { ...repositoryPath(repository), name: requireIdentity(name, "branch rule name") },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isRulePayload,
  );
  return normalizeForgejoBranchRule(client, payload);
}
