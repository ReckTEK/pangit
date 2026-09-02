import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import type {
  CreateReleaseInput,
  ListReleaseAssetsOptions,
  ReleaseAssetData,
  ReleaseCapabilitySupport,
  ReleaseData,
  UpdateReleaseAssetInput,
  UpdateReleaseInput,
  UploadReleaseAssetInput,
} from "../../../fluent-api/adapter-contract/optional/releases.ts";
import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaReleaseEntityNative,
  type GiteaReleaseEntityPayload,
} from "../native/GiteaReleaseNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../response.ts";
type AnyGiteaRelease = GiteaReleaseEntityPayload<GiteaVersion, "release">;
type AnyGiteaReleaseAsset = GiteaReleaseEntityPayload<GiteaVersion, "releaseAsset">;

export const giteaReleaseSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    list: "one-page",
    get: "direct",
    "get-by-tag": "direct",
    create: "direct",
    update: "direct",
    delete: "direct",
    "list-assets": "direct-bounded-result",
    "get-asset": "direct",
    "upload-asset": "direct",
    "update-asset": "direct",
    "delete-asset": "direct",
  }),
  signing: "native-only",
}) satisfies ReleaseCapabilitySupport;

/** Read exactly one provider release page. */
export async function listGiteaReleases<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<ReleaseData<"gitea", TVersion>>> {
  const operation = { universal: "listReleases", native: "repoListReleases" } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoListReleases(
        { path: repositoryPath(repository), query: { page: cursor.page, limit } },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireReleaseArray(context, operation.universal, response);
  return createPage(
    payloads.map((payload) => normalizeGiteaRelease(client, payload)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one release directly by ID. */
export async function getGiteaRelease<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<ReleaseData<"gitea", TVersion>> {
  const operation = { universal: "getRelease", native: "repoGetRelease" } as const;
  const releaseId = parsePositiveInt64(id, "release id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRelease, TVersion>(
    context,
    operation,
    () =>
      client.repoGetRelease(
        { path: { ...repositoryPath(repository), id: releaseId } },
        requestOptions(options.signal),
      ),
    options.signal,
    isReleasePayload,
  );
  return normalizeGiteaRelease(client, payload);
}

/** Fetch one release directly by tag name. */
export async function getGiteaReleaseByTag<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  tagName: string,
  options: OperationOptions = {},
): Promise<ReleaseData<"gitea", TVersion>> {
  const operation = { universal: "getReleaseByTag", native: "repoGetReleaseByTag" } as const;
  const tag = requireIdentity(tagName, "release tag name");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRelease, TVersion>(
    context,
    operation,
    () =>
      client.repoGetReleaseByTag(
        { path: { ...repositoryPath(repository), tag } },
        requestOptions(options.signal),
      ),
    options.signal,
    isReleasePayload,
  );
  return normalizeGiteaRelease(client, payload);
}

/** Create one release, optionally creating its tag at the supplied target. */
export async function createGiteaRelease<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreateReleaseInput,
  options: OperationOptions = {},
): Promise<ReleaseData<"gitea", TVersion>> {
  const operation = { universal: "createRelease", native: "repoCreateRelease" } as const;
  const tagName = requireIdentity(input.tagName, "release tag name");
  const name = optionalIdentity(input.name, "release name");
  const target = optionalIdentity(input.target, "release target");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRelease, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateRelease(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              tag_name: tagName,
              ...(name === undefined ? {} : { name }),
              ...(input.description === undefined ? {} : { body: input.description }),
              ...(input.draft === undefined ? {} : { draft: input.draft }),
              ...(input.prerelease === undefined ? {} : { prerelease: input.prerelease }),
              ...(target === undefined ? {} : { target_commitish: target }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReleasePayload,
  );
  return normalizeGiteaRelease(client, payload);
}

/** Update only fields in the shared release contract. */
export async function updateGiteaRelease<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  input: UpdateReleaseInput,
  options: OperationOptions = {},
): Promise<ReleaseData<"gitea", TVersion>> {
  const operation = { universal: "updateRelease", native: "repoEditRelease" } as const;
  if (
    input.name === undefined && input.description === undefined && input.draft === undefined &&
    input.prerelease === undefined
  ) {
    throw new TypeError("release update requires at least one changed field");
  }
  const name = optionalIdentity(input.name, "release name");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRelease, TVersion>(
    context,
    operation,
    () =>
      client.repoEditRelease(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
          },
          body: {
            mediaType: "application/json",
            value: {
              ...(name === undefined ? {} : { name }),
              ...(input.description === undefined ? {} : { body: input.description }),
              ...(input.draft === undefined ? {} : { draft: input.draft }),
              ...(input.prerelease === undefined ? {} : { prerelease: input.prerelease }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReleasePayload,
  );
  return normalizeGiteaRelease(client, payload);
}

/** Delete one known release directly without a preflight lookup. */
export async function deleteGiteaRelease<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteRelease", native: "repoDeleteRelease" } as const;
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDeleteRelease(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/**
 * Read Gitea's single unpaged asset result and reject it above the caller's explicit ceiling.
 * Gitea exposes no page/limit input for this endpoint in either supported generated client.
 */
export async function listGiteaReleaseAssets<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  options: ListReleaseAssetsOptions,
): Promise<readonly ReleaseAssetData<"gitea", TVersion>[]> {
  const operation = {
    universal: "listReleaseAssets",
    native: "repoListReleaseAttachments",
  } as const;
  const maxItems = requirePositiveInteger(options.maxItems, "maximum release assets");
  const client = await context.client();
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoListReleaseAttachments(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  const payloads = requireAssetArray(context, operation.universal, response);
  if (payloads.length > maxItems) {
    throw new ValidationError(
      `${operation.universal} returned ${payloads.length} assets, exceeding the ${maxItems} item limit`,
      {
        provider: "gitea",
        version: context.version,
        operation: operation.universal,
        cause: response,
      },
    );
  }
  return Object.freeze(payloads.map((payload) => normalizeGiteaReleaseAsset(client, payload)));
}

/** Fetch one release asset directly by release and asset ID. */
export async function getGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<ReleaseAssetData<"gitea", TVersion>> {
  const operation = {
    universal: "getReleaseAsset",
    native: "repoGetReleaseAttachment",
  } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReleaseAsset, TVersion>(
    context,
    operation,
    () =>
      client.repoGetReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
            attachment_id: parsePositiveInt64(id, "release asset id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isAssetPayload,
  );
  return normalizeGiteaReleaseAsset(client, payload);
}

/** Upload one binary release asset with one direct request. */
export async function uploadGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  input: UploadReleaseAssetInput,
  options: OperationOptions = {},
): Promise<ReleaseAssetData<"gitea", TVersion>> {
  const operation = {
    universal: "uploadReleaseAsset",
    native: "repoCreateReleaseAttachment",
  } as const;
  const name = requireIdentity(input.name, "release asset name");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReleaseAsset, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
          },
          query: { name },
          body: { mediaType: "multipart/form-data", value: { attachment: input.data } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isAssetPayload,
  );
  return normalizeGiteaReleaseAsset(client, payload);
}

/** Rename one known release asset directly. */
export async function updateGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  asset: ReleaseAssetData<"gitea", TVersion>,
  input: UpdateReleaseAssetInput,
  options: OperationOptions = {},
): Promise<ReleaseAssetData<"gitea", TVersion>> {
  const operation = {
    universal: "updateReleaseAsset",
    native: "repoEditReleaseAttachment",
  } as const;
  const name = requireIdentity(input.name, "release asset name");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReleaseAsset, TVersion>(
    context,
    operation,
    () =>
      client.repoEditReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
            attachment_id: parsePositiveInt64(asset.id, "release asset id"),
          },
          body: { mediaType: "application/json", value: { name } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isAssetPayload,
  );
  return normalizeGiteaReleaseAsset(client, payload);
}

/** Delete one known release asset directly without a lookup. */
export async function deleteGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  asset: ReleaseAssetData<"gitea", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "deleteReleaseAsset",
    native: "repoDeleteReleaseAttachment",
  } as const;
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDeleteReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
            attachment_id: parsePositiveInt64(asset.id, "release asset id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

export function normalizeGiteaRelease<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaRelease,
): ReleaseData<"gitea", TVersion> {
  const tagName = requiredText(payload.tag_name, "release tag name");
  return Object.freeze({
    id: requiredText(payload.id, `release ${tagName} id`),
    tagName,
    ...(optionalText(payload.name) === undefined ? {} : { name: optionalText(payload.name) }),
    ...(optionalText(payload.body) === undefined
      ? {}
      : { description: optionalText(payload.body) }),
    ...(optionalText(payload.author?.login) === undefined
      ? {}
      : { author: optionalText(payload.author?.login) }),
    draft: payload.draft === true,
    prerelease: payload.prerelease === true,
    ...(optionalText(payload.target_commitish) === undefined
      ? {}
      : { target: optionalText(payload.target_commitish) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    ...(optionalText(payload.published_at) === undefined
      ? {}
      : { publishedAt: optionalText(payload.published_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createGiteaReleaseEntityNative(
      "release",
      client,
      payload as GiteaReleaseEntityPayload<TVersion, "release">,
    ),
  });
}

export function normalizeGiteaReleaseAsset<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaReleaseAsset,
): ReleaseAssetData<"gitea", TVersion> {
  const id = requiredText(payload.id, "release asset id");
  return Object.freeze({
    id,
    name: requiredText(payload.name, `release asset ${id} name`),
    ...(optionalInt64(payload.size) === undefined ? {} : { size: optionalInt64(payload.size) }),
    ...(optionalInt64(payload.download_count) === undefined
      ? {}
      : { downloadCount: optionalInt64(payload.download_count) }),
    ...(optionalText(payload.browser_download_url) === undefined
      ? {}
      : { downloadUrl: optionalText(payload.browser_download_url) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    native: createGiteaReleaseEntityNative(
      "releaseAsset",
      client,
      payload as GiteaReleaseEntityPayload<TVersion, "releaseAsset">,
    ),
  });
}

function requireReleaseArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaRelease[] {
  if (Array.isArray(response.body) && response.body.every(isReleasePayload)) return response.body;
  throw invariant(context, operation, "returned malformed release data", response);
}

function requireAssetArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaReleaseAsset[] {
  if (Array.isArray(response.body) && response.body.every(isAssetPayload)) return response.body;
  throw invariant(context, operation, "returned malformed release-asset data", response);
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

function optionalInt64(value: unknown): number | bigint | undefined {
  return typeof value === "bigint" && value >= 0n ||
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function isReleasePayload(value: unknown): value is AnyGiteaRelease {
  return isRecord(value) && hasText(value.id) && hasText(value.tag_name);
}

function isAssetPayload(value: unknown): value is AnyGiteaReleaseAsset {
  return isRecord(value) && hasText(value.id) && hasText(value.name);
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
