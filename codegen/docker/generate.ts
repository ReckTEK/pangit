import { stringify } from "@std/yaml";
import type { E2EManifest, SpecManifest } from "../tests/model.ts";

const root = new URL("../../", import.meta.url);

export async function generateSandboxes(): Promise<void> {
  const manifest: SpecManifest = JSON.parse(
    await Deno.readTextFile(new URL("codegen/specs/raw/manifest.json", root)),
  );
  for (const [provider, definition] of Object.entries(manifest.providers)) {
    if (!definition.testing) continue;
    const config: E2EManifest = JSON.parse(
      await Deno.readTextFile(new URL(definition.testing.manifest, root)),
    );
    for (const [version, release] of Object.entries(definition.versions)) {
      if (!release.containerImage) {
        throw new Error(`${provider} ${version}: missing container image`);
      }
      const tests = new URL(`${release.artifacts.tests}/`, root);
      const relativeRoot = "../".repeat(release.artifacts.tests.split("/").length);
      await Deno.mkdir(new URL(".auth/", tests), { recursive: true });
      await Deno.writeTextFile(new URL(".gitignore", new URL(".auth/", tests)), "*\n!.gitignore\n");
      await Deno.writeTextFile(
        new URL("bootstrap.sh", tests),
        `${config.service.bootstrap.join("\n")}\n`,
      );
      for (const [name, content] of Object.entries(config.files ?? {})) {
        if (name.includes("/") || name === "." || name === "..") {
          throw new Error(`Invalid fixture filename: ${name}`);
        }
        await Deno.writeTextFile(new URL(name, tests), content);
      }
      if (config.services?.[config.service.name] || config.services?.[config.runner.name]) {
        throw new Error("Fixture service collides with the API or test service");
      }
      const projectName = `branch-press-e2e-${provider}-${version.replaceAll(".", "-")}`;
      const compose = {
        name: projectName,
        services: {
          ...config.services,
          [config.service.name]: {
            image: release.containerImage,
            environment: {
              ...config.service.environment,
              E2E_USERNAME: config.credentials.username,
              E2E_PASSWORD: config.credentials.password,
              E2E_EMAIL: config.credentials.email,
              E2E_LOCAL_API: config.service.localApiUrl,
              E2E_AUTH_DIR: config.runner.credentials,
            },
            tmpfs: config.service.tmpfs,
            volumes: [
              `./bootstrap.sh:/sandbox/bootstrap.sh:ro`,
              `./.auth:${config.runner.credentials}`,
            ],
            post_start: [{
              command: ["/bin/sh", "/sandbox/bootstrap.sh"],
              user: `${config.service.uid}:${config.service.gid}`,
            }],
            healthcheck: {
              test: ["CMD-SHELL", config.service.healthcheck],
              interval: "2s",
              timeout: "2s",
              retries: 90,
              start_period: "5s",
            },
            restart: "no",
            stop_grace_period: "10s",
          },
          [config.runner.name]: {
            image: config.runner.image,
            user: `${config.service.uid}:${config.service.gid}`,
            working_dir: `${config.runner.workspace}/${release.artifacts.tests}`,
            entrypoint: ["deno"],
            command: [
              "run",
              "--no-config",
              "--no-lock",
              "--allow-read",
              `--allow-write=${config.runner.results}`,
              "--allow-run=deno",
              "run.ts",
            ],
            environment: { DENO_DIR: "/tmp/deno" },
            volumes: [
              `${relativeRoot}:${config.runner.workspace}:ro`,
              `./.auth:${config.runner.credentials}:ro`,
              `${relativeRoot}${release.artifacts.results}:${config.runner.results}`,
            ],
            depends_on: { [config.service.name]: { condition: "service_healthy" } },
            restart: "no",
          },
        },
        networks: { default: { internal: true } },
      };
      await Deno.writeTextFile(
        new URL(release.artifacts.compose, root),
        `# Generated from the specification and E2E manifests. Do not edit.\n${stringify(compose)}`,
      );
      console.log(`${provider} ${version}: ${release.artifacts.compose}`);
    }
  }
}

if (import.meta.main) await generateSandboxes();
