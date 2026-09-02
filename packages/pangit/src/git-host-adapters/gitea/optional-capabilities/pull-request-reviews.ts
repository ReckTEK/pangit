import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  CreatePullRequestReviewInput,
  CreatePullRequestReviewOptions,
  GiteaCreatePullRequestReviewExtension,
  GiteaPullRequestReviewEvent,
  PullRequestReviewCapabilitySupport,
  PullRequestReviewData,
  PullRequestReviewState,
  SubmitPullRequestReviewEvent,
  SubmitPullRequestReviewInput,
} from "../../../fluent-api/adapter-contract/optional/pull-request-reviews.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { ResolvedPageRequest } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaPullRequestReviewNative,
  type GiteaPullRequestReviewPayload,
} from "../native/GiteaPullRequestReviewNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../response.ts";

type AnyGiteaReview = GiteaPullRequestReviewPayload<GiteaVersion>;

export const giteaPullRequestReviewSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    list: "one-page",
    get: "direct",
    create: "direct",
    submit: "direct",
  }),
  dismissal: "provider-extension-or-native",
  replies: "provider-extension-or-native",
  resolution: "provider-extension-or-native",
  richPositions: "provider-extension-or-native",
}) satisfies PullRequestReviewCapabilitySupport;

/** Fetch exactly one provider page of submitted or pending review objects. */
export async function listGiteaPullRequestReviews<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<PullRequestReviewData<"gitea", TVersion>>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<PullRequestReviewData<"gitea", TVersion>> {
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

/** Create one pending review without provider-specific inline positions. */
export async function createGiteaPullRequestReview<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  input: CreatePullRequestReviewInput,
  options: CreatePullRequestReviewOptions<"gitea"> = {},
): Promise<PullRequestReviewData<"gitea", TVersion>> {
  const operation = {
    universal: "createPullRequestReview",
    native: "repoCreatePullReview",
  } as const;
  const extension = options.extension as GiteaCreatePullRequestReviewExtension | undefined;
  const comments = extension?.comments?.map((comment, index) => {
    const oldPosition = comment.oldPosition === undefined
      ? undefined
      : requirePositiveInteger(comment.oldPosition, `review comment ${index} old position`);
    const newPosition = comment.newPosition === undefined
      ? undefined
      : requirePositiveInteger(comment.newPosition, `review comment ${index} new position`);
    if (oldPosition === undefined && newPosition === undefined) {
      throw new TypeError(`review comment ${index} requires an old or new position`);
    }
    return {
      body: requireIdentity(comment.body, `review comment ${index} body`),
      path: requireIdentity(comment.path, `review comment ${index} path`),
      ...(oldPosition === undefined ? {} : { old_position: oldPosition }),
      ...(newPosition === undefined ? {} : { new_position: newPosition }),
    };
  });
  if (comments !== undefined && comments.length === 0) {
    throw new RangeError("Gitea review comments cannot be empty");
  }
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReview, TVersion>(
    context,
    operation,
    () =>
      client.repoCreatePullReview(
        {
          path: { ...repositoryPath(repository), index: pullRequestNumber(pullRequest) },
          body: {
            mediaType: "application/json",
            value: {
              event: giteaReviewEvent(extension?.event ?? "pending"),
              ...(input.body === undefined
                ? {}
                : { body: requireIdentity(input.body, "review body") }),
              ...(input.commitSha === undefined
                ? {}
                : { commit_id: requireIdentity(input.commitSha, "review commit SHA") }),
              ...(comments === undefined ? {} : { comments }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReviewPayload,
  );
  return normalizeGiteaPullRequestReview(client, payload);
}

/** Submit one known pending review directly. */
export async function submitGiteaPullRequestReview<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  review: PullRequestReviewData<"gitea", TVersion>,
  input: SubmitPullRequestReviewInput,
  options: OperationOptions = {},
): Promise<PullRequestReviewData<"gitea", TVersion>> {
  const operation = {
    universal: "submitPullRequestReview",
    native: "repoSubmitPullReview",
  } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReview, TVersion>(
    context,
    operation,
    () =>
      client.repoSubmitPullReview(
        {
          path: {
            ...repositoryPath(repository),
            index: pullRequestNumber(pullRequest),
            id: parsePositiveInt64(review.id, "pull-request review id"),
          },
          body: {
            mediaType: "application/json",
            value: {
              event: giteaReviewEvent(input.event),
              ...(input.body === undefined
                ? {}
                : { body: requireIdentity(input.body, "review body") }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReviewPayload,
  );
  return normalizeGiteaPullRequestReview(client, payload);
}

export function normalizeGiteaPullRequestReview<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaReview,
): PullRequestReviewData<"gitea", TVersion> {
  const id = requiredPositiveId(payload.id, "pull-request review id");
  const providerState = optionalText(payload.state);
  return Object.freeze({
    id,
    state: payload.dismissed === true ? "dismissed" : normalizedReviewState(providerState),
    ...(providerState === undefined ? {} : { providerState }),
    ...(optionalText(payload.body) === undefined ? {} : { body: optionalText(payload.body) }),
    ...(optionalText(payload.commit_id) === undefined
      ? {}
      : { commitSha: optionalText(payload.commit_id) }),
    ...(optionalText(payload.user?.login) === undefined
      ? {}
      : { author: optionalText(payload.user?.login) }),
    ...(optionalText(payload.submitted_at) === undefined
      ? {}
      : { submittedAt: optionalText(payload.submitted_at) }),
    ...(optionalText(payload.updated_at) === undefined
      ? {}
      : { updatedAt: optionalText(payload.updated_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createGiteaPullRequestReviewNative(
      client,
      payload as GiteaPullRequestReviewPayload<TVersion>,
    ),
  });
}

function normalizedReviewState(value?: string): PullRequestReviewState {
  switch (value) {
    case "PENDING":
      return "pending";
    case "APPROVED":
      return "approved";
    case "REQUEST_CHANGES":
      return "changes-requested";
    case "COMMENT":
      return "commented";
    case "REQUEST_REVIEW":
      return "review-requested";
    default:
      return "unknown";
  }
}

function giteaReviewEvent(value: SubmitPullRequestReviewEvent | GiteaPullRequestReviewEvent) {
  switch (value) {
    case "approve":
      return "APPROVED" as const;
    case "request-changes":
      return "REQUEST_CHANGES" as const;
    case "comment":
      return "COMMENT" as const;
    case "pending":
      return "PENDING" as const;
    case "request-review":
      return "REQUEST_REVIEW" as const;
    default:
      throw new TypeError("invalid pull-request review event");
  }
}

function requireReviewArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyGiteaReview[] {
  if (!Array.isArray(value) || !value.every(isReviewPayload)) {
    throw invariant(context, operation, "returned a malformed pull-request review list");
  }
  return value;
}

function isReviewPayload(value: unknown): value is AnyGiteaReview {
  if (typeof value !== "object" || value === null) return false;
  const review = value as AnyGiteaReview;
  return (typeof review.id === "number" || typeof review.id === "bigint") && review.id > 0 &&
    (review.state === undefined || typeof review.state === "string");
}

function pullRequestNumber(value: { readonly number: number }): number {
  return requirePositiveInteger(value.number, "pull-request number");
}

function parsePositiveInt64(value: string, name: string): bigint {
  const text = requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(text)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(text);
}

function requiredPositiveId(value: unknown, name: string): string {
  if ((typeof value !== "number" && typeof value !== "bigint") || value <= 0) {
    throw new TypeError(`${name} is missing`);
  }
  return String(value);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${message}`, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}
