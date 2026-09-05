import type {
  User as User15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  User as User16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoCurrentUserProfilePayload<TVersion extends ForgejoVersion> = TVersion extends
  "15.0.7" ? User15 : User16;

export interface ForgejoCurrentUserProfileNative<TVersion extends ForgejoVersion> {
  forgejo<TResult>(
    use: (
      context: Readonly<{
        client: ForgejoClient<TVersion>;
        currentUserProfile: ForgejoCurrentUserProfilePayload<TVersion>;
      }>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoCurrentUserProfileNative<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  currentUserProfile: ForgejoCurrentUserProfilePayload<TVersion>,
): ForgejoCurrentUserProfileNative<TVersion> {
  const context = Object.freeze({ client, currentUserProfile });
  return Object.freeze({
    async forgejo<TResult>(
      use: (value: typeof context) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
