export type JsonRecord = Record<string, unknown>;

export type RawRestClientTestStep = {
  operationId: string;
  fixture?: { method: string; url: string; json?: unknown };
  name?: string;
  input?: JsonRecord;
  auth?: "token" | "basic" | "none";
  capture?: Record<string, string>;
  expect: {
    status: number[];
    equals?: Record<string, unknown>;
    contains?: Record<string, unknown>;
    nonempty?: string[];
  };
  optional?: boolean;
  poll?: {
    timeoutMs: number;
    intervalMs: number;
    retryStatuses: number[];
    consecutiveSuccesses?: number;
  };
  note?: string;
};

/** Hand-written cases added to the operation inventory derived from OpenAPI. */
export type RawRestClientTestCases = {
  schemaVersion: 1;
  variables: JsonRecord;
  parameterDefaults: JsonRecord;
  scenarios: Array<{ name: string; steps: RawRestClientTestStep[] }>;
  negativeCases: RawRestClientTestStep[];
};
