import type { Hook as Hook15 } from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type { Hook as Hook16 } from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

/** Exact generated repository-webhook payload selected by the configured Forgejo version. */
export type ForgejoRepositoryWebhookPayload<TVersion extends ForgejoVersion> = TVersion extends
  "15.0.7" ? Hook15
  : Hook16;

/** Exact client and already-fetched webhook payload retained by the optional capability. */
export interface ForgejoRepositoryWebhookNativeContext<TVersion extends ForgejoVersion> {
  readonly client: ForgejoClient<TVersion>;
  readonly repositoryWebhook: ForgejoRepositoryWebhookPayload<TVersion>;
}

/** Forgejo-only native door for one repository webhook. */
export interface ForgejoRepositoryWebhookNative<TVersion extends ForgejoVersion> {
  forgejo<TResult>(
    use: (
      context: ForgejoRepositoryWebhookNativeContext<TVersion>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Retain an exact webhook payload without issuing a refresh request. */
export function createForgejoRepositoryWebhookNative<TVersion extends ForgejoVersion>(
  context: ForgejoRepositoryWebhookNativeContext<TVersion>,
): ForgejoRepositoryWebhookNative<TVersion> {
  const frozen = Object.freeze(context);
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoRepositoryWebhookNativeContext<TVersion>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(frozen);
    },
  });
}
