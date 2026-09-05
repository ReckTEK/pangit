import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export interface ForgejoClientNativeContext<TVersion extends ForgejoVersion> {
  readonly client: ForgejoClient<TVersion>;
}

/** Full exact-version raw access at fluent-client scope. */
export interface ForgejoClientNative<TVersion extends ForgejoVersion> {
  forgejo<TResult>(
    use: (context: ForgejoClientNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoClientNative<TVersion extends ForgejoVersion>(
  getClient: () => Promise<ForgejoClient<TVersion>>,
): ForgejoClientNative<TVersion> {
  return Object.freeze({
    async forgejo<TResult>(
      use: (context: ForgejoClientNativeContext<TVersion>) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(Object.freeze({ client: await getClient() }));
    },
  });
}
