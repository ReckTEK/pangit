import type { GiteaProviderTypes } from "../provider-types.ts";
import type { PullRequestReviewData } from "../../../fluent-api/adapter-contract/optional/pull-request-reviews.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";

import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  type AnyGiteaReview,
  isReviewPayload,
  parsePositiveInt64,
  pullRequestNumber,
  requireReviewArray,
} from "./validate-payload.ts";

import { normalizeGiteaPullRequestReview } from "./normalize.ts";

/** Fetch exactly one provider page of submitted or pending review objects. */
export async function listGiteaPullRequestReviews<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  pullRequest: PullRequestData<"gitea", TVersion, GiteaProviderTypes>,
  request: ResolvedPageRequest,
): Promise<Page<PullRequestReviewData<"gitea", TVersion, GiteaProviderTypes>>> {
  const operation = {
    universal: "listPullRequestReviews",
    native: "repoListPullReviews",
  } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoListPullReviews(
        {
          path: { ...repositoryPath(repository), index: pullRequestNumber(pullRequest) },
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireReviewArray(context, operation.universal, response.body);
  return createPage(
    payloads.map((payload) => normalizeGiteaPullRequestReview(client, payload)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one known review directly by pull-request number and review ID. */
export async function getGiteaPullRequestReview<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  pullRequest: PullRequestData<"gitea", TVersion, GiteaProviderTypes>,
  id: string,
  options: OperationOptions = {},
): Promise<PullRequestReviewData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getPullRequestReview", native: "repoGetPullReview" } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReview, TVersion>(
    context,
    operation,
    () =>
      client.repoGetPullReview(
        {
          path: {
            ...repositoryPath(repository),
            index: pullRequestNumber(pullRequest),
            id: parsePositiveInt64(id, "pull-request review id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReviewPayload,
  );
  return normalizeGiteaPullRequestReview(client, payload);
}
