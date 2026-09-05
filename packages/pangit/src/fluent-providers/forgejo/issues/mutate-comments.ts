import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  IssueCommentData,
  IssueCommentInput,
  IssueData,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";
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

import {
  type AnyForgejoComment,
  invariant,
  isCommentPayload,
  parsePositiveInt64,
} from "./validate-payload.ts";

import { normalizeForgejoIssueComment } from "./normalize.ts";

import { getForgejoIssueComment } from "./read-comments.ts";

/** Add one comment directly to a known issue. */
export async function createForgejoIssueComment<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  issue: IssueData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: IssueCommentInput,
  options: OperationOptions = {},
): Promise<IssueCommentData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "createIssueComment", native: "issueCreateComment" } as const;
  const body = requireIdentity(input.body, "issue comment body");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoComment, TVersion>(
    context,
    operation,
    () =>
      client.issueCreateComment(
        {
          path: {
            ...repositoryPath(repository),
            index: requirePositiveInteger(issue.number, "issue number"),
          },
          body: { mediaType: "application/json", value: { body } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isCommentPayload,
  );
  return normalizeForgejoIssueComment(client, payload);
}

/** Edit one comment directly; refresh it only when Forgejo returns its documented empty 204. */
export async function updateForgejoIssueComment<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  comment: IssueCommentData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: IssueCommentInput,
  options: OperationOptions = {},
): Promise<IssueCommentData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "updateIssueComment", native: "issueEditComment" } as const;
  const body = requireIdentity(input.body, "issue comment body");
  const id = parsePositiveInt64(comment.id, "issue comment id");
  const client = await context.client();
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.issueEditComment(
        {
          path: { ...repositoryPath(repository), id },
          body: { mediaType: "application/json", value: { body } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  if (isCommentPayload(response.body)) return normalizeForgejoIssueComment(client, response.body);
  if (response.body !== undefined) {
    throw invariant(context, operation.universal, "returned malformed comment data", response);
  }
  return await getForgejoIssueComment(context, repository, comment.id, options, {
    universal: operation.universal,
    native: "issueGetComment",
  });
}

/** Delete one known issue comment directly without a lookup. */
export async function deleteForgejoIssueComment<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  comment: IssueCommentData<"forgejo", TVersion, ForgejoProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteIssueComment", native: "issueDeleteComment" } as const;
  const client = await context.client();
  await requestForgejo(
    context,
    operation,
    () =>
      client.issueDeleteComment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(comment.id, "issue comment id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}
