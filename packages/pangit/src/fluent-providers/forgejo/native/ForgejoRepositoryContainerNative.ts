import type {
  Organization as Organization15,
  User as User15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  Organization as Organization16,
  User as User16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoUserPayload<TVersion extends ForgejoVersion> = TVersion extends "15.0.7" ? User15
  : User16;

export type ForgejoOrganizationPayload<TVersion extends ForgejoVersion> = TVersion extends "15.0.7"
  ? Organization15
  : Organization16;

export type ForgejoRepositoryContainerNativeContext<TVersion extends ForgejoVersion> =
  | Readonly<{
    client: ForgejoClient<TVersion>;
    kind: "user";
    container: ForgejoUserPayload<TVersion>;
  }>
  | Readonly<{
    client: ForgejoClient<TVersion>;
    kind: "organization";
    container: ForgejoOrganizationPayload<TVersion>;
  }>;

export interface ForgejoRepositoryContainerNative<TVersion extends ForgejoVersion> {
  forgejo<TResult>(
    use: (
      context: ForgejoRepositoryContainerNativeContext<TVersion>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoRepositoryContainerNative<TVersion extends ForgejoVersion>(
  context: ForgejoRepositoryContainerNativeContext<TVersion>,
): ForgejoRepositoryContainerNative<TVersion> {
  const frozen = Object.freeze(context);
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoRepositoryContainerNativeContext<TVersion>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(frozen);
    },
  });
}
