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
  type AnyGiteaRelease,
  isReleasePayload,
  parsePositiveInt64,
  requireReleaseArray,
} from "./validate-payload.ts";
import { normalizeGiteaRelease } from "./normalize.ts";

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
