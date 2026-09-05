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
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaRepositoryContainerNative,
  type GiteaOrganizationPayload,
  type GiteaUserPayload,
} from "../native/GiteaRepositoryContainerNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "../transport/response/mod.ts";

type AnyGiteaOrganization = GiteaOrganizationPayload<GiteaVersion>;
type AnyGiteaUser = GiteaUserPayload<GiteaVersion>;

interface ContainerCursor {
  readonly userEmitted: boolean;
  readonly organizationOffset: number;
  readonly organizationPageSize?: number;
}

/** List the cached current user plus at most one Gitea organization page. */
export async function listGiteaRepositoryContainers<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryContainerData<"gitea", TVersion>>> {
  const operation = {
    universal: "listRepositoryContainers",
    native: "orgListCurrentUserOrgs",
  } as const;
  const currentUser = context.currentUser();
  if (currentUser === undefined) {
    throw new AuthenticationError("listRepositoryContainers requires authentication", {
      provider: "gitea",
      version: context.version,
      operation: "listRepositoryContainers",
    });
  }

  const cursor = decodeContainerCursor(context, request.cursor);
  const client = await context.client();
  const containers: RepositoryContainerData<"gitea", TVersion>[] = [];
  if (!cursor.userEmitted) {
    containers.push(normalizeGiteaUserContainer(client, currentUser as AnyGiteaUser));
  }

  const remaining = request.limit - containers.length;
  const providerLimit = cursor.organizationPageSize ?? request.limit;
  const organizationPage = Math.floor(cursor.organizationOffset / providerLimit) + 1;
  const offsetInPage = cursor.organizationOffset % providerLimit;
  const response = await requestGitea(
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
      normalizeGiteaOrganizationContainer(
        client,
        organization,
      )
    ),
  );

  const organizationPagination = giteaPagination(
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
    : decodeGiteaPageCursor(organizationPagination.nextCursor, {
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
export async function getGiteaRepositoryContainer<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryContainerData<"gitea", TVersion>> {
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
    return normalizeGiteaUserContainer(client, currentUser as AnyGiteaUser);
  }

  const organization = await requestOptionalGiteaBody<AnyGiteaOrganization, TVersion>(
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
    return normalizeGiteaOrganizationContainer(client, organization);
  }

  const user = await requestGiteaBody<AnyGiteaUser, TVersion>(
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
  return normalizeGiteaUserContainer(client, user);
}

/** Normalize one exact-version Gitea user container without another provider request. */
export function normalizeGiteaUserContainer<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  user: AnyGiteaUser,
): RepositoryContainerData<"gitea", TVersion> {
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
    native: createGiteaRepositoryContainerNative({
      client,
      kind: "user",
      container: user as GiteaUserPayload<TVersion>,
    }),
  });
}

/** Normalize one exact-version Gitea organization container without another provider request. */
export function normalizeGiteaOrganizationContainer<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  organization: AnyGiteaOrganization,
): RepositoryContainerData<"gitea", TVersion> {
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
    native: createGiteaRepositoryContainerNative({
      client,
      kind: "organization",
      container: organization as GiteaOrganizationPayload<TVersion>,
    }),
  });
}

function decodeContainerCursor<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  value?: string,
): ContainerCursor {
  if (value === undefined) {
    return Object.freeze({ userEmitted: false, organizationOffset: 0 });
  }
  const match = /^gitea-containers:v1:(0|1):(0|[1-9]\d*):([1-9]\d*)$/.exec(value);
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

function containerCursorError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  message: string,
): ValidationError {
  return new ValidationError(`invalid Gitea repository-container ${message}`, {
    provider: "gitea",
    version: context.version,
    operation: "listRepositoryContainers",
  });
}

function encodeContainerCursor(cursor: ContainerCursor): string {
  if (cursor.organizationPageSize === undefined) {
    throw new RangeError("Gitea repository-container cursor requires a page size");
  }
  return `gitea-containers:v1:${
    cursor.userEmitted ? 1 : 0
  }:${cursor.organizationOffset}:${cursor.organizationPageSize}`;
}

function requireOrganizationArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaOrganization[] {
  if (Array.isArray(response.body) && response.body.every(isOrganizationPayload)) {
    return response.body;
  }
  throw new ProviderInvariantError(`${operation} returned malformed organization data`, {
    provider: "gitea",
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

function isUserPayload(value: unknown): value is AnyGiteaUser {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const user = value as AnyGiteaUser;
  return hasText(user.login) && hasText(user.id);
}

function isOrganizationPayload(value: unknown): value is AnyGiteaOrganization {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const organization = value as AnyGiteaOrganization;
  return hasText(optionalText(organization.name) ?? optionalText(organization.username)) &&
    hasText(organization.id);
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}
