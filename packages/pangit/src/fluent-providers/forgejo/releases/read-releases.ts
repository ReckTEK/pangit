import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ReleaseData } from "../../../fluent-api/adapter-contract/optional/releases.ts";
import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  decodeForgejoPageCursor,
  forgejoPagination,
  requestForgejo,
  requestForgejoBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyForgejoRelease,
  isReleasePayload,
  parsePositiveInt64,
  requireReleaseArray,
} from "./validate-payload.ts";
import { normalizeForgejoRelease } from "./normalize.ts";

/** Read exactly one provider release page. */
export async function listForgejoReleases<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<ReleaseData<"forgejo", TVersion>>> {
  const operation = { universal: "listReleases", native: "repoListReleases" } as const;
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(
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
    payloads.map((payload) => normalizeForgejoRelease(client, payload)),
    forgejoPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one release directly by ID. */
export async function getForgejoRelease<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<ReleaseData<"forgejo", TVersion>> {
  const operation = { universal: "getRelease", native: "repoGetRelease" } as const;
  const releaseId = parsePositiveInt64(id, "release id");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRelease, TVersion>(
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
  return normalizeForgejoRelease(client, payload);
}

/** Fetch one release directly by tag name. */
export async function getForgejoReleaseByTag<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  tagName: string,
  options: OperationOptions = {},
): Promise<ReleaseData<"forgejo", TVersion>> {
  const operation = { universal: "getReleaseByTag", native: "repoGetReleaseByTag" } as const;
  const tag = requireIdentity(tagName, "release tag name");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRelease, TVersion>(
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
  return normalizeForgejoRelease(client, payload);
}
