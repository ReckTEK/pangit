import type {
  Repository as Repository15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  Repository as Repository16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoRepositoryPayload<TVersion extends ForgejoVersion> = TVersion extends "15.0.7"
  ? Repository15
  : Repository16;

export interface ForgejoRepositoryNativeContext<TVersion extends ForgejoVersion> {
  readonly client: ForgejoClient<TVersion>;
  readonly repository: ForgejoRepositoryPayload<TVersion>;
}

export interface ForgejoRepositoryNative<TVersion extends ForgejoVersion> {
  forgejo<TResult>(
    use: (context: ForgejoRepositoryNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoRepositoryNative<TVersion extends ForgejoVersion>(
  context: ForgejoRepositoryNativeContext<TVersion>,
): ForgejoRepositoryNative<TVersion> {
  const frozen = Object.freeze(context);
  return Object.freeze({
    async forgejo<TResult>(
      use: (value: ForgejoRepositoryNativeContext<TVersion>) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(frozen);
    },
  });
}
