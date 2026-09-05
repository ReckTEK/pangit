import type { Hook as Hook126 } from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type { Hook as Hook127 } from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

/** Exact generated repository-webhook payload selected by the configured Gitea version. */
export type GiteaRepositoryWebhookPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? Hook126
  : Hook127;

/** Exact client and already-fetched webhook payload retained by the optional capability. */
export interface GiteaRepositoryWebhookNativeContext<TVersion extends GiteaVersion> {
  readonly client: GiteaClient<TVersion>;
  readonly repositoryWebhook: GiteaRepositoryWebhookPayload<TVersion>;
}

/** Gitea-only native door for one repository webhook. */
export interface GiteaRepositoryWebhookNative<TVersion extends GiteaVersion> {
  gitea<TResult>(
    use: (
      context: GiteaRepositoryWebhookNativeContext<TVersion>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Retain an exact webhook payload without issuing a refresh request. */
export function createGiteaRepositoryWebhookNative<TVersion extends GiteaVersion>(
  context: GiteaRepositoryWebhookNativeContext<TVersion>,
): GiteaRepositoryWebhookNative<TVersion> {
  const frozen = Object.freeze(context);
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaRepositoryWebhookNativeContext<TVersion>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(frozen);
    },
  });
}
