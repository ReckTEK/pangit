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
): ProviderClientNative<TProvider, TVersion> {
  const native = Object.freeze({
    async gitea<TResult>(use: (context: never) => TResult | Promise<TResult>): Promise<TResult> {
      const adapter = await selectedAdapter();
      const door = adapter.native as { gitea(callback: typeof use): Promise<TResult> };
      return await door.gitea(use);
    },
  });
  return native as ProviderClientNative<TProvider, TVersion>;
}
