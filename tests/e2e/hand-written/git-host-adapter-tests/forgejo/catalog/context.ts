import type { ProviderVersion } from "../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { FluentApiContractResult } from "../../../fluent-api-contracts/contract-result.ts";
import type { ForgejoE2EFixtureDriver } from "../ForgejoE2EFixtureDriver.ts";
import { type ForgejoFluentContractId } from "../forgejo-contract-ids.ts";
export type ForgejoContractContext<TVersion extends ProviderVersion<"forgejo">> = {
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly webBaseUrl: string;
  readonly token: string;
  readonly username: string;
  readonly password: string;
  readonly timeoutMs: number;
  readonly fixtures: ForgejoE2EFixtureDriver<TVersion>;
};

export type ForgejoContractCatalogEntry = {
  readonly id: ForgejoFluentContractId;
  readonly run: (
    t: Deno.TestContext,
    context: ForgejoContractContext<ProviderVersion<"forgejo">>,
  ) => Promise<FluentApiContractResult>;
};
