import type {
  IssueCommentData,
  IssueData,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type ResolvedPageRequest,
  type ScanPage,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyGiteaComment,
  isCommentPayload,
  optionalText,
  parsePositiveInt64,
  requireCommentArray,
} from "./validate-payload.ts";
import { normalizeGiteaIssueComment } from "./normalize.ts";

/**
 * Inspect one bounded repository-comment page and retain only comments belonging to this issue.
 * `complete` becomes true only when the provider proves there is no following repository page.
 */
export async function listGiteaIssueComments<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  issue: IssueData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<ScanPage<IssueCommentData<"gitea", TVersion>>> {
  const operation = {
    universal: "listIssueComments",
    native: "issueGetRepoComments",
  } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.issueGetRepoComments(
        {
          path: repositoryPath(repository),
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireCommentArray(context, operation.universal, response);
  const pagination = giteaPagination(
    context,
    operation,
    response,
    cursor,
    limit,
    payloads.length,
  );
  const items = payloads
    .filter((payload) => commentBelongsToIssue(payload, repository, issue.number))
    .map((payload) => normalizeGiteaIssueComment(client, payload));
  return Object.freeze({
    ...createPage(
      items,
      pagination.nextCursor === undefined ? {} : {
        nextCursor: pagination.nextCursor,
      },
    ),
    complete: pagination.nextCursor === undefined,
  });
}

/** Fetch one comment directly by repository and comment ID. */
export async function getGiteaIssueComment<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  id: string,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "getIssueComment",
    native: "issueGetComment",
  },
): Promise<IssueCommentData<"gitea", TVersion>> {
  const commentId = parsePositiveInt64(id, "issue comment id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaComment, TVersion>(
    context,
    operation,
    () =>
      client.issueGetComment(
        { path: { ...repositoryPath(repository), id: commentId } },
        requestOptions(options.signal),
      ),
    options.signal,
    isCommentPayload,
  );
  return normalizeGiteaIssueComment(client, payload);
}

function commentBelongsToIssue<TVersion extends GiteaVersion>(
  comment: AnyGiteaComment,
  repository: RepositoryData<"gitea", TVersion>,
  issueNumber: number,
): boolean {
  const raw = optionalText(comment.issue_url);
  if (raw === undefined) return false;
  try {
    const segments = new URL(raw, "http://gitea.invalid").pathname.split("/").filter(Boolean).map(
      decodeURIComponent,
    );
    const tail = segments.slice(-4);
    return tail.length === 4 && tail[0] === repository.owner && tail[1] === repository.name &&
      tail[2] === "issues" && tail[3] === String(issueNumber);
  } catch {
    return false;
  }
}
