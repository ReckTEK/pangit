import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export interface GiteaClientNativeContext<TVersion extends GiteaVersion> {
  readonly client: GiteaClient<TVersion>;
}

/** Full exact-version raw access at fluent-client scope. */
export interface GiteaClientNative<TVersion extends GiteaVersion> {
  gitea<TResult>(
    use: (context: GiteaClientNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaClientNative<TVersion extends GiteaVersion>(
  getClient: () => Promise<GiteaClient<TVersion>>,
): GiteaClientNative<TVersion> {
  return Object.freeze({
    async gitea<TResult>(
      use: (context: GiteaClientNativeContext<TVersion>) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(Object.freeze({ client: await getClient() }));
    },
  });
}
