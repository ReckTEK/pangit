import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type { BranchData } from "../adapter-contract/branches.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";

export interface Branch<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly name: string;
  readonly sha: string;
  readonly protected?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "branch", TRegistry>;
}

export function createBranch<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(data: BranchData<TProvider, TVersion, TRegistry>): Branch<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    name: data.name,
    sha: data.sha,
    ...(data.protected === undefined ? {} : { protected: data.protected }),
    native: data.native,
  });
}
