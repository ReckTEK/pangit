import type {
  CombinedStatus as CombinedStatus126,
  CommitStatus as CommitStatus126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  CombinedStatus as CombinedStatus127,
  CommitStatus as CommitStatus127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import type {
  CombinedCommitStatus,
  CommitStatusData,
  CommitStatusState,
  CommitStatusStateData,
  SetCommitStatusInput,
  SetCommitStatusOptions,
} from "../../../fluent-api/adapter-contract/commit-statuses.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "../native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../transport/response/mod.ts";

type AnyGiteaCommitStatus = CommitStatus126 | CommitStatus127;
type AnyGiteaCombinedStatus = CombinedStatus126 | CombinedStatus127;
type GiteaStatusState = "error" | "failure" | "pending" | "skipped" | "success" | "warning";

/** Read exactly one commit-status page for a branch, tag, or commit reference. */
export async function listGiteaCommitStatuses<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  ref: string,
  request: ResolvedPageRequest,
): Promise<Page<CommitStatusData<"gitea", TVersion>>> {
  const operation = { universal: "listCommitStatuses", native: "repoListStatusesByRef" } as const;
  const reference = requireIdentity(ref, "commit-status reference");
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
      client.repoListStatusesByRef(
        {
          path: { ...repositoryPath(repository), ref: reference },
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireStatusArray(context, operation.universal, response);
  return createPage(
    payloads.map((payload) => normalizeGiteaCommitStatus(client, reference, payload)),
    giteaPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      payloads.length,
    ),
  );
}

/** Fetch the provider's bounded combined status without an implicit all-pages scan. */
export async function getGiteaCommitStatus<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  ref: string,
  options: OperationOptions = {},
): Promise<CombinedCommitStatus<"gitea", TVersion>> {
  const operation = {
    universal: "getCommitStatus",
    native: "repoGetCombinedStatusByRef",
  } as const;
  const reference = requireIdentity(ref, "commit-status reference");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaCombinedStatus, TVersion>(
    context,
    operation,
    () =>
      client.repoGetCombinedStatusByRef(
        { path: { ...repositoryPath(repository), ref: reference } },
        requestOptions(options.signal),
      ),
    options.signal,
    isCombinedStatusPayload,
  );
  const statuses = payload.statuses ?? [];
  if (!Array.isArray(statuses) || !statuses.every(isStatusPayload)) {
    throw new ProviderInvariantError(
      `${operation.universal} returned malformed individual statuses`,
      {
        provider: "gitea",
        version: context.version,
        operation: operation.universal,
        cause: payload,
      },
    );
  }
  const state = normalizeState(payload.state, "combined commit status");
  const totalCount = optionalNonNegativeInteger(payload.total_count, "combined status total count");
  return Object.freeze({
    ref: reference,
    ...state,
    statuses: Object.freeze(
      statuses.map((status) => normalizeGiteaCommitStatus(client, reference, status)),
    ),
    ...(totalCount === undefined ? {} : { totalCount }),
  });
}

/** Create one portable commit status; provider-only read states are intentionally not writable here. */
export async function setGiteaCommitStatus<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  ref: string,
  input: SetCommitStatusInput,
  options: SetCommitStatusOptions<"gitea"> = {},
): Promise<CommitStatusData<"gitea", TVersion>> {
  const operation = { universal: "setCommitStatus", native: "repoCreateStatus" } as const;
  const reference = requireIdentity(ref, "commit-status reference");
  const statusContext = requireIdentity(input.context, "commit-status context");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaCommitStatus, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateStatus(
        {
          path: { ...repositoryPath(repository), sha: reference },
          body: {
            mediaType: "application/json",
            value: {
              context: statusContext,
              state: options.extension?.state ?? input.state,
              ...(input.description === undefined ? {} : { description: input.description }),
              ...(input.targetUrl === undefined ? {} : { target_url: input.targetUrl }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isStatusPayload,
  );
  return normalizeGiteaCommitStatus(client, reference, payload);
}

/** Normalize one exact generated Gitea status while preserving provider-only states verbatim. */
export function normalizeGiteaCommitStatus<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  ref: string,
  status: AnyGiteaCommitStatus,
): CommitStatusData<"gitea", TVersion> {
  const id = optionalScalarText(status.id);
  const description = optionalText(status.description);
  const targetUrl = optionalText(status.target_url);
  const creator = optionalText(status.creator?.login);
  const createdAt = optionalText(status.created_at);
  const updatedAt = optionalText(status.updated_at);
  return Object.freeze({
    ...(id === undefined ? {} : { id }),
    ref: requireIdentity(ref, "commit-status reference"),
    context: requiredText(status.context, "commit-status context"),
    ...normalizeState(status.status, "commit status"),
    ...(description === undefined ? {} : { description }),
    ...(targetUrl === undefined ? {} : { targetUrl }),
    ...(creator === undefined ? {} : { creator }),
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    native: createGiteaEntityNative(
      "commitStatus",
      client,
      status as GiteaEntityPayload<TVersion, "commitStatus">,
    ),
  });
}

function normalizeState(value: unknown, name: string): CommitStatusStateData {
  if (!isGiteaStatusState(value)) throw new TypeError(`${name} state is missing or invalid`);
  return isPortableState(value)
    ? Object.freeze({ state: value, providerState: value })
    : Object.freeze({ providerState: value });
}

function isPortableState(value: GiteaStatusState): value is CommitStatusState {
  return value === "pending" || value === "success" || value === "failure";
}

function isGiteaStatusState(value: unknown): value is GiteaStatusState {
  return value === "error" || value === "failure" || value === "pending" ||
    value === "skipped" || value === "success" || value === "warning";
}

function requireStatusArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaCommitStatus[] {
  if (Array.isArray(response.body) && response.body.every(isStatusPayload)) return response.body;
  throw new ProviderInvariantError(`${operation} returned malformed commit-status data`, {
    provider: "gitea",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function isStatusPayload(value: unknown): value is AnyGiteaCommitStatus {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const status = value as AnyGiteaCommitStatus;
  return hasText(status.context) && isGiteaStatusState(status.status);
}

function isCombinedStatusPayload(value: unknown): value is AnyGiteaCombinedStatus {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const status = value as AnyGiteaCombinedStatus;
  return isGiteaStatusState(status.state) &&
    (status.statuses === undefined ||
      Array.isArray(status.statuses) && status.statuses.every(isStatusPayload));
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

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

function optionalScalarText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const text = optionalText(value);
  if (text === undefined || text.length === 0) throw new TypeError("commit-status id is invalid");
  return text;
}

function optionalNonNegativeInteger(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${name} is invalid`);
  }
  return value as number;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
