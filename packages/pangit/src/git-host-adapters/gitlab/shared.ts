import type { GitHostAdapter } from "../../fluent-api/adapter-contract/GitHostAdapter.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import { requirePositiveInteger } from "../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type ResolvedPageRequest,
} from "../../fluent-api/adapter-contract/pagination.ts";
import {
  CapabilityUnavailableError,
  NotFoundError,
  ProviderInvariantError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import type {
  AnyRestResponse,
  RestGeneratedRequestOptions,
  RestJsonData,
  RestOperationInput,
} from "../../generated-rest-clients/runtime/mod.ts";
import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import {
  type GitLabClient,
  type GitLabEntityKind,
  type GitLabPayload,
  type GitLabVersion,
  native,
} from "./native/GitLabNative.ts";
import { decodeGitLabPageCursor, gitlabPagination, requestGitLab } from "./response.ts";
import { supplementalOperation } from "./supplemental.ts";

export type Adapter<V extends GitLabVersion> = GitHostAdapter<"gitlab", V>;
export type Repo<V extends GitLabVersion> = RepositoryData<"gitlab", V>;
export type Dto = Record<string, unknown>;
type Client = GitLabClient<"18.11.11">;
export type Method = {
  [K in keyof Client]: Client[K] extends (...a: never[]) => Promise<AnyRestResponse> ? K : never;
}[keyof Client];
type Input<M extends Method> = M extends "postApiV4ProjectsIdRepositoryCommits" ? {
    path: { id: string };
    body: {
      mediaType: "application/json";
      value: {
        branch: string;
        commit_message: string;
        start_branch?: string;
        start_sha?: string;
        force?: boolean;
        author_name?: string;
        author_email?: string;
        actions: {
          action: "create" | "update" | "delete" | "move";
          file_path: string;
          previous_path?: string;
          content?: string;
          encoding?: "base64";
          last_commit_id?: string;
        }[];
      };
    };
  }
  : M extends "getApiV4ProjectsIdRepositoryBranchesBranch"
    ? { path: { id: string; branch: string } }
  : Parameters<Client[M]>[0];

/** Small typed transport bridge; operation inputs are checked against the older shared API. */
export async function call<V extends GitLabVersion, M extends Method>(
  c: GitLabAdapterContext<V>,
  operation: string,
  method: M,
  input: Input<M>,
  options: OperationOptions = {},
) {
  const client = await c.client();
  const execute = (client as Client)[method] as unknown as (
    input: Input<M>,
    options: RestGeneratedRequestOptions,
  ) => Promise<AnyRestResponse>;
  return await requestGitLab(
    c,
    { universal: operation, native: method },
    () => execute.call(client, input, { signal: options.signal }),
    options.signal,
  );
}
export async function extra<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  operation: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  input: RestOperationInput = {},
  options: OperationOptions = {},
) {
  const client = await c.client();
  const endpoint = supplementalOperation(method, path);
  return await requestGitLab(
    c,
    { universal: operation, native: endpoint.id },
    () => client.rest.request(endpoint, input, { signal: options.signal }),
    options.signal,
  );
}
export function context(c: GitLabAdapterContext<GitLabVersion>, operation: string) {
  return { provider: "gitlab" as const, version: c.version, operation };
}
export function unavailable(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  reason: string,
): never {
  throw new CapabilityUnavailableError(reason, context(c, operation));
}
export function invalid(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  reason: string,
): never {
  throw new ValidationError(reason, context(c, operation));
}
export function invariant(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  reason: string,
): never {
  throw new ProviderInvariantError(reason, context(c, operation));
}
export function object(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): Dto {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invariant(c, operation, "GitLab returned a malformed object");
  }
  return value as Dto;
}
export function array(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): Dto[] {
  if (!Array.isArray(value)) {
    return invariant(c, operation, "GitLab returned a malformed collection");
  }
  return value.map((v) => object(c, operation, v));
}
export function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
export function id(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "bigint" && value >= 0n) return String(value);
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return invariant(c, operation, "GitLab returned a missing or unsafe identity");
}
export function number(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): number {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) {
    return invariant(c, operation, "GitLab returned an invalid count");
  }
  return n;
}
export function required(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): string {
  if (typeof value !== "string") return invariant(c, operation, "GitLab returned a missing string");
  return value;
}
export async function door<V extends GitLabVersion, K extends GitLabEntityKind>(
  c: GitLabAdapterContext<V>,
  kind: K,
  payload: unknown,
) {
  return native(await c.client(), kind, payload as GitLabPayload<V, K>);
}
export function body<T extends object>(value: T) {
  const clean = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
  return {
    mediaType: "application/json" as const,
    value: clean as T & Record<string, RestJsonData>,
  };
}
export function path<V extends GitLabVersion>(r: Repo<V>) {
  return { id: r.id };
}
export async function optional<T>(action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action();
  } catch (e) {
    if (e instanceof NotFoundError) return undefined;
    throw e;
  }
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
/** Bound batch work and preserve input order, including duplicates. */
export async function batch<T, R>(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  values: readonly T[],
  options: { maxItems?: number; concurrency?: number },
  maximum: number,
  map: (v: T) => Promise<R>,
) {
  const bound = requirePositiveInteger(
    options.maxItems ?? maximum,
    "maxItems",
    context(c, operation),
  );
  const concurrency = Math.min(
    requirePositiveInteger(options.concurrency ?? 4, "concurrency", context(c, operation)),
    4,
  );
  if (values.length > bound) invalid(c, operation, "Batch exceeds maxItems");
  const result: R[] = new Array(values.length);
  let next = 0;
  let stopped = false;
  let failed = false;
  let failure: unknown;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (!stopped && next < values.length) {
      const index = next++;
      try {
        result[index] = await map(values[index]);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
        stopped = true;
      }
    }
  }));
  if (failed) throw failure;
  return Object.freeze(result);
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
export function numericId(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: string,
) {
  if (!/^\d+$/.test(value)) invalid(c, operation, "GitLab operation requires a numeric ID");
  return number(c, operation, BigInt(value));
}
