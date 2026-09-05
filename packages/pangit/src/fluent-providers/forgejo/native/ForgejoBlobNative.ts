import type { GitBlob as GitBlob15 } from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type { GitBlob as GitBlob16 } from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

/** Exact generated blob payload selected by the configured Forgejo version. */
export type ForgejoBlobPayload<TVersion extends ForgejoVersion> = TVersion extends "15.0.7"
  ? GitBlob15
  : GitBlob16;

export type ForgejoBlobNativeContext<TVersion extends ForgejoVersion> = Readonly<{
  client: ForgejoClient<TVersion>;
  blob: ForgejoBlobPayload<TVersion>;
}>;

/** Exact native door retained by one SHA-addressed blob read. */
export interface ForgejoBlobNative<TVersion extends ForgejoVersion> {
  forgejo<TResult>(
    use: (context: ForgejoBlobNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoBlobNative<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  blob: ForgejoBlobPayload<TVersion>,
): ForgejoBlobNative<TVersion> {
  const context = Object.freeze({ client, blob });
  return Object.freeze({
    async forgejo<TResult>(
      use: (value: ForgejoBlobNativeContext<TVersion>) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
