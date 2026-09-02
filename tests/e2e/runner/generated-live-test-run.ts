import type { DockerTestEnvironmentDefinition } from "../hand-written/docker-environment-definitions/docker-test-environment-definition.ts";

/** Generated join manifest telling Docker exactly which generated and hand-written tests to run. */
export type GeneratedLiveTestRun = {
  schemaVersion: 1;
  gitHost: string;
  version: string;
  containerImage: string;
  service: DockerTestEnvironmentDefinition["service"];
  runner: DockerTestEnvironmentDefinition["runner"];
  credentials: DockerTestEnvironmentDefinition["credentials"];
  services?: Record<string, Record<string, unknown>>;
  suites: {
    generatedRawRestClientTest: {
      testFile: string;
      manifestFile: string;
      clientImplementation: string;
    };
    handWrittenFluentApiTest?: {
      testFile: string;
    };
  };
};
