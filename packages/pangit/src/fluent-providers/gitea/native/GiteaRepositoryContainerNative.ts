import type {
  Organization as Organization126,
  User as User126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  Organization as Organization127,
  User as User127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaUserPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4" ? User126
  : User127;

export type GiteaOrganizationPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? Organization126
  : Organization127;

export type GiteaRepositoryContainerNativeContext<TVersion extends GiteaVersion> =
  | Readonly<{
    client: GiteaClient<TVersion>;
    kind: "user";
    container: GiteaUserPayload<TVersion>;
  }>
  | Readonly<{
    client: GiteaClient<TVersion>;
    kind: "organization";
    container: GiteaOrganizationPayload<TVersion>;
  }>;

export interface GiteaRepositoryContainerNative<TVersion extends GiteaVersion> {
  gitea<TResult>(
    use: (
      context: GiteaRepositoryContainerNativeContext<TVersion>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaRepositoryContainerNative<TVersion extends GiteaVersion>(
  context: GiteaRepositoryContainerNativeContext<TVersion>,
): GiteaRepositoryContainerNative<TVersion> {
  const frozen = Object.freeze(context);
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaRepositoryContainerNativeContext<TVersion>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(frozen);
    },
  });
}
