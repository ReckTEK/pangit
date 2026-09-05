import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";

export type GiteaSuccessResponse = AnyRestResponse & { readonly ok: true };

/** Stable fluent identity plus the native endpoint identity when they differ. */
export interface GiteaOperationIdentity {
  readonly universal: string;
  readonly native?: string;
}

/** Every provider-bound operation carries both stable fluent and native endpoint identity. */
export type GiteaOperation = GiteaOperationIdentity;

export function universalOperation(operation: GiteaOperation): string {
  return operation.universal;
}

export function nativeOperation(operation: GiteaOperation): string {
  return operation.native ?? operation.universal;
}
