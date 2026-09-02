/** One provider request observed while a single fluent operation was under test. */
export type RecordedProviderRequest = {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
};

/** Exact request-budget evidence captured around one fluent operation. */
export type FluentApiRequestEvidence = {
  readonly operation: string;
  readonly expectedOperationIds: readonly string[];
  readonly requests: readonly RecordedProviderRequest[];
};

/** Stable evidence emitted for one independently selectable fluent contract. */
export type FluentApiContractResult = {
  readonly id: string;
  readonly passed: boolean;
  readonly assertions: readonly string[];
  readonly requestEvidence: readonly FluentApiRequestEvidence[];
};
