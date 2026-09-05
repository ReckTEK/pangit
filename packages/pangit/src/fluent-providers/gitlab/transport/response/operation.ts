import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";

export type GitLabSuccessResponse = AnyRestResponse & { readonly ok: true };

/** Stable fluent identity plus the native endpoint identity when they differ. */
export interface GitLabOperationIdentity {
  readonly universal: string;
  readonly native?: string;
}

/** Every provider-bound operation carries both stable fluent and native endpoint identity. */
export type GitLabOperation = GitLabOperationIdentity;

export function universalOperation(operation: GitLabOperation): string {
  return operation.universal;
}

export function nativeOperation(operation: GitLabOperation): string {
  return operation.native ?? operation.universal;
}
