import type {
  RestRequestContext,
  RestRequestOperation,
} from "../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { FluentApiRequestEvidence, RecordedProviderRequest } from "./contract-result.ts";

/** Scoped result of one operation executed while provider requests were recorded. */
export type RequestCapture<TValue> = {
  readonly value: TValue;
  readonly requests: readonly RecordedProviderRequest[];
};

/**
 * Records generated operation IDs without retaining headers, bodies, tokens, or query values.
 * Each capture observes only requests made inside its callback.
 */
export class FluentApiRequestRecorder {
  readonly #requests: RecordedProviderRequest[] = [];
  #capturing = false;

  /** Generated-client hook passed through the public fluent ClientOptions. */
  readonly beforeRequest = (
    request: Request,
    operation: RestRequestOperation,
    _context: RestRequestContext,
  ): Request => {
    if (this.#capturing) {
      this.#requests.push(Object.freeze({
        operationId: operation.id,
        method: operation.method,
        path: new URL(request.url).pathname,
      }));
    }
    return request;
  };

  /** Capture exactly the provider requests performed by one operation callback. */
  async capture<TValue>(operation: () => Promise<TValue>): Promise<RequestCapture<TValue>> {
    if (this.#capturing) throw new Error("Provider request captures cannot be nested");
    this.#requests.length = 0;
    this.#capturing = true;
    try {
      const value = await operation();
      return Object.freeze({ value, requests: this.snapshot() });
    } finally {
      this.#capturing = false;
      this.#requests.length = 0;
    }
  }

  /** Return an immutable copy of the active capture. */
  snapshot(): readonly RecordedProviderRequest[] {
    return Object.freeze(this.#requests.map((request) => Object.freeze({ ...request })));
  }
}

/** Build evidence and fail when the exact provider operation sequence differs. */
export function proveRequestSequence<TValue>(
  operation: string,
  expectedOperationIds: readonly string[],
  capture: RequestCapture<TValue>,
): { readonly value: TValue; readonly evidence: FluentApiRequestEvidence } {
  const observed = capture.requests.map((request) => request.operationId);
  if (JSON.stringify(observed) !== JSON.stringify(expectedOperationIds)) {
    throw new Error(
      `${operation} expected provider requests [${expectedOperationIds.join(", ")}], observed [${
        observed.join(", ")
      }]`,
    );
  }
  return Object.freeze({
    value: capture.value,
    evidence: Object.freeze({
      operation,
      expectedOperationIds: Object.freeze([...expectedOperationIds]),
      requests: capture.requests,
    }),
  });
}
