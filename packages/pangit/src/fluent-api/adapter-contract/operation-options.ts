import { ValidationError, type ValidationErrorContext } from "./errors.ts";

/** Options shared by every fluent operation that may perform network work. */
export interface OperationOptions {
  /** Abort the operation and every request, delay, or poll that it owns. */
  readonly signal?: AbortSignal;
}

/** Explicit bounds for operations that must perform several independent requests. */
export interface BoundedOperationOptions extends OperationOptions {
  /** Maximum number of provider objects the operation may inspect. */
  readonly maxItems?: number;
  /** Maximum number of independent provider requests allowed to run concurrently. */
  readonly concurrency?: number;
}

/** Validate one required non-blank provider identity before making a request. */
export function requireIdentity(
  value: string,
  name: string,
  context: ValidationErrorContext = { operation: "validateIdentity" },
): string {
  if (value.trim().length === 0) {
    throw new ValidationError(`${name} cannot be blank`, context);
  }
  return value;
}

/** Throw immediately when an operation starts with an aborted signal. */
export function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

/** Validate one positive integer option without silently rounding it. */
export function requirePositiveInteger(
  value: number,
  name: string,
  context: ValidationErrorContext = { operation: "validatePositiveInteger" },
): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ValidationError(`${name} must be a positive safe integer`, context);
  }
  return value;
}
