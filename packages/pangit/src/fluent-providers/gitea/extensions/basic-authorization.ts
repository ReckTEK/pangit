import type { MaybePromise } from "../../../fluent-api/auth/authentication-contracts.ts";

/** A provider-specific payload declared without running the branch yet. */
export interface GiteaBasicAuthorizationExtension {
  readonly oneTimePassword?: string;
}

export type GiteaBasicAuthorizationBranch = () => MaybePromise<GiteaBasicAuthorizationExtension>;
