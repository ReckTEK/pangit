import type {
  RawRestClientTestCases,
} from "../hand-written/raw-rest-client-test-cases/raw-rest-client-test-case-types.ts";

/** Generated, complete input consumed by one generated raw REST-client test entrypoint. */
export type GeneratedRawRestClientTestManifest = RawRestClientTestCases & {
  gitHost: string;
  version: string;
  containerImage: string;
  clientModule: string;
  clientImplementation: string;
  resultsDirectory: string;
  service: {
    apiUrl: string;
  };
  runner: {
    workspace: string;
    results: string;
    credentials: string;
    timeoutMs: number;
  };
  credentials: {
    username: string;
    password: string;
    tokenFile: string;
    authorizationHeader: string;
    tokenPrefix: string;
  };
  operations: Array<{ id: string; method: string; path: string; methodName: string }>;
};
