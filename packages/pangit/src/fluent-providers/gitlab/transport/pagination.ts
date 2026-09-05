import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";

import type { RestOperationInput } from "../../../generated-rest-clients/runtime/mod.ts";
import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import { decodeGitLabPageCursor, gitlabPagination } from "./response/mod.ts";

import type { Repo } from "../adapter.ts";
import { array, type Dto } from "./payload.ts";
import { context, invariant } from "./errors.ts";
import type { Input, Method } from "./request-input.ts";

import { call, extra } from "./request.ts";

import { batch } from "./batch.ts";

export function path<V extends GitLabVersion>(r: Repo<V>) {
  return { id: r.id };
}

export function pageQuery(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  request: ResolvedPageRequest,
) {
  const cursor = decodeGitLabPageCursor(request.cursor, {
    version: c.version,
    operation: { universal: operation },
  });
  const per_page = Math.min(
    cursor.effectiveLimit ?? requirePositiveInteger(request.limit, "limit", context(c, operation)),
    100,
  );
  return { page: cursor.page, per_page };
}

export async function page<V extends GitLabVersion, M extends Method, T>(
  c: GitLabAdapterContext<V>,
  operation: string,
  method: M,
  input: Input<M>,
  request: ResolvedPageRequest,
  normalize: (value: Dto) => T | Promise<T>,
) {
  const query = pageQuery(c, operation, request);
  const response = await call(c, operation, method, {
    ...input,
    query: { ...(input as RestOperationInput).query, ...query },
  }, request);
  const rows = array(c, operation, response.body);
  if (rows.length > query.per_page) {
    invariant(c, operation, "GitLab exceeded the requested page size");
  }
  const metadata = gitlabPagination(
    c,
    { universal: operation },
    response,
    { page: query.page, effectiveLimit: query.per_page },
    query.per_page,
    rows.length,
  );
  return createPage(
    await batch(c, operation, rows, {}, 100, async (row) => await normalize(row)),
    metadata,
  );
}

/** Paginate documented endpoints missing from the generated OpenAPI. */
export async function extraPage<V extends GitLabVersion, T>(
  c: GitLabAdapterContext<V>,
  operation: string,
  route: string,
  input: RestOperationInput,
  request: ResolvedPageRequest,
  normalize: (p: Dto) => T | Promise<T>,
) {
  const query = pageQuery(c, operation, request);
  const response = await extra(c, operation, "GET", route, {
    ...input,
    query: { ...input.query, ...query },
  }, request);
  const rows = array(c, operation, response.body);
  if (rows.length > query.per_page) {
    invariant(c, operation, "GitLab exceeded the requested page size");
  }
  return createPage(
    await batch(c, operation, rows, {}, 100, async (row) => await normalize(row)),
    gitlabPagination(
      c,
      { universal: operation },
      response,
      { page: query.page, effectiveLimit: query.per_page },
      query.per_page,
      rows.length,
    ),
  );
}
