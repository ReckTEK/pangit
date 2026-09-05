import { resolveStatusRef } from "./resolve-ref.ts";
import type {
  CombinedStatus as CombinedStatus15,
  CommitStatus as CommitStatus15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  CombinedStatus as CombinedStatus16,
  CommitStatus as CommitStatus16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
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
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import {
  createForgejoEntityNative,
  type ForgejoClient,
  type ForgejoEntityPayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";
import {
  decodeForgejoPageCursor,
  forgejoPagination,
  requestForgejo,
  requestForgejoBody,
} from "../transport/response/mod.ts";

type AnyForgejoCommitStatus = CommitStatus15 | CommitStatus16;
type AnyForgejoCombinedStatus = CombinedStatus15 | CombinedStatus16;
type ForgejoStatusState = "error" | "failure" | "pending" | "skipped" | "success" | "warning";

/** Read exactly one commit-status page for a branch, tag, or commit reference. */
export async function listForgejoCommitStatuses<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  ref: string,
  request: ResolvedPageRequest,
): Promise<Page<CommitStatusData<"forgejo", TVersion>>> {
  const operation = { universal: "listCommitStatuses", native: "repoListStatusesByRef" } as const;
  const reference = requireIdentity(ref, "commit-status reference");
  const client = await context.client();
  const sha = await resolveStatusRef(
    context,
    client,
    repositoryPath(repository),
    reference,
    operation.universal,
    request.signal,
  );
  const cursor = decodeForgejoPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.repoListStatusesByRef(
        {
          path: { ...repositoryPath(repository), ref: sha },
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireStatusArray(context, operation.universal, response);
  return createPage(
    payloads.map((payload) => normalizeForgejoCommitStatus(client, reference, payload)),
    forgejoPagination(
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
export async function getForgejoCommitStatus<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  ref: string,
  options: OperationOptions = {},
): Promise<CombinedCommitStatus<"forgejo", TVersion>> {
  const operation = {
    universal: "getCommitStatus",
    native: "repoGetCombinedStatusByRef",
  } as const;
  const reference = requireIdentity(ref, "commit-status reference");
  const client = await context.client();
  const sha = await resolveStatusRef(
    context,
    client,
    repositoryPath(repository),
    reference,
    operation.universal,
    options.signal,
  );
  const payload = await requestForgejoBody<AnyForgejoCombinedStatus, TVersion>(
    context,
    operation,
    () =>
      client.repoGetCombinedStatusByRef(
        { path: { ...repositoryPath(repository), ref: sha } },
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
        provider: "forgejo",
        version: context.version,
        operation: operation.universal,
        cause: payload,
      },
    );
  }
  const state = payload.state === "" && statuses.length === 0
    ? Object.freeze({ providerState: "" })
    : normalizeState(payload.state, "combined commit status");
  const totalCount = optionalNonNegativeInteger(payload.total_count, "combined status total count");
  return Object.freeze({
    ref: reference,
    ...state,
    statuses: Object.freeze(
      statuses.map((status) => normalizeForgejoCommitStatus(client, reference, status)),
    ),
    ...(totalCount === undefined ? {} : { totalCount }),
  });
}

/** Create one portable commit status; provider-only read states are intentionally not writable here. */
export async function setForgejoCommitStatus<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  ref: string,
  input: SetCommitStatusInput,
  options: SetCommitStatusOptions<"forgejo"> = {},
): Promise<CommitStatusData<"forgejo", TVersion>> {
  const operation = { universal: "setCommitStatus", native: "repoCreateStatus" } as const;
  const reference = requireIdentity(ref, "commit-status reference");
  const statusContext = requireIdentity(input.context, "commit-status context");
  const client = await context.client();
  const sha = await resolveStatusRef(
    context,
    client,
    repositoryPath(repository),
    reference,
    operation.universal,
    options.signal,
  );
  const payload = await requestForgejoBody<AnyForgejoCommitStatus, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateStatus(
        {
          path: { ...repositoryPath(repository), sha },
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
  return normalizeForgejoCommitStatus(client, reference, payload);
}

/** Normalize one exact generated Forgejo status while preserving provider-only states verbatim. */
export function normalizeForgejoCommitStatus<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  ref: string,
  status: AnyForgejoCommitStatus,
): CommitStatusData<"forgejo", TVersion> {
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
    native: createForgejoEntityNative(
      "commitStatus",
      client,
      status as ForgejoEntityPayload<TVersion, "commitStatus">,
    ),
  });
}

function normalizeState(value: unknown, name: string): CommitStatusStateData {
  if (!isForgejoStatusState(value)) throw new TypeError(`${name} state is missing or invalid`);
  return isPortableState(value)
    ? Object.freeze({ state: value, providerState: value })
    : Object.freeze({ providerState: value });
}

function isPortableState(value: ForgejoStatusState): value is CommitStatusState {
  return value === "pending" || value === "success" || value === "failure";
}

function isForgejoStatusState(value: unknown): value is ForgejoStatusState {
  return value === "error" || value === "failure" || value === "pending" ||
    value === "skipped" || value === "success" || value === "warning";
}

function requireStatusArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyForgejoCommitStatus[] {
  if (Array.isArray(response.body) && response.body.every(isStatusPayload)) return response.body;
  throw new ProviderInvariantError(`${operation} returned malformed commit-status data`, {
    provider: "forgejo",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function isStatusPayload(value: unknown): value is AnyForgejoCommitStatus {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const status = value as AnyForgejoCommitStatus;
  return hasText(status.context) && isForgejoStatusState(status.status);
}

function isCombinedStatusPayload(value: unknown): value is AnyForgejoCombinedStatus {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const status = value as AnyForgejoCombinedStatus;
  return (isForgejoStatusState(status.state) ||
    status.state === "" && status.total_count === 0 &&
      (status.statuses == null || status.statuses.length === 0)) &&
    (status.statuses == null ||
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
