import { generatedComment, markGenerated } from "../../generated-notices.ts";
import { relativePath, workspace, type WorkspacePaths } from "../../workspace-layout.ts";
import { stringify } from "@std/yaml";
import type { E2EManifest, SpecManifest } from "../tests/e2e-manifest.ts";

/** Render an explicit portable Compose bind path relative to the generated suite directory. */
function bindPath(from: URL, to: URL): string {
  const path = relativePath(from, to);
  return path.startsWith(".") || path.startsWith("/") ? path : `./${path}`;
}

/** Generate each provider/version E2E sandbox beside its generated suite. */
export async function generateSandboxes(paths: WorkspacePaths = workspace): Promise<void> {
  const root = paths.root;
  const manifest: SpecManifest = JSON.parse(
    await Deno.readTextFile(new URL("specs/raw/manifest.json", paths.codegen.pangit)),
  );
  for (const [provider, definition] of Object.entries(manifest.providers)) {
    if (!definition.testing) continue;
    const config: E2EManifest = JSON.parse(
      await Deno.readTextFile(new URL(definition.testing.manifest, paths.root)),
    );
    for (const [version, release] of Object.entries(definition.versions)) {
      if (!release.containerImage) {
        throw new Error(`${provider} ${version}: missing container image`);
      }
      const tests = new URL(`${release.artifacts.tests}/`, root);
      const results = new URL(`${release.artifacts.results}/`, root);
      const relativeRoot = bindPath(tests, root);
      const relativeResults = bindPath(tests, results);
      await Deno.mkdir(new URL(".auth/", tests), { recursive: true });
      await Deno.writeTextFile(
        new URL(".gitignore", new URL(".auth/", tests)),
        markGenerated("*\n!.gitignore\n", "#"),
      );
      await Deno.writeTextFile(
        new URL("bootstrap.sh", tests),
        markGenerated(`${config.service.bootstrap.join("\n")}\n`, "#"),
      );
      for (const [name, content] of Object.entries(config.files ?? {})) {
        if (name.includes("/") || name === "." || name === "..") {
          throw new Error(`Invalid fixture filename: ${name}`);
        }
        const supportsComments =
          /(?:\.(?:sh|ya?ml|Dockerfile)|^Dockerfile|^\.(?:docker|git)ignore)$/i
            .test(name);
        await Deno.writeTextFile(
          new URL(name, tests),
          supportsComments ? markGenerated(content, "#") : content,
        );
      }
      if (config.services?.[config.service.name] || config.services?.[config.runner.name]) {
        throw new Error("Fixture service collides with the API or test service");
      }
      const projectName = `pangit-e2e-${provider}-${version.replaceAll(".", "-")}`;
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
              `${relativeResults}:${config.runner.results}`,
            ],
            depends_on: { [config.service.name]: { condition: "service_healthy" } },
            restart: "no",
          },
        },
        networks: { default: { internal: true } },
      };
      await Deno.writeTextFile(
        new URL(release.artifacts.compose, root),
        generatedComment("#") + stringify(compose),
      );
    }
  }
}
