import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";

export type ForgejoSuccessResponse = AnyRestResponse & { readonly ok: true };

/** Stable fluent identity plus the native endpoint identity when they differ. */
export interface ForgejoOperationIdentity {
  readonly universal: string;
  readonly native?: string;
}

/** Every provider-bound operation carries both stable fluent and native endpoint identity. */
export type ForgejoOperation = ForgejoOperationIdentity;

export function universalOperation(operation: ForgejoOperation): string {
  return operation.universal;
}

export function nativeOperation(operation: ForgejoOperation): string {
  return operation.native ?? operation.universal;
}
