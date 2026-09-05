import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import type { TagData } from "../adapter-contract/tags.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";

export interface Tag<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly name: string;
  readonly sha: string;
  readonly message?: string;
  readonly annotated?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "tag">;
}

export function createTag<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: TagData<TProvider, TVersion>): Tag<TProvider, TVersion> {
  return Object.freeze({
    name: data.name,
    sha: data.sha,
    ...(data.message === undefined ? {} : { message: data.message }),
    ...(data.annotated === undefined ? {} : { annotated: data.annotated }),
    native: data.native,
  });
}
