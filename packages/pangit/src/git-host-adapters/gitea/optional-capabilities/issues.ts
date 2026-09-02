import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  CreateIssueInput,
  IssueCapabilitySupport,
  IssueCommentData,
  IssueCommentInput,
  IssueData,
  IssueState,
  IssueUpdateOptions,
  ListIssuesRequest,
  UpdateIssueInput,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type ResolvedPageRequest,
  type ScanPage,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaIssueEntityNative,
  type GiteaIssueEntityPayload,
} from "../native/GiteaIssueNative.ts";
import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../response.ts";
type AnyGiteaIssue = GiteaIssueEntityPayload<GiteaVersion, "issue">;
type AnyGiteaComment = GiteaIssueEntityPayload<GiteaVersion, "issueComment">;

export const giteaIssueSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    list: "one-page",
    get: "direct",
    create: "direct",
    update: "direct",
    "set-state": "direct",
    "list-comments": "one-page-derived",
    "get-comment": "direct",
    "create-comment": "direct",
    "update-comment": "direct",
    "delete-comment": "direct",
  }),
  contentVersionGuard: "gitea-extension",
  timeTracking: "native-only",
  dependencies: "native-only",
  reactions: "native-only",
  attachments: "native-only",
  watchers: "native-only",
}) satisfies IssueCapabilitySupport;

/** Read exactly one provider page containing issues, never pull requests. */
export async function listGiteaIssues<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ListIssuesRequest,
): Promise<Page<IssueData<"gitea", TVersion>>> {
  const operation = { universal: "listIssues", native: "issueListIssues" } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const state = request.state;
  const query = optionalIdentity(request.query, "issue query");
  const labels = request.labels?.map((label) => requireIdentity(label, "issue label"));
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.issueListIssues(
        {
          path: repositoryPath(repository),
          query: {
            page: cursor.page,
            limit,
            type: "issues",
            ...(state === undefined ? {} : { state }),
            ...(query === undefined ? {} : { q: query }),
            ...(labels === undefined || labels.length === 0 ? {} : { labels: labels.join(",") }),
          },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireIssueArray(context, operation.universal, response);
  return createPage(
    payloads.map((payload) => normalizeGiteaIssue(client, payload)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one issue directly by repository and number. */
export async function getGiteaIssue<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  number: number,
  options: OperationOptions = {},
): Promise<IssueData<"gitea", TVersion>> {
  const operation = { universal: "getIssue", native: "issueGetIssue" } as const;
  const index = requirePositiveInteger(number, "issue number");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaIssue, TVersion>(
    context,
    operation,
    () =>
      client.issueGetIssue(
        { path: { ...repositoryPath(repository), index } },
        requestOptions(options.signal),
      ),
    options.signal,
    isIssuePayload,
  );
  return normalizeGiteaIssue(client, payload);
}

/** Create one issue using only common title and description fields. */
export async function createGiteaIssue<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreateIssueInput,
  options: OperationOptions = {},
): Promise<IssueData<"gitea", TVersion>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  issue: IssueData<"gitea", TVersion>,
  input: UpdateIssueInput,
  options: IssueUpdateOptions<"gitea"> = {},
): Promise<IssueData<"gitea", TVersion>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  issue: IssueData<"gitea", TVersion>,
  state: IssueState,
  options: OperationOptions = {},
): Promise<IssueData<"gitea", TVersion>> {
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

/** Add one comment directly to a known issue. */
export async function createGiteaIssueComment<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  issue: IssueData<"gitea", TVersion>,
  input: IssueCommentInput,
  options: OperationOptions = {},
): Promise<IssueCommentData<"gitea", TVersion>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  comment: IssueCommentData<"gitea", TVersion>,
  input: IssueCommentInput,
  options: OperationOptions = {},
): Promise<IssueCommentData<"gitea", TVersion>> {
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
  repository: RepositoryData<"gitea", TVersion>,
  comment: IssueCommentData<"gitea", TVersion>,
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

export function normalizeGiteaIssue<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaIssue,
): IssueData<"gitea", TVersion> {
  const number = requiredPositiveNumber(payload.number, "issue number");
  const state = requiredIssueState(payload.state, `issue ${number} state`);
  return Object.freeze({
    id: requiredText(payload.id, `issue ${number} id`),
    number,
    title: requiredText(payload.title, `issue ${number} title`),
    ...(optionalText(payload.body) === undefined
      ? {}
      : { description: optionalText(payload.body) }),
    state,
    ...(optionalText(payload.user?.login) === undefined
      ? {}
      : { author: optionalText(payload.user?.login) }),
    assignees: Object.freeze((payload.assignees ?? []).flatMap((user) => {
      const login = optionalText(user.login);
      return login === undefined ? [] : [login];
    })),
    labels: Object.freeze((payload.labels ?? []).flatMap((label) => {
      const name = optionalText(label.name);
      return name === undefined ? [] : [name];
    })),
    ...(optionalNonNegativeNumber(payload.comments) === undefined
      ? {}
      : { commentCount: optionalNonNegativeNumber(payload.comments) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    ...(optionalText(payload.updated_at) === undefined
      ? {}
      : { updatedAt: optionalText(payload.updated_at) }),
    ...(optionalText(payload.closed_at) === undefined
      ? {}
      : { closedAt: optionalText(payload.closed_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createGiteaIssueEntityNative(
      "issue",
      client,
      payload as GiteaIssueEntityPayload<TVersion, "issue">,
    ),
  });
}

export function normalizeGiteaIssueComment<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaComment,
): IssueCommentData<"gitea", TVersion> {
  const id = requiredText(payload.id, "issue comment id");
  return Object.freeze({
    id,
    body: requiredString(payload.body, `issue comment ${id} body`),
    ...(optionalText(payload.user?.login) === undefined
      ? {}
      : { author: optionalText(payload.user?.login) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    ...(optionalText(payload.updated_at) === undefined
      ? {}
      : { updatedAt: optionalText(payload.updated_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createGiteaIssueEntityNative(
      "issueComment",
      client,
      payload as GiteaIssueEntityPayload<TVersion, "issueComment">,
    ),
  });
}

function requireIssueArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaIssue[] {
  if (Array.isArray(response.body) && response.body.every(isIssuePayload)) return response.body;
  throw invariant(context, operation, "returned malformed issue data", response);
}

function requireCommentArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaComment[] {
  if (Array.isArray(response.body) && response.body.every(isCommentPayload)) return response.body;
  throw invariant(context, operation, "returned malformed issue-comment data", response);
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

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function optionalIdentity(value: string | undefined, name: string): string | undefined {
  return value === undefined ? undefined : requireIdentity(value, name);
}

function parsePositiveInt64(value: string, name: string): bigint {
  requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(value)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(value);
}

function requireNonNegativeInteger(value: number | bigint, name: string): void {
  if (
    typeof value === "bigint" ? value < 0n : !Number.isSafeInteger(value) || value < 0
  ) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function requiredPositiveNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} is missing or outside the safe integer range`);
  }
  return value;
}

function requiredIssueState(value: unknown, name: string): IssueState {
  if (value === "open" || value === "closed") return value;
  throw new TypeError(`${name} is missing or invalid`);
}

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string") throw new TypeError(`${name} is missing`);
  return value;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isIssuePayload(value: unknown): value is AnyGiteaIssue {
  if (!isRecord(value)) return false;
  return hasText(value.id) && typeof value.number === "number" && value.number > 0 &&
    hasText(value.title) && (value.state === "open" || value.state === "closed");
}

function isCommentPayload(value: unknown): value is AnyGiteaComment {
  return isRecord(value) && hasText(value.id) && typeof value.body === "string";
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  detail: string,
  cause: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${detail}`, {
    provider: "gitea",
    version: context.version,
    operation,
    cause,
  });
}
