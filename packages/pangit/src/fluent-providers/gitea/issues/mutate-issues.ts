import type { GiteaProviderTypes } from "../provider-types.ts";
import type {
  CreateIssueInput,
  IssueData,
  IssueState,
  IssueUpdateOptions,
  UpdateIssueInput,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyGiteaIssue,
  isIssuePayload,
  optionalIdentity,
  requireNonNegativeInteger,
} from "./validate-payload.ts";

import { normalizeGiteaIssue } from "./normalize.ts";

/** Create one issue using only common title and description fields. */
export async function createGiteaIssue<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  input: CreateIssueInput,
  options: OperationOptions = {},
): Promise<IssueData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "createIssue", native: "issueCreateIssue" } as const;
  const title = requireIdentity(input.title, "issue title");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaIssue, TVersion>(
    context,
    operation,
    () =>
      client.issueCreateIssue(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              title,
              ...(input.description === undefined ? {} : { body: input.description }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isIssuePayload,
  );
  return normalizeGiteaIssue(client, payload);
}

/** Update common issue fields with an optional, typed Gitea content-version guard. */
export async function updateGiteaIssue<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  issue: IssueData<"gitea", TVersion, GiteaProviderTypes>,
  input: UpdateIssueInput,
  options: IssueUpdateOptions<"gitea", GiteaProviderTypes> = {},
): Promise<IssueData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "updateIssue", native: "issueEditIssue" } as const;
  if (input.title === undefined && input.description === undefined) {
    throw new TypeError("issue update requires a title or description");
  }
  const title = optionalIdentity(input.title, "issue title");
  const contentVersion = options.extension?.contentVersion;
  if (contentVersion !== undefined) requireNonNegativeInteger(contentVersion, "content version");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaIssue, TVersion>(
    context,
    operation,
    () =>
      client.issueEditIssue(
        {
          path: {
            ...repositoryPath(repository),
            index: requirePositiveInteger(issue.number, "issue number"),
          },
          body: {
            mediaType: "application/json",
            value: {
              ...(title === undefined ? {} : { title }),
              ...(input.description === undefined ? {} : { body: input.description }),
              ...(contentVersion === undefined ? {} : { content_version: contentVersion }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isIssuePayload,
  );
  return normalizeGiteaIssue(client, payload);
}

/** Close or reopen one known issue with a single direct mutation. */
export async function setGiteaIssueState<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  issue: IssueData<"gitea", TVersion, GiteaProviderTypes>,
  state: IssueState,
  options: OperationOptions = {},
): Promise<IssueData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "setIssueState", native: "issueEditIssue" } as const;
  if (state !== "open" && state !== "closed") throw new TypeError("invalid issue state");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaIssue, TVersion>(
    context,
    operation,
    () =>
      client.issueEditIssue(
        {
          path: {
            ...repositoryPath(repository),
            index: requirePositiveInteger(issue.number, "issue number"),
          },
          body: { mediaType: "application/json", value: { state } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isIssuePayload,
  );
  return normalizeGiteaIssue(client, payload);
}
