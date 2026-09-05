import { stringify } from "@std/yaml";

import { generatedComment, markGenerated } from "../../../generated-notices.ts";
import { relativePath, type WorkspacePaths } from "../../../workspace-layout.ts";
import type { GeneratedOpenApiManifest } from "../../raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";
import type { DockerTestEnvironmentDefinition } from "../../../../tests/e2e/hand-written/docker-environment-definitions/docker-test-environment-definition.ts";
import type { LiveTestPlanEntry } from "../../../../tests/e2e/hand-written/read-live-test-plan.ts";
import type { GeneratedLiveTestRun } from "../../../../tests/e2e/runner/generated-live-test-run.ts";
import type { GeneratedRawRestClientTestManifest } from "../../../../tests/e2e/runner/generated-raw-rest-client-test-manifest.ts";
import { generatedE2EOwnershipMarker } from "../clean-generated-e2e-output.ts";
import type { generatedE2ETestPaths } from "../generated-e2e-test-paths.ts";

type HostManifest = GeneratedOpenApiManifest["gitHosts"][string];
type GeneratedPaths = ReturnType<typeof generatedE2ETestPaths>;

function bindPath(from: URL, to: URL): string {
  const path = relativePath(from, to);
  return path.startsWith(".") || path.startsWith("/") ? path : `./${path}`;
}

function assertAssetName(name: string): void {
  if (name.includes("/") || name === "." || name === "..") {
    throw new Error(`Invalid Docker test-environment asset name: ${name}`);
  }
}

/** Write one disposable Docker environment joining generated and hand-written test suites. */
export async function writeGeneratedDockerTestEnvironment(input: {
  paths: WorkspacePaths;
  gitHost: string;
  version: string;
  hostManifest: HostManifest;
  testPlan: LiveTestPlanEntry;
  containerImage: string;
  environment: DockerTestEnvironmentDefinition;
  output: GeneratedPaths;
}): Promise<void> {
  const { paths, gitHost, version, hostManifest, testPlan, containerImage, environment, output } =
    input;
  const definitionFile = new URL(testPlan.dockerEnvironmentDefinition, paths.root);
  const sourceDirectory = new URL("./", definitionFile);
  const outputDirectory = new URL(`${output.generatedDockerEnvironment}/`, paths.root);
  const results = new URL(`${output.results}/`, paths.root);
  const rawTestDirectory = new URL(`${output.generatedRawRestClientTest}/`, paths.root);
  const rawManifest = new URL("generated-test-manifest.json", rawTestDirectory);
  const rawTest = new URL("generated-raw-rest-client-e2e_test.ts", rawTestDirectory);
  const fluentApiTest = testPlan.handWrittenFluentApiTest === undefined
    ? undefined
    : new URL(testPlan.handWrittenFluentApiTest, paths.root);
  await Deno.stat(rawTest);
  if (fluentApiTest !== undefined) await Deno.stat(fluentApiTest);

  await Deno.mkdir(new URL(".auth/", outputDirectory), { recursive: true });
  await Deno.writeTextFile(
    new URL(".gitignore", new URL(".auth/", outputDirectory)),
    markGenerated("*\n!.gitignore\n", "#"),
  );
  await Deno.writeTextFile(
    new URL(".generated", outputDirectory),
    generatedE2EOwnershipMarker,
  );
  for (const name of environment.assets) {
    assertAssetName(name);
    await Deno.writeTextFile(
      new URL(name, outputDirectory),
      await Deno.readTextFile(new URL(name, sourceDirectory)),
    );
  }
  if (!environment.assets.includes(environment.service.bootstrapFile)) {
    throw new Error("Docker environment bootstrapFile must be listed as an asset");
  }
  if (
    environment.services?.[environment.service.name] ||
    environment.services?.[environment.runner.name]
  ) {
    throw new Error("Fixture service collides with the API or test service");
  }

  const run: GeneratedLiveTestRun = {
    schemaVersion: 1,
    gitHost,
    version,
    containerImage,
    service: environment.service,
    runner: environment.runner,
    credentials: environment.credentials,
    services: environment.services,
    suites: {
      generatedRawRestClientTest: {
        testFile: relativePath(paths.root, rawTest),
        manifestFile: relativePath(paths.root, rawManifest),
        clientImplementation: hostManifest.versions[version].artifacts.client.replace(
          /mod\.ts$/,
          `${hostManifest.client.className}.ts`,
        ).replace(/^/, "packages/pangit/"),
      },
      ...(fluentApiTest === undefined ? {} : {
        handWrittenFluentApiTest: {
          testFile: relativePath(paths.root, fluentApiTest),
        },
      }),
    },
  };
  await Deno.writeTextFile(
    new URL("generated-test-run.json", outputDirectory),
    `${JSON.stringify(run, null, 2)}\n`,
  );

  const relativeRoot = bindPath(outputDirectory, paths.root);
  const relativeResults = bindPath(outputDirectory, results);
  const selectedResults = `\${PANGIT_E2E_RESULTS_SOURCE:-${relativeResults}}`;
  const projectName = `pangit-e2e-${gitHost}-${version.replaceAll(".", "-")}`;
  const fixtureDependencies = Object.fromEntries(
    Object.entries(environment.services ?? {}).map(([name, service]) => [
      name,
      { condition: service.healthcheck === undefined ? "service_started" : "service_healthy" },
    ]),
  );
  const compose = {
    name: projectName,
    services: {
      ...environment.services,
      [environment.service.name]: {
        image: containerImage,
        environment: {
          ...environment.service.environment,
          E2E_USERNAME: environment.credentials.username,
          E2E_PASSWORD: environment.credentials.password,
          E2E_EMAIL: environment.credentials.email,
          E2E_LOCAL_API: environment.service.localApiUrl,
          E2E_AUTH_DIR: environment.runner.credentials,
        },
        tmpfs: environment.service.tmpfs,
        ...(environment.service.shmSize ? { shm_size: environment.service.shmSize } : {}),
        volumes: [
          `./${environment.service.bootstrapFile}:/sandbox/bootstrap.sh:ro`,
          ...(environment.service.shutdownFile
            ? [`./${environment.service.shutdownFile}:/sandbox/shutdown.sh:ro`]
            : []),
          `./.auth:${environment.runner.credentials}`,
        ],
        post_start: [{
          command: ["/bin/sh", "/sandbox/bootstrap.sh"],
          user: `${environment.service.uid}:${environment.service.gid}`,
        }],
        ...(environment.service.shutdownFile
          ? {
            pre_stop: [{
              command: ["/bin/sh", "/sandbox/shutdown.sh"],
              user: `${environment.service.uid}:${environment.service.gid}`,
            }],
          }
          : {}),
        healthcheck: {
          test: ["CMD-SHELL", environment.service.healthcheck],
          interval: "2s",
          timeout: "2s",
          retries: Math.ceil((environment.service.startupTimeoutSeconds ?? 180) / 2),
          start_period: "5s",
        },
        restart: "no",
        stop_grace_period: environment.service.stopGracePeriod ?? "10s",
      },
      [environment.runner.name]: {
        image: environment.runner.image,
        init: true,
        user: `${environment.runner.uid ?? environment.service.uid}:${
          environment.runner.gid ?? environment.service.gid
        }`,
        working_dir: environment.runner.workspace,
        entrypoint: ["deno"],
        command: [
          "run",
          "--no-config",
          "--no-lock",
          "--allow-read",
          `--allow-write=${environment.runner.results}`,
          "--allow-run=deno",
          "--allow-env=PANGIT_E2E_TEST_RUN,PANGIT_E2E_SUITE,PANGIT_E2E_CONTRACT",
          "tests/e2e/runner/run-tests-inside-docker.ts",
        ],
        environment: {
          DENO_DIR: "/tmp/deno",
          PANGIT_E2E_TEST_RUN: `${environment.runner.workspace}/${output.runManifest}`,
        },
        volumes: [
          `${relativeRoot}:${environment.runner.workspace}:ro`,
          `./.auth:${environment.runner.credentials}:ro`,
          `${selectedResults}:${environment.runner.results}`,
        ],
        depends_on: {
          [environment.service.name]: { condition: "service_healthy" },
          ...fixtureDependencies,
        },
        restart: "no",
      },
    },
    networks: { default: { internal: true } },
  };
  await Deno.writeTextFile(
    new URL("compose.yaml", outputDirectory),
    generatedComment("#") + stringify(compose),
  );
}

/** Read one hand-written Docker environment definition. */
export async function readDockerTestEnvironmentDefinition(
  paths: WorkspacePaths,
  path: string,
): Promise<DockerTestEnvironmentDefinition> {
  return JSON.parse(
    await Deno.readTextFile(new URL(path, paths.root)),
  ) as DockerTestEnvironmentDefinition;
}

/** Select the Docker settings copied into a generated raw REST-client test manifest. */
export function rawRestClientTestRuntime(
  environment: DockerTestEnvironmentDefinition,
): Pick<GeneratedRawRestClientTestManifest, "service" | "runner" | "credentials"> {
  return {
    service: { apiUrl: environment.service.apiUrl },
    runner: {
      workspace: environment.runner.workspace,
      results: environment.runner.results,
      credentials: environment.runner.credentials,
      timeoutMs: environment.runner.timeoutMs,
    },
    credentials: {
      username: environment.credentials.username,
      password: environment.credentials.password,
      tokenFile: environment.credentials.tokenFile,
      authorizationHeader: environment.credentials.authorizationHeader,
      tokenPrefix: environment.credentials.tokenPrefix,
    },
  };
}
