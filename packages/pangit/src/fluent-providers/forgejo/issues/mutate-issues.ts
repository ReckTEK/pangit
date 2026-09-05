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
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyForgejoIssue, isIssuePayload, optionalIdentity } from "./validate-payload.ts";

import { normalizeForgejoIssue } from "./normalize.ts";

/** Create one issue using only common title and description fields. */
export async function createForgejoIssue<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  input: CreateIssueInput,
  options: OperationOptions = {},
): Promise<IssueData<"forgejo", TVersion>> {
  const operation = { universal: "createIssue", native: "issueCreateIssue" } as const;
  const title = requireIdentity(input.title, "issue title");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoIssue, TVersion>(
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
  return normalizeForgejoIssue(client, payload);
}

/** Update common issue fields with an optional, typed Forgejo content-version guard. */
export async function updateForgejoIssue<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  issue: IssueData<"forgejo", TVersion>,
  input: UpdateIssueInput,
  options: IssueUpdateOptions<"forgejo"> = {},
): Promise<IssueData<"forgejo", TVersion>> {
  const operation = { universal: "updateIssue", native: "issueEditIssue" } as const;
  if (input.title === undefined && input.description === undefined) {
    throw new TypeError("issue update requires a title or description");
  }
  const title = optionalIdentity(input.title, "issue title");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoIssue, TVersion>(
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
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isIssuePayload,
  );
  return normalizeForgejoIssue(client, payload);
}

/** Close or reopen one known issue with a single direct mutation. */
export async function setForgejoIssueState<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  issue: IssueData<"forgejo", TVersion>,
  state: IssueState,
  options: OperationOptions = {},
): Promise<IssueData<"forgejo", TVersion>> {
  const operation = { universal: "setIssueState", native: "issueEditIssue" } as const;
  if (state !== "open" && state !== "closed") throw new TypeError("invalid issue state");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoIssue, TVersion>(
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
  return normalizeForgejoIssue(client, payload);
}
