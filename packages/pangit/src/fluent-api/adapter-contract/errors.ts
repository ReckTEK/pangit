import type { Provider } from "../../generated-rest-clients/git-host.ts";

/** Safe context retained by every fluent operation error. */
export interface FluentErrorContext {
  readonly operation: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly retryAfter?: string;
  readonly cause?: unknown;
}

/** Safe provider identity added once an error crosses a provider boundary. */
export interface ProviderErrorContext<
  TProvider extends Provider = Provider,
  TVersion extends string = string,
> extends FluentErrorContext {
  readonly provider: TProvider;
  readonly version: TVersion;
}

/** Context for validation that may fail before a provider has been selected. */
export interface ValidationErrorContext<
  TProvider extends Provider = Provider,
  TVersion extends string = string,
> extends FluentErrorContext {
  readonly provider?: TProvider;
  readonly version?: TVersion;
}

/** Common base for locally rejected and provider-normalized fluent operations. */
export class FluentOperationError extends Error {
  readonly provider?: Provider;
  readonly version?: string;
  readonly operation: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly retryAfter?: string;

  constructor(message: string, context: ValidationErrorContext) {
    super(message, { cause: context.cause });
    this.name = new.target.name;
    this.provider = context.provider;
    this.version = context.version;
    this.operation = context.operation;
    this.status = context.status;
    this.requestId = context.requestId;
    this.retryAfter = context.retryAfter;
  }
}

/** Base class for errors normalized at the high-level provider boundary. */
export class ProviderOperationError extends FluentOperationError {
  declare readonly provider: Provider;
  declare readonly version: string;

  constructor(message: string, context: ProviderErrorContext) {
    super(message, context);
  }
}

export class AuthenticationError extends ProviderOperationError {}
export class PermissionDeniedError extends ProviderOperationError {}
export class NotFoundError extends ProviderOperationError {}
export class ConflictError extends ProviderOperationError {}
/** Locally invalid input or a provider validation failure. */
export class ValidationError extends FluentOperationError {}
export class RateLimitError extends ProviderOperationError {}
export class OperationAbortedError extends ProviderOperationError {}
export class OperationTimeoutError extends ProviderOperationError {}
/** A bounded history traversal reached its caller-selected inspection limit. */
export class IncompleteHistoryError extends ProviderOperationError {}
/** Requested file bytes exist but are unavailable through the provider content response. */
export class ContentUnavailableError extends ProviderOperationError {}
export class ProviderInvariantError extends ProviderOperationError {}

/** A high-level capability is unavailable without probing a provider. */
export class CapabilityUnavailableError extends ProviderOperationError {}

/** A generated raw provider has no registered high-level adapter. */
export class ProviderAdapterUnavailableError extends Error {
  constructor(readonly provider: string, readonly version?: string) {
    super(
      version === undefined
        ? `PanGit has no fluent provider adapter for ${provider}`
        : `PanGit has no fluent provider adapter for ${provider} ${version}`,
    );
    this.name = "ProviderAdapterUnavailableError";
  }
}
