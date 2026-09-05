import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import type {
  ProviderRepositoryWebhookNative,
  RepositoryWebhookContentType,
  RepositoryWebhookData,
  RepositoryWebhookEvent,
} from "../../adapter-contract/optional/repository-webhooks.ts";

/** Immutable normalized repository-webhook snapshot. */
export interface RepositoryWebhook<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly url: string;
  readonly active: boolean;
  readonly name?: string;
  readonly events: readonly RepositoryWebhookEvent[];
  readonly providerEvents: readonly string[];
  readonly contentType?: RepositoryWebhookContentType;
  readonly providerContentType?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly native: ProviderRepositoryWebhookNative<TProvider, TVersion>;
}

export function createRepositoryWebhook<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  data: RepositoryWebhookData<TProvider, TVersion>,
): RepositoryWebhook<TProvider, TVersion> {
  return Object.freeze({
    id: data.id,
    url: data.url,
    active: data.active,
    ...(data.name === undefined ? {} : { name: data.name }),
    events: Object.freeze([...data.events]),
    providerEvents: Object.freeze([...data.providerEvents]),
    ...(data.contentType === undefined ? {} : { contentType: data.contentType }),
    ...(data.providerContentType === undefined
      ? {}
      : { providerContentType: data.providerContentType }),
    ...(data.createdAt === undefined ? {} : { createdAt: data.createdAt }),
    ...(data.updatedAt === undefined ? {} : { updatedAt: data.updatedAt }),
    native: data.native,
  });
}
