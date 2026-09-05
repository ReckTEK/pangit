import type { GiteaProviderTypes } from "../provider-types.ts";
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
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGitea, requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyGiteaRule, isRulePayload, requireRuleArray } from "./validate-payload.ts";
import { normalizeGiteaBranchRule } from "./normalize.ts";

/** Read Gitea's unpaginated configured-rule result once and enforce the caller's hard bound. */
export async function listGiteaBranchRules<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  options: ListBranchRulesOptions,
): Promise<readonly BranchRuleData<"gitea", TVersion, GiteaProviderTypes>[]> {
  const operation = {
    universal: "listBranchRules",
    native: "repoListBranchProtection",
  } as const;
  const maxRules = requirePositiveInteger(options.maxRules, "maximum branch rules");
  const client = await context.client();
  const response = await requestGitea(
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
        provider: "gitea",
        version: context.version,
        operation: operation.universal,
        cause: response,
      },
    );
  }
  return Object.freeze(rules.map((rule) => normalizeGiteaBranchRule(client, rule)));
}

/** Fetch one configured rule directly by its name or pattern. */
export async function getGiteaBranchRule<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  name: string,
  options: OperationOptions = {},
): Promise<BranchRuleData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getBranchRule", native: "repoGetBranchProtection" } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRule, TVersion>(
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
  return normalizeGiteaBranchRule(client, payload);
}
