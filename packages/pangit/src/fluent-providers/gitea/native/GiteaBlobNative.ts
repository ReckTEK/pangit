import type { GitBlobResponse as GitBlobResponse126 } from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type { GitBlobResponse as GitBlobResponse127 } from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

/** Exact generated blob payload selected by the configured Gitea version. */
export type GiteaBlobPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? GitBlobResponse126
  : GitBlobResponse127;

export type GiteaBlobNativeContext<TVersion extends GiteaVersion> = Readonly<{
  client: GiteaClient<TVersion>;
  blob: GiteaBlobPayload<TVersion>;
}>;

/** Exact native door retained by one SHA-addressed blob read. */
export interface GiteaBlobNative<TVersion extends GiteaVersion> {
  gitea<TResult>(
    use: (context: GiteaBlobNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaBlobNative<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  blob: GiteaBlobPayload<TVersion>,
): GiteaBlobNative<TVersion> {
  const context = Object.freeze({ client, blob });
  return Object.freeze({
    async gitea<TResult>(
      use: (value: GiteaBlobNativeContext<TVersion>) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
