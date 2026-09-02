import type { Provider, ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  ProviderRepositoryWebhookNative,
} from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest } from "../pagination.ts";
import type { RepositoryData } from "../repositories.ts";

export type {
  ProviderRepositoryWebhookNative,
} from "../../native-access/ProviderNativeRegistry.ts";

/** Portable webhook events whose trigger meaning is shared by the reviewed provider families. */
export type RepositoryWebhookEvent = "push" | "pull-request" | "issue" | "release";

export type RepositoryWebhookContentType = "json" | "form";

export interface RepositoryWebhookData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly url: string;
  readonly active: boolean;
  readonly name?: string;
  readonly events: readonly RepositoryWebhookEvent[];
  /** Exact provider event names, including events outside the portable vocabulary. */
  readonly providerEvents: readonly string[];
  readonly contentType?: RepositoryWebhookContentType;
  readonly providerContentType?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly native: ProviderRepositoryWebhookNative<TProvider, TVersion>;
}

export interface CreateRepositoryWebhookInput {
  readonly url: string | URL;
  readonly events: readonly RepositoryWebhookEvent[];
  readonly active?: boolean;
  readonly name?: string;
  readonly contentType?: RepositoryWebhookContentType;
  /** Shared secret sent to the provider but never retained in the normalized entity. */
  readonly secret?: string;
}

export interface UpdateRepositoryWebhookInput {
  readonly url?: string | URL;
  readonly events?: readonly RepositoryWebhookEvent[];
  readonly active?: boolean;
  readonly name?: string;
  readonly contentType?: RepositoryWebhookContentType;
}

export type RepositoryWebhookOperation = "list" | "get" | "create" | "update" | "delete";

/** Static, request-free support metadata for repository webhooks. */
export interface RepositoryWebhookCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<Record<RepositoryWebhookOperation, "direct" | "one-page">>;
  readonly providerConfiguration: "native-only";
  readonly deliveryInspection: "native-only";
  readonly testDelivery: "native-only";
}

/** Optional shared repository-webhook adapter contract. */
export interface RepositoryWebhookAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly repositoryWebhookSupport: RepositoryWebhookCapabilitySupport;
  listRepositoryWebhooks(
    repository: RepositoryData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<Page<RepositoryWebhookData<TProvider, TVersion>>>;
  getRepositoryWebhook(
    repository: RepositoryData<TProvider, TVersion>,
    id: string,
    options?: OperationOptions,
  ): Promise<RepositoryWebhookData<TProvider, TVersion>>;
  createRepositoryWebhook(
    repository: RepositoryData<TProvider, TVersion>,
    input: CreateRepositoryWebhookInput,
    options?: OperationOptions,
  ): Promise<RepositoryWebhookData<TProvider, TVersion>>;
  updateRepositoryWebhook(
    repository: RepositoryData<TProvider, TVersion>,
    webhook: RepositoryWebhookData<TProvider, TVersion>,
    input: UpdateRepositoryWebhookInput,
    options?: OperationOptions,
  ): Promise<RepositoryWebhookData<TProvider, TVersion>>;
  deleteRepositoryWebhook(
    repository: RepositoryData<TProvider, TVersion>,
    webhook: RepositoryWebhookData<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<void>;
}
