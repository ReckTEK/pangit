import type {
  CreateRepositoryWebhookInput,
  RepositoryWebhookCapabilitySupport,
  RepositoryWebhookData,
  RepositoryWebhookEvent,
  UpdateRepositoryWebhookInput,
} from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { ResolvedPageRequest } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaRepositoryWebhookNative,
  type GiteaRepositoryWebhookPayload,
} from "../native/GiteaRepositoryWebhookNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../response.ts";

type AnyGiteaWebhook = GiteaRepositoryWebhookPayload<GiteaVersion>;

export const giteaRepositoryWebhookSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    list: "one-page",
    get: "direct",
    create: "direct",
    update: "direct",
    delete: "direct",
  }),
  providerConfiguration: "native-only",
  deliveryInspection: "native-only",
  testDelivery: "native-only",
}) satisfies RepositoryWebhookCapabilitySupport;

/** Fetch exactly one requested page of repository webhooks. */
export async function listGiteaRepositoryWebhooks<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryWebhookData<"gitea", TVersion>>> {
  const operation = { universal: "listRepositoryWebhooks", native: "repoListHooks" } as const;
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
      client.repoListHooks(
        {
          path: repositoryPath(repository),
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireWebhookArray(context, operation.universal, response.body);
  return createPage(
    payloads.map((payload) => normalizeGiteaRepositoryWebhook(client, payload)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one known webhook directly by exact ID. */
export async function getGiteaRepositoryWebhook<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<RepositoryWebhookData<"gitea", TVersion>> {
  const operation = { universal: "getRepositoryWebhook", native: "repoGetHook" } as const;
  const hookId = parseGiteaId(id, "webhook id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaWebhook, TVersion>(
    context,
    operation,
    () =>
      client.repoGetHook(
        { path: { ...repositoryPath(repository), id: hookId } },
        requestOptions(options.signal),
      ),
    options.signal,
    isWebhookPayload,
  );
  return normalizeGiteaRepositoryWebhook(client, payload);
}

/** Create one portable JSON/form webhook; provider hook kinds remain internal. */
export async function createGiteaRepositoryWebhook<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreateRepositoryWebhookInput,
  options: OperationOptions = {},
): Promise<RepositoryWebhookData<"gitea", TVersion>> {
  const operation = { universal: "createRepositoryWebhook", native: "repoCreateHook" } as const;
  const url = validateUrl(input.url);
  const events = validateEvents(input.events);
  const contentType = input.contentType ?? "json";
  const name = input.name === undefined ? undefined : requireIdentity(input.name, "webhook name");
  const secret = input.secret === undefined
    ? undefined
    : requireIdentity(input.secret, "webhook secret");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaWebhook, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateHook(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              type: "gitea",
              active: input.active ?? true,
              ...(name === undefined ? {} : { name }),
              events: events.map(toGiteaEvent),
              config: {
                url,
                content_type: contentType,
                ...(secret === undefined ? {} : { secret }),
              },
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isWebhookPayload,
  );
  return normalizeGiteaRepositoryWebhook(client, payload);
}

/** Update one known webhook in one request, retaining its known URL when config changes. */
export async function updateGiteaRepositoryWebhook<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  webhook: RepositoryWebhookData<"gitea", TVersion>,
  input: UpdateRepositoryWebhookInput,
  options: OperationOptions = {},
): Promise<RepositoryWebhookData<"gitea", TVersion>> {
  const operation = { universal: "updateRepositoryWebhook", native: "repoEditHook" } as const;
  if (
    input.url === undefined && input.events === undefined && input.active === undefined &&
    input.name === undefined && input.contentType === undefined
  ) {
    throw new TypeError("webhook update must change at least one field");
  }
  const hookId = parseGiteaId(webhook.id, "webhook id");
  const updatesConfig = input.url !== undefined || input.contentType !== undefined;
  const events = input.events === undefined ? undefined : validateEvents(input.events);
  const name = input.name === undefined ? undefined : requireIdentity(input.name, "webhook name");
  const url = input.url === undefined ? webhook.url : validateUrl(input.url);
  const currentConfig = await webhook.native.gitea(({ repositoryWebhook }) =>
    Object.freeze({ ...(repositoryWebhook.config ?? {}) })
  );
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaWebhook, TVersion>(
    context,
    operation,
    () =>
      client.repoEditHook(
        {
          path: {
            ...repositoryPath(repository),
            id: hookId,
          },
          body: {
            mediaType: "application/json",
            value: {
              ...(input.active === undefined ? {} : { active: input.active }),
              ...(name === undefined ? {} : { name }),
              ...(events === undefined ? {} : { events: events.map(toGiteaEvent) }),
              ...(updatesConfig
                ? {
                  config: {
                    ...currentConfig,
                    url,
                    content_type: input.contentType ?? webhook.providerContentType ?? "json",
                  },
                }
                : {}),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isWebhookPayload,
  );
  return normalizeGiteaRepositoryWebhook(client, payload);
}

/** Delete one known webhook without an existence preflight. */
export async function deleteGiteaRepositoryWebhook<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  webhook: RepositoryWebhookData<"gitea", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteRepositoryWebhook", native: "repoDeleteHook" } as const;
  const hookId = parseGiteaId(webhook.id, "webhook id");
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDeleteHook(
        {
          path: {
            ...repositoryPath(repository),
            id: hookId,
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

export function normalizeGiteaRepositoryWebhook<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaRepositoryWebhookPayload<TVersion>,
): RepositoryWebhookData<"gitea", TVersion> {
  if (!isWebhookPayload(payload)) throw new TypeError("malformed Gitea webhook payload");
  const providerEvents = Object.freeze([...(payload.events ?? [])]);
  const events = Object.freeze(
    providerEvents.map(fromGiteaEvent).filter((event): event is RepositoryWebhookEvent =>
      event !== undefined
    ),
  );
  const providerContentType = payload.config?.content_type;
  return Object.freeze({
    id: String(payload.id),
    url: payload.config!.url,
    active: payload.active!,
    ...(payload.name === undefined ? {} : { name: payload.name }),
    events,
    providerEvents,
    ...(providerContentType === "json" || providerContentType === "form"
      ? { contentType: providerContentType }
      : {}),
    ...(providerContentType === undefined ? {} : { providerContentType }),
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.updated_at === undefined ? {} : { updatedAt: payload.updated_at }),
    native: createGiteaRepositoryWebhookNative({ client, repositoryWebhook: payload }),
  });
}

function requireWebhookArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyGiteaWebhook[] {
  if (!Array.isArray(value) || !value.every(isWebhookPayload)) {
    throw new ProviderInvariantError("Gitea returned a malformed webhook list", {
      provider: "gitea",
      version: context.version,
      operation,
    });
  }
  return value;
}

function isWebhookPayload(value: unknown): value is AnyGiteaWebhook {
  if (typeof value !== "object" || value === null) return false;
  const hook = value as AnyGiteaWebhook;
  return (typeof hook.id === "number" || typeof hook.id === "bigint") && hook.id > 0 &&
    typeof hook.active === "boolean" && typeof hook.config === "object" &&
    hook.config !== null && typeof hook.config.url === "string" &&
    (hook.events === undefined ||
      (Array.isArray(hook.events) && hook.events.every((event) => typeof event === "string")));
}

function validateUrl(value: string | URL): string {
  const url = value instanceof URL
    ? new URL(value)
    : new URL(requireIdentity(value, "webhook URL"));
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new TypeError("webhook URL must be credential-free HTTP or HTTPS");
  }
  return url.href;
}

function validateEvents(
  events: readonly RepositoryWebhookEvent[],
): readonly RepositoryWebhookEvent[] {
  if (events.length === 0) throw new RangeError("webhook events cannot be empty");
  const valid = new Set<RepositoryWebhookEvent>(["push", "pull-request", "issue", "release"]);
  for (const event of events) {
    if (!valid.has(event)) throw new TypeError(`unsupported webhook event: ${event}`);
  }
  return Object.freeze([...new Set(events)]);
}

function toGiteaEvent(event: RepositoryWebhookEvent): string {
  return event === "pull-request" ? "pull_request" : event === "issue" ? "issues" : event;
}

function fromGiteaEvent(event: string): RepositoryWebhookEvent | undefined {
  return event === "pull_request"
    ? "pull-request"
    : event === "issues"
    ? "issue"
    : event === "push" || event === "release"
    ? event
    : undefined;
}

function parseGiteaId(value: string, name: string): bigint {
  const normalized = requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(normalized)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(normalized);
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
