import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type { TagData } from "../adapter-contract/tags.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";

export interface Tag<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly name: string;
  readonly sha: string;
  readonly message?: string;
  readonly annotated?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "tag", TRegistry>;
}

export function createTag<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(data: TagData<TProvider, TVersion, TRegistry>): Tag<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    name: data.name,
    sha: data.sha,
    ...(data.message === undefined ? {} : { message: data.message }),
    ...(data.annotated === undefined ? {} : { annotated: data.annotated }),
    native: data.native,
  });
}
