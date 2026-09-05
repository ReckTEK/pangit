import type { GiteaProviderTypes } from "../provider-types.ts";
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
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requestGitea, requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyGiteaComment,
  invariant,
  isCommentPayload,
  parsePositiveInt64,
} from "./validate-payload.ts";

import { normalizeGiteaIssueComment } from "./normalize.ts";

import { getGiteaIssueComment } from "./read-comments.ts";

/** Add one comment directly to a known issue. */
export async function createGiteaIssueComment<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  issue: IssueData<"gitea", TVersion, GiteaProviderTypes>,
  input: IssueCommentInput,
  options: OperationOptions = {},
): Promise<IssueCommentData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "createIssueComment", native: "issueCreateComment" } as const;
  const body = requireIdentity(input.body, "issue comment body");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaComment, TVersion>(
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
  return normalizeGiteaIssueComment(client, payload);
}

/** Edit one comment directly; refresh it only when Gitea returns its documented empty 204. */
export async function updateGiteaIssueComment<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  comment: IssueCommentData<"gitea", TVersion, GiteaProviderTypes>,
  input: IssueCommentInput,
  options: OperationOptions = {},
): Promise<IssueCommentData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "updateIssueComment", native: "issueEditComment" } as const;
  const body = requireIdentity(input.body, "issue comment body");
  const id = parsePositiveInt64(comment.id, "issue comment id");
  const client = await context.client();
  const response = await requestGitea(
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
  if (isCommentPayload(response.body)) return normalizeGiteaIssueComment(client, response.body);
  if (response.body !== undefined) {
    throw invariant(context, operation.universal, "returned malformed comment data", response);
  }
  return await getGiteaIssueComment(context, repository, comment.id, options, {
    universal: operation.universal,
    native: "issueGetComment",
  });
}

/** Delete one known issue comment directly without a lookup. */
export async function deleteGiteaIssueComment<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  comment: IssueCommentData<"gitea", TVersion, GiteaProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteIssueComment", native: "issueDeleteComment" } as const;
  const client = await context.client();
  await requestGitea(
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
