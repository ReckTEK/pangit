import type { MaybePromise } from "../../../fluent-api/auth/authentication-contracts.ts";

/** A provider-specific payload declared without running the branch yet. */
export interface ForgejoBasicAuthorizationExtension {
  readonly oneTimePassword?: string;
}

export type ForgejoBasicAuthorizationBranch = () => MaybePromise<
  ForgejoBasicAuthorizationExtension
>;
