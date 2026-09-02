import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { BranchData } from "../adapter-contract/branches.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { FluentProvider } from "../provider-registry.ts";

export interface Branch<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly name: string;
  readonly sha: string;
  readonly protected?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "branch">;
}

export function createBranch<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: BranchData<TProvider, TVersion>): Branch<TProvider, TVersion> {
  return Object.freeze({
    name: data.name,
    sha: data.sha,
    ...(data.protected === undefined ? {} : { protected: data.protected }),
    native: data.native,
  });
}
