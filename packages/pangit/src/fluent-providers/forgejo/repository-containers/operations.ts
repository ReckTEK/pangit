import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import {
  AuthenticationError,
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryContainerData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoRepositoryContainerNative,
  type ForgejoOrganizationPayload,
  type ForgejoUserPayload,
} from "../native/ForgejoRepositoryContainerNative.ts";
import {
  decodeForgejoPageCursor,
  forgejoPagination,
  requestForgejo,
  requestForgejoBody,
  requestOptionalForgejoBody,
} from "../transport/response/mod.ts";

type AnyForgejoOrganization = ForgejoOrganizationPayload<ForgejoVersion>;
type AnyForgejoUser = ForgejoUserPayload<ForgejoVersion>;

interface ContainerCursor {
  readonly userEmitted: boolean;
  readonly organizationOffset: number;
  readonly organizationPageSize?: number;
}

/** List the cached current user plus at most one Forgejo organization page. */
export async function listForgejoRepositoryContainers<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryContainerData<"forgejo", TVersion>>> {
  const operation = {
    universal: "listRepositoryContainers",
    native: "orgListCurrentUserOrgs",
  } as const;
  const currentUser = context.currentUser();
  if (currentUser === undefined) {
    throw new AuthenticationError("listRepositoryContainers requires authentication", {
      provider: "forgejo",
      version: context.version,
      operation: "listRepositoryContainers",
    });
  }

  const cursor = decodeContainerCursor(context, request.cursor);
  const client = await context.client();
  const containers: RepositoryContainerData<"forgejo", TVersion>[] = [];
  if (!cursor.userEmitted) {
    containers.push(normalizeForgejoUserContainer(client, currentUser as AnyForgejoUser));
  }

  const remaining = request.limit - containers.length;
  const providerLimit = cursor.organizationPageSize ?? request.limit;
  const organizationPage = Math.floor(cursor.organizationOffset / providerLimit) + 1;
  const offsetInPage = cursor.organizationOffset % providerLimit;
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.orgListCurrentUserOrgs(
        { query: { page: organizationPage, limit: providerLimit } },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireOrganizationArray(context, operation.universal, response);
  const selected = remaining <= 0 ? [] : payloads.slice(offsetInPage, offsetInPage + remaining);
  containers.push(
    ...selected.map((organization) =>
      normalizeForgejoOrganizationContainer(
        client,
        organization,
      )
    ),
  );

  const organizationPagination = forgejoPagination(
    context,
    operation,
    response,
    { page: organizationPage, effectiveLimit: providerLimit },
    providerLimit,
    payloads.length,
  );
  const nextOrganizationOffset = cursor.organizationOffset + selected.length;
  const hasMoreOrganizations = offsetInPage + selected.length < payloads.length ||
    organizationPagination.nextCursor !== undefined;
  const totalCount = organizationPagination.totalCount === undefined
    ? undefined
    : organizationPagination.totalCount + 1;

  const effectivePageSize = organizationPagination.nextCursor === undefined
    ? providerLimit
    : payloads.length > 0 && payloads.length < providerLimit
    ? payloads.length
    : decodeForgejoPageCursor(organizationPagination.nextCursor, {
      version: context.version,
      operation,
    }).effectiveLimit ?? providerLimit;

  return createPage(containers, {
    ...(!hasMoreOrganizations ? {} : {
      nextCursor: encodeContainerCursor({
        userEmitted: true,
        organizationOffset: nextOrganizationOffset,
        organizationPageSize: effectivePageSize,
      }),
    }),
    ...(totalCount === undefined ? {} : { totalCount }),
  });
}

/** Resolve a named organization first, falling back to a user only on confirmed 404. */
export async function getForgejoRepositoryContainer<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryContainerData<"forgejo", TVersion>> {
  const organizationOperation = {
    universal: "getRepositoryContainer",
    native: "orgGet",
  } as const;
  const userOperation = {
    universal: "getRepositoryContainer",
    native: "userGet",
  } as const;
  const containerName = requireIdentity(name, "repository container name");
  const client = await context.client();
  const currentUser = context.currentUser();
  if (currentUser !== undefined && optionalText(currentUser.login) === containerName) {
    return normalizeForgejoUserContainer(client, currentUser as AnyForgejoUser);
  }

  const organization = await requestOptionalForgejoBody<AnyForgejoOrganization, TVersion>(
    context,
    organizationOperation,
    () =>
      client.orgGet(
        { path: { org: containerName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isOrganizationPayload,
  );
  if (organization !== undefined) {
    return normalizeForgejoOrganizationContainer(client, organization);
  }

  const user = await requestForgejoBody<AnyForgejoUser, TVersion>(
    context,
    userOperation,
    () =>
      client.userGet(
        { path: { username: containerName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isUserPayload,
  );
  return normalizeForgejoUserContainer(client, user);
}

/** Normalize one exact-version Forgejo user container without another provider request. */
export function normalizeForgejoUserContainer<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  user: AnyForgejoUser,
): RepositoryContainerData<"forgejo", TVersion> {
  const name = requiredText(user.login, "user login");
  return Object.freeze({
    kind: "user",
    id: requiredText(user.id, `user ${name} id`),
    name,
    ...(optionalText(user.full_name) === undefined
      ? {}
      : { displayName: optionalText(user.full_name) }),
    ...(optionalText(user.description) === undefined
      ? {}
      : { description: optionalText(user.description) }),
    native: createForgejoRepositoryContainerNative({
      client,
      kind: "user",
      container: user as ForgejoUserPayload<TVersion>,
    }),
  });
}

/** Normalize one exact-version Forgejo organization container without another provider request. */
export function normalizeForgejoOrganizationContainer<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  organization: AnyForgejoOrganization,
): RepositoryContainerData<"forgejo", TVersion> {
  const name = requiredText(
    optionalText(organization.name) ?? optionalText(organization.username),
    "organization name",
  );
  return Object.freeze({
    kind: "organization",
    id: requiredText(organization.id, `organization ${name} id`),
    name,
    ...(optionalText(organization.full_name) === undefined
      ? {}
      : { displayName: optionalText(organization.full_name) }),
    ...(optionalText(organization.description) === undefined
      ? {}
      : { description: optionalText(organization.description) }),
    native: createForgejoRepositoryContainerNative({
      client,
      kind: "organization",
      container: organization as ForgejoOrganizationPayload<TVersion>,
    }),
  });
}

function decodeContainerCursor<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  value?: string,
): ContainerCursor {
  if (value === undefined) {
    return Object.freeze({ userEmitted: false, organizationOffset: 0 });
  }
  const match = /^forgejo-containers:v1:(0|1):(0|[1-9]\d*):([1-9]\d*)$/.exec(value);
  if (match === null) throw containerCursorError(context, "cursor");
  const organizationOffset = Number(match[2]);
  if (!Number.isSafeInteger(organizationOffset)) {
    throw containerCursorError(context, "cursor offset");
  }
  const organizationPageSize = Number(match[3]);
  if (!Number.isSafeInteger(organizationPageSize)) {
    throw containerCursorError(context, "cursor page size");
  }
  return Object.freeze({
    userEmitted: match[1] === "1",
    organizationOffset,
    organizationPageSize,
  });
}

function containerCursorError<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  message: string,
): ValidationError {
  return new ValidationError(`invalid Forgejo repository-container ${message}`, {
    provider: "forgejo",
    version: context.version,
    operation: "listRepositoryContainers",
  });
}

function encodeContainerCursor(cursor: ContainerCursor): string {
  if (cursor.organizationPageSize === undefined) {
    throw new RangeError("Forgejo repository-container cursor requires a page size");
  }
  return `forgejo-containers:v1:${
    cursor.userEmitted ? 1 : 0
  }:${cursor.organizationOffset}:${cursor.organizationPageSize}`;
}

function requireOrganizationArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyForgejoOrganization[] {
  if (Array.isArray(response.body) && response.body.every(isOrganizationPayload)) {
    return response.body;
  }
  throw new ProviderInvariantError(`${operation} returned malformed organization data`, {
    provider: "forgejo",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

function isUserPayload(value: unknown): value is AnyForgejoUser {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const user = value as AnyForgejoUser;
  return hasText(user.login) && hasText(user.id);
}

function isOrganizationPayload(value: unknown): value is AnyForgejoOrganization {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const organization = value as AnyForgejoOrganization;
  return hasText(optionalText(organization.name) ?? optionalText(organization.username)) &&
    hasText(organization.id);
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}
