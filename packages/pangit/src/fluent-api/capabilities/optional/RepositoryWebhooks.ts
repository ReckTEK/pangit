import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import { ValidationError, type ValidationErrorContext } from "../../adapter-contract/errors.ts";
import type { OperationOptions } from "../../adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";
import type { Page, PageRequest } from "../../adapter-contract/pagination.ts";
import { createPage, resolvePageRequest } from "../../adapter-contract/pagination.ts";
import type {
  CreateRepositoryWebhookInput,
  RepositoryWebhookAdapter,
  RepositoryWebhookCapabilitySupport,
  RepositoryWebhookData,
  RepositoryWebhookEvent,
  UpdateRepositoryWebhookInput,
} from "../../adapter-contract/optional/repository-webhooks.ts";
import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import {
  createRepositoryWebhook,
  type RepositoryWebhook,
} from "../../entities/optional/RepositoryWebhook.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface RepositoryWebhooks<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: RepositoryWebhookCapabilitySupport;
  list(request?: PageRequest): Promise<Page<RepositoryWebhook<TProvider, TVersion>>>;
  get(id: string, options?: OperationOptions): Promise<RepositoryWebhook<TProvider, TVersion>>;
  create(
    input: CreateRepositoryWebhookInput,
    options?: OperationOptions,
  ): Promise<RepositoryWebhook<TProvider, TVersion>>;
  update(
    webhook: RepositoryWebhook<TProvider, TVersion>,
    input: UpdateRepositoryWebhookInput,
    options?: OperationOptions,
  ): Promise<RepositoryWebhook<TProvider, TVersion>>;
  delete(
    webhook: RepositoryWebhook<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<void>;
}

export function createRepositoryWebhooks<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: RepositoryWebhookAdapter<TProvider, TVersion> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  },
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryWebhooks<TProvider, TVersion> {
  const validationContext = (
    operation: string,
  ): ValidationErrorContext<TProvider, TVersion> => ({
    operation,
    ...(adapter.provider === undefined ? {} : { provider: adapter.provider }),
    ...(adapter.version === undefined ? {} : { version: adapter.version }),
  });
  const resolveRequest = (request: PageRequest, operation: string) => {
    if (request.limit !== undefined) {
      requirePositiveInteger(request.limit, "page limit", validationContext(operation));
    }
    return resolvePageRequest(request, 50, validationContext(operation));
  };
  const data = (
    webhook: RepositoryWebhook<TProvider, TVersion>,
  ): RepositoryWebhookData<TProvider, TVersion> => ({
    ...webhook,
    events: [...webhook.events],
    providerEvents: [...webhook.providerEvents],
    native: webhook.native,
  });
  return Object.freeze({
    support: adapter.repositoryWebhookSupport,
    async list(request: PageRequest = {}) {
      const page = await adapter.listRepositoryWebhooks(
        repository,
        resolveRequest(request, "listRepositoryWebhooks"),
      );
      return createPage(page.items.map(createRepositoryWebhook), page);
    },
    async get(id: string, options: OperationOptions = {}) {
      return createRepositoryWebhook(
        await adapter.getRepositoryWebhook(
          repository,
          requireIdentity(
            id,
            "repository webhook id",
            validationContext("getRepositoryWebhook"),
          ),
          options,
        ),
      );
    },
    async create(input: CreateRepositoryWebhookInput, options: OperationOptions = {}) {
      const validated = validateCreateInput(
        input,
        validationContext("createRepositoryWebhook"),
      );
      return createRepositoryWebhook(
        await adapter.createRepositoryWebhook(repository, validated, options),
      );
    },
    async update(
      webhook: RepositoryWebhook<TProvider, TVersion>,
      input: UpdateRepositoryWebhookInput,
      options: OperationOptions = {},
    ) {
      return createRepositoryWebhook(
        await adapter.updateRepositoryWebhook(
          repository,
          data(webhook),
          validateUpdateInput(input, validationContext("updateRepositoryWebhook")),
          options,
        ),
      );
    },
    delete(
      webhook: RepositoryWebhook<TProvider, TVersion>,
      options: OperationOptions = {},
    ) {
      return adapter.deleteRepositoryWebhook(repository, data(webhook), options);
    },
  });
}

export function validateRepositoryWebhookUrl(
  value: string | URL,
  context: ValidationErrorContext = { operation: "createRepositoryWebhook" },
): string {
  let url: URL;
  try {
    url = value instanceof URL
      ? new URL(value)
      : new URL(requireIdentity(value, "webhook URL", context));
  } catch (cause) {
    if (cause instanceof ValidationError) throw cause;
    throw new ValidationError("webhook URL must be a valid absolute URL", {
      ...context,
      cause,
    });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ValidationError("webhook URL must use HTTP or HTTPS", context);
  }
  if (url.username !== "" || url.password !== "") {
    throw new ValidationError("webhook URL cannot contain credentials", context);
  }
  return url.href;
}

export function validateRepositoryWebhookEvents(
  events: readonly RepositoryWebhookEvent[],
  context: ValidationErrorContext = { operation: "createRepositoryWebhook" },
): readonly RepositoryWebhookEvent[] {
  if (events.length === 0) {
    throw new ValidationError("webhook events cannot be empty", context);
  }
  const supported = new Set<RepositoryWebhookEvent>(["push", "pull-request", "issue", "release"]);
  const unique: RepositoryWebhookEvent[] = [];
  for (const event of events) {
    if (!supported.has(event)) {
      throw new ValidationError(`unsupported webhook event: ${event}`, context);
    }
    if (!unique.includes(event)) unique.push(event);
  }
  return Object.freeze(unique);
}

function validateCreateInput(
  input: CreateRepositoryWebhookInput,
  context: ValidationErrorContext,
): CreateRepositoryWebhookInput {
  return Object.freeze({
    url: validateRepositoryWebhookUrl(input.url, context),
    events: validateRepositoryWebhookEvents(input.events, context),
    ...(input.active === undefined ? {} : { active: input.active }),
    ...(input.name === undefined
      ? {}
      : { name: requireIdentity(input.name, "webhook name", context) }),
    ...(input.contentType === undefined ? {} : { contentType: input.contentType }),
    ...(input.secret === undefined
      ? {}
      : { secret: requireIdentity(input.secret, "webhook secret", context) }),
  });
}

function validateUpdateInput(
  input: UpdateRepositoryWebhookInput,
  context: ValidationErrorContext,
): UpdateRepositoryWebhookInput {
  if (
    input.url === undefined && input.events === undefined && input.active === undefined &&
    input.name === undefined && input.contentType === undefined
  ) {
    throw new ValidationError("webhook update must change at least one field", context);
  }
  return Object.freeze({
    ...(input.url === undefined ? {} : { url: validateRepositoryWebhookUrl(input.url, context) }),
    ...(input.events === undefined
      ? {}
      : { events: validateRepositoryWebhookEvents(input.events, context) }),
    ...(input.active === undefined ? {} : { active: input.active }),
    ...(input.name === undefined
      ? {}
      : { name: requireIdentity(input.name, "webhook name", context) }),
    ...(input.contentType === undefined ? {} : { contentType: input.contentType }),
  });
}
