import type {
  Attachment as Attachment126,
  Release as Release126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  Attachment as Attachment127,
  Release as Release127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaReleaseEntityKind = "release" | "releaseAsset";

type Gitea126ReleasePayloads = { release: Release126; releaseAsset: Attachment126 };
type Gitea127ReleasePayloads = { release: Release127; releaseAsset: Attachment127 };

export type GiteaReleaseEntityPayload<
  TVersion extends GiteaVersion,
  TKind extends GiteaReleaseEntityKind,
> = TVersion extends "1.26.4" ? Gitea126ReleasePayloads[TKind]
  : Gitea127ReleasePayloads[TKind];

export type GiteaReleaseEntityNativeContext<
  TVersion extends GiteaVersion,
  TKind extends GiteaReleaseEntityKind,
> = Readonly<
  & { client: GiteaClient<TVersion> }
  & { [TKey in TKind]: GiteaReleaseEntityPayload<TVersion, TKind> }
>;

export interface GiteaReleaseEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaReleaseEntityKind,
> {
  gitea<TResult>(
    use: (
      context: GiteaReleaseEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaReleaseEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaReleaseEntityKind,
>(
  kind: TKind,
  client: GiteaClient<TVersion>,
  payload: GiteaReleaseEntityPayload<TVersion, TKind>,
): GiteaReleaseEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as GiteaReleaseEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaReleaseEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
