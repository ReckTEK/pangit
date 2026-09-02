import type { RestClientTypeMap } from "../../../providers/clients.ts";
import type { ProviderVersion } from "../../../providers/provider.ts";

type GiteaVersion = ProviderVersion<"gitea">;
type MaybePromise<TValue> = TValue | Promise<TValue>;

/** Exact generated Gitea organization payload for the selected Gitea version. */
export type GiteaOrganizationPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? import("../../../providers/gitea/1.26.4/mod.ts").Organization
  : TVersion extends "1.27.2" ? import("../../../providers/gitea/1.27.2/mod.ts").Organization
  : never;

/** Exact generated Gitea user payload for the selected Gitea version. */
export type GiteaUserPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? import("../../../providers/gitea/1.26.4/mod.ts").User
  : TVersion extends "1.27.2" ? import("../../../providers/gitea/1.27.2/mod.ts").User
  : never;

/** Exact generated client and repository-container payload supplied to a Gitea native callback. */
export type GiteaRepositoryContainerNativeContext<TVersion extends GiteaVersion> =
  | {
    readonly client: RestClientTypeMap["gitea"][TVersion];
    readonly kind: "user";
    readonly container: GiteaUserPayload<TVersion>;
  }
  | {
    readonly client: RestClientTypeMap["gitea"][TVersion];
    readonly kind: "organization";
    readonly container: GiteaOrganizationPayload<TVersion>;
  };

/** Gitea-only operations available from a Gitea repository container. */
export interface GiteaRepositoryContainerNative<TVersion extends GiteaVersion> {
  /** Run a callback with the exact selected Gitea client and container payload. */
  gitea<TResult>(
    use: (context: GiteaRepositoryContainerNativeContext<TVersion>) => MaybePromise<TResult>,
  ): Promise<TResult>;
}
