import type * as Public from "@recktek/pangit/api";
import type {
  ProviderNativeTypes,
  ProviderVersion,
} from "../../packages/pangit/src/fluent-api/adapter-contract/provider.ts";
import type { ProviderClientNative } from "../../packages/pangit/src/fluent-api/native-access/ProviderNativeRegistry.ts";
import type { GiteaProviderTypes } from "../../packages/pangit/src/fluent-providers/gitea/provider-types.ts";
import type { GiteaClientNative } from "../../packages/pangit/src/fluent-providers/gitea/native/GiteaClientNative.ts";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true
  : false;
type Assert<T extends true> = T;

type FixtureNative<V extends string, K extends string> = { readonly version: V; readonly kind: K };
interface FixtureNativeTypes extends ProviderNativeTypes {
  readonly type: FixtureNative<this["version"], this["kind"]>;
}
type FixtureTypes = {
  readonly fixture: {
    readonly versions: "v1";
    readonly extensions: Record<never, never>;
    readonly native: FixtureNativeTypes;
  };
};

Deno.test("provider types are explicit and catalog imports cannot alter universal contracts", () => {
  const assertions: readonly [
    Assert<Equal<ProviderVersion<"gitea">, string>>,
    Assert<Equal<keyof ProviderClientNative<"gitea", "1.27.2">, never>>,
    Assert<
      Equal<
        ProviderClientNative<"gitea", "1.27.2", GiteaProviderTypes>,
        GiteaClientNative<"1.27.2">
      >
    >,
    Assert<Equal<Public.ProviderClientNative<"gitea", "1.27.2">, GiteaClientNative<"1.27.2">>>,
    Assert<Equal<ProviderVersion<"fixture", FixtureTypes>, "v1">>,
    Assert<
      Equal<
        ProviderClientNative<"fixture", "v1", FixtureTypes>,
        { readonly version: "v1"; readonly kind: "client" }
      >
    >,
  ] = [true, true, true, true, true, true];
  if (assertions.some((value) => !value)) throw new Error("Provider type isolation failed");
});
