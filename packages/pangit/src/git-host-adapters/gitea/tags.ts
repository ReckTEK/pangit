import type { AnyRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import { ProviderInvariantError } from "../../fluent-api/adapter-contract/errors.ts";
import { requireIdentity } from "../../fluent-api/adapter-contract/operation-options.ts";
import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import type { CreateTagInput, TagData } from "../../fluent-api/adapter-contract/tags.ts";
import type { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "./native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "./response.ts";

type AnyGiteaTag = GiteaEntityPayload<GiteaVersion, "tag">;

/** Read exactly one provider tag page. */
export async function listGiteaTags<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<TagData<"gitea", TVersion>>> {
  const operation = { universal: "listTags", native: "repoListTags" } as const;
  const path = repositoryPath(repository);
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
      client.repoListTags(
        {
          path,
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireTagArray(context, operation.universal, response);
  return createPage(
    payloads.map((payload) => normalizeGiteaTag(client, payload as AnyGiteaTag)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one tag directly without fetching annotated-tag details implicitly. */
export async function getGiteaTag<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<TagData<"gitea", TVersion>> {
  const operation = { universal: "getTag", native: "repoGetTag" } as const;
  const tagName = requireIdentity(name, "tag name");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaTag, TVersion>(
    context,
    operation,
    () =>
      client.repoGetTag(
        { path: { ...path, tag: tagName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isTagPayload,
  );
  return normalizeGiteaTag(client, payload);
}

/** Create one annotated tag using only the common Gitea tag-create fields. */
export async function createGiteaTag<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreateTagInput,
  options: OperationOptions = {},
): Promise<TagData<"gitea", TVersion>> {
  const operation = { universal: "createTag", native: "repoCreateTag" } as const;
  const name = requireIdentity(input.name, "tag name");
  const target = requireIdentity(input.target, "tag target");
  const message = requireIdentity(input.message, "tag message");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaTag, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateTag(
        {
          path,
          body: {
            mediaType: "application/json",
            value: { tag_name: name, target, message },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isTagPayload,
  );
  return normalizeGiteaTag(client, payload, true);
}

/** Delete one known tag directly without a lookup preflight. */
export async function deleteGiteaTag<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  tag: TagData<"gitea", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteTag", native: "repoDeleteTag" } as const;
  const path = repositoryPath(repository);
  const tagName = requireIdentity(tag.name, "tag name");
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDeleteTag(
        { path: { ...path, tag: tagName } },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Normalize one exact generated tag payload without guessing lightweight/annotated state. */
export function normalizeGiteaTag<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  tag: AnyGiteaTag,
  annotated?: true,
): TagData<"gitea", TVersion> {
  const name = requiredText(tag.name, "tag name");
  const sha = requiredText(tag.commit?.sha, `tag ${name} target SHA`);
  const message = optionalText(tag.message);
  return Object.freeze({
    name,
    sha,
    ...(message === undefined ? {} : { message }),
    ...(annotated === undefined ? {} : { annotated }),
    native: createGiteaEntityNative(
      "tag",
      client,
      tag as GiteaEntityPayload<TVersion, "tag">,
    ),
  });
}

function requireTagArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaTag[] {
  if (Array.isArray(response.body) && response.body.every(isTagPayload)) return response.body;
  throw new ProviderInvariantError(`${operation} returned malformed tag data`, {
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

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
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

function isTagPayload(value: unknown): value is AnyGiteaTag {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const tag = value as AnyGiteaTag;
  return hasText(tag.name) && hasText(tag.commit?.sha);
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}
