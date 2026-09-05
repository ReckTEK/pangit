import type {
  Attachment as Attachment15,
  Release as Release15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  Attachment as Attachment16,
  Release as Release16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoReleaseEntityKind = "release" | "releaseAsset";

type Forgejo15ReleasePayloads = { release: Release15; releaseAsset: Attachment15 };
type Forgejo16ReleasePayloads = { release: Release16; releaseAsset: Attachment16 };

export type ForgejoReleaseEntityPayload<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoReleaseEntityKind,
> = TVersion extends "15.0.7" ? Forgejo15ReleasePayloads[TKind]
  : Forgejo16ReleasePayloads[TKind];

export type ForgejoReleaseEntityNativeContext<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoReleaseEntityKind,
> = Readonly<
  & { client: ForgejoClient<TVersion> }
  & { [TKey in TKind]: ForgejoReleaseEntityPayload<TVersion, TKind> }
>;

export interface ForgejoReleaseEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoReleaseEntityKind,
> {
  forgejo<TResult>(
    use: (
      context: ForgejoReleaseEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoReleaseEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoReleaseEntityKind,
>(
  kind: TKind,
  client: ForgejoClient<TVersion>,
  payload: ForgejoReleaseEntityPayload<TVersion, TKind>,
): ForgejoReleaseEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as ForgejoReleaseEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoReleaseEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
