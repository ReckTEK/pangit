import type { RestClientTypeMap } from "../../../../../../packages/pangit/src/generated-rest-clients/rest-client-type-map.ts";
import type { ProviderVersion } from "../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { CiRunDiscoveryContractFixtures } from "../../../fluent-api-contracts/optional/ci-run-discovery/ci-run-discovery-contract-fixtures.ts";
export type ForgejoCiFixtures =
  & Omit<CiRunDiscoveryContractFixtures, "job" | "artifact">
  & Partial<Pick<CiRunDiscoveryContractFixtures, "job" | "artifact">>;

export type ForgejoVersion = ProviderVersion<"forgejo">;
export type ForgejoClient<TVersion extends ForgejoVersion> = RestClientTypeMap["forgejo"][TVersion];

export type Cleanup = {
  readonly name: string;
  readonly run: () => Promise<void>;
};

export type ForgejoRepositoryFixture = {
  readonly owner: string;
  readonly name: string;
  readonly defaultBranch: string;
  readonly headSha: string;
};

export type ForgejoOrganizationFixture = {
  readonly name: string;
};

export type ForgejoUserFixture = {
  readonly username: string;
  readonly password: string;
};

export type ForgejoPullRequestFixture = {
  readonly number: number;
};

export type ForgejoFileChangeFixture = {
  readonly operation: "create" | "update" | "delete";
  readonly path: string;
  readonly content?: string | Uint8Array;
  readonly fromPath?: string;
  readonly sha?: string;
};
