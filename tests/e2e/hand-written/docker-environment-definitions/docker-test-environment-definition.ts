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
    healthcheck: string;
    uid: string;
    gid: string;
  };
  runner: {
    name: string;
    image: string;
    workspace: string;
    results: string;
    credentials: string;
    timeoutMs: number;
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
