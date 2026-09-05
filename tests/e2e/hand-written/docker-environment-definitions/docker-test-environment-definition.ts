/** Hand-written definition used to generate one isolated Docker Compose test environment. */
export type DockerTestEnvironmentDefinition = {
  schemaVersion: 1;
  service: {
    name: string;
    apiUrl: string;
    localApiUrl: string;
    environment: Record<string, string>;
    tmpfs: string[];
    bootstrapFile: string;
    /** Optional ordered shutdown hook for providers with bundled dependent services. */
    shutdownFile?: string;
    healthcheck: string;
    /** Provider boot and shutdown budgets (GitLab configures its bundled services on first boot). */
    startupTimeoutSeconds?: number;
    stopGracePeriod?: string;
    shmSize?: string;
    uid: string;
    gid: string;
  };
  runner: {
    name: string;
    uid?: string;
    gid?: string;
    image: string;
    workspace: string;
    results: string;
    credentials: string;
    timeoutMs: number;
    /** Additional fixture-service authorities available to hand-written live contracts. */
    networkHosts?: string[];
  };
  credentials: {
    username: string;
    password: string;
    email: string;
    tokenFile: string;
    authorizationHeader: string;
    tokenPrefix: string;
  };
  services?: Record<string, Record<string, unknown>>;
  assets: string[];
};
