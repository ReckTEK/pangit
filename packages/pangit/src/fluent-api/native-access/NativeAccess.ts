import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { SelectedGitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import type { FluentProvider } from "../provider-registry.ts";
import type { ProviderClientNative } from "./ProviderNativeRegistry.ts";

/** Keep lazy adapter selection behind the selected provider's explicit native door. */
export function createClientNativeAccess<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  selectedAdapter: SelectedGitHostAdapter<TProvider, TVersion>,
  provider: TProvider,
): ProviderClientNative<TProvider, TVersion> {
  const native = Object.freeze({
    async [provider]<TResult>(
      use: (context: never) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      const adapter = await selectedAdapter();
      const doors = adapter.native as unknown as Record<
        string,
        (callback: typeof use) => Promise<TResult>
      >;
      return await doors[provider](use);
    },
  });
  return native as ProviderClientNative<TProvider, TVersion>;
}
