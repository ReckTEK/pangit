import type {
  Repository as Repository126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  Repository as Repository127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaRepositoryPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? Repository126
  : Repository127;

export interface GiteaRepositoryNativeContext<TVersion extends GiteaVersion> {
  readonly client: GiteaClient<TVersion>;
  readonly repository: GiteaRepositoryPayload<TVersion>;
}

export interface GiteaRepositoryNative<TVersion extends GiteaVersion> {
  gitea<TResult>(
    use: (context: GiteaRepositoryNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaRepositoryNative<TVersion extends GiteaVersion>(
  context: GiteaRepositoryNativeContext<TVersion>,
): GiteaRepositoryNative<TVersion> {
  const frozen = Object.freeze(context);
  return Object.freeze({
    async gitea<TResult>(
      use: (value: GiteaRepositoryNativeContext<TVersion>) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(frozen);
    },
  });
}
