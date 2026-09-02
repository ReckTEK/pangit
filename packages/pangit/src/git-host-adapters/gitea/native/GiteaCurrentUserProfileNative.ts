import type {
  User as User126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  User as User127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaCurrentUserProfilePayload<TVersion extends GiteaVersion> = TVersion extends
  "1.26.4" ? User126 : User127;

export interface GiteaCurrentUserProfileNative<TVersion extends GiteaVersion> {
  gitea<TResult>(
    use: (
      context: Readonly<{
        client: GiteaClient<TVersion>;
        currentUserProfile: GiteaCurrentUserProfilePayload<TVersion>;
      }>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaCurrentUserProfileNative<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  currentUserProfile: GiteaCurrentUserProfilePayload<TVersion>,
): GiteaCurrentUserProfileNative<TVersion> {
  const context = Object.freeze({ client, currentUserProfile });
  return Object.freeze({
    async gitea<TResult>(
      use: (value: typeof context) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
