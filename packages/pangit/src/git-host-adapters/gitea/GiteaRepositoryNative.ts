import type { RestClientTypeMap } from "../../generated-rest-clients/rest-client-type-map.ts";
import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";

type GiteaVersion = ProviderVersion<"gitea">;
type MaybePromise<TValue> = TValue | Promise<TValue>;

/** Exact generated Gitea repository payload for the selected Gitea version. */
export type GiteaRepositoryPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? import("../../generated-rest-clients/gitea/1.26.4/mod.ts").Repository
  : TVersion extends "1.27.2"
    ? import("../../generated-rest-clients/gitea/1.27.2/mod.ts").Repository
  : never;

/** Exact generated client and repository payload supplied to a Gitea native callback. */
export interface GiteaRepositoryNativeContext<TVersion extends GiteaVersion> {
  /** Authenticated or anonymous generated client backing the fluent entity. */
  readonly client: RestClientTypeMap["gitea"][TVersion];
  /** Exact generated repository payload already fetched by the common API. */
  readonly repository: GiteaRepositoryPayload<TVersion>;
}

/** Gitea-only operations available from a Gitea repository entity. */
export interface GiteaRepositoryNative<TVersion extends GiteaVersion> {
  /** Run a callback with the exact selected Gitea client and repository payload. */
  gitea<TResult>(
    use: (context: GiteaRepositoryNativeContext<TVersion>) => MaybePromise<TResult>,
  ): Promise<TResult>;
}
