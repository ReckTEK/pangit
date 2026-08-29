import type { Provider, ProviderVersion } from "@mannsion/pangit";

const provider: Provider = "gitea";
const giteaVersion: ProviderVersion<typeof provider> = "1.27.2";

// @ts-expect-error A version remains bound to its provider.
const invalidGitHubVersion: ProviderVersion<"github"> = "1.27.2";

Deno.test("manifest-derived provider types are publicly exported", () => {
  void provider;
  void giteaVersion;
  void invalidGitHubVersion;
});
