import type { ProviderVersion } from "../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { FluentApiContractResult } from "../../../fluent-api-contracts/contract-result.ts";
import type { GiteaE2EFixtureDriver } from "../GiteaE2EFixtureDriver.ts";
import { type GiteaFluentContractId } from "../gitea-contract-ids.ts";
export type GiteaContractContext<TVersion extends ProviderVersion<"gitea">> = {
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly webBaseUrl: string;
  readonly token: string;
  readonly username: string;
  readonly password: string;
  readonly timeoutMs: number;
  readonly fixtures: GiteaE2EFixtureDriver<TVersion>;
};

export type GiteaContractCatalogEntry = {
  readonly id: GiteaFluentContractId;
  readonly run: (
    t: Deno.TestContext,
    context: GiteaContractContext<ProviderVersion<"gitea">>,
  ) => Promise<FluentApiContractResult>;
};
