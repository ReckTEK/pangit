import type { E2EManifest, SpecManifest } from "./model.ts";

const root = new URL("../../", import.meta.url);

async function clearDirectory(directory: URL): Promise<void> {
  await Deno.mkdir(directory, { recursive: true });
  for await (const entry of Deno.readDir(directory)) {
    if (entry.name !== ".gitignore") {
      await Deno.remove(new URL(encodeURIComponent(entry.name), directory), { recursive: true });
    }
  }
}

export async function runGeneratedClientTests(): Promise<void> {
  const manifest: SpecManifest = JSON.parse(
    await Deno.readTextFile(new URL("codegen/specs/raw/manifest.json", root)),
  );
  const decoder = new TextDecoder();
  let failed = false;
  let interrupted = false;
  let activeCommand: Deno.ChildProcess | undefined;
  let interruptTimer: ReturnType<typeof setTimeout> | undefined;
  const interrupt = () => {
    if (interrupted) return;
    interrupted = true;
    console.error("E2E interrupted; removing the active Compose environment.");
    const child = activeCommand;
    if (!child) return;
    const signal = (value: Deno.Signal) => {
      try {
        // Docker launches Compose as a child: cancel the entire CLI process group.
        Deno.kill(-child.pid, value);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) console.error(error);
      }
    };
    signal("SIGTERM");
    interruptTimer = setTimeout(() => signal("SIGKILL"), 2_000);
  };
  const docker = async (args: string[], capture = false, interruptible = false) => {
    if (interruptible && interrupted) throw new Error("E2E interrupted");
    const child = new Deno.Command("docker", {
      args,
      // Isolate cleanup commands from terminal Ctrl-C as well as the active CLI.
      detached: true,
      stdout: capture ? "piped" : "inherit",
      stderr: capture ? "piped" : "inherit",
    }).spawn();
    if (interruptible) activeCommand = child;
    try {
      const result = capture ? await child.output() : await child.status;
      if (!result.success) {
        const detail = capture ? decoder.decode((result as Deno.CommandOutput).stderr).trim() : "";
        throw new Error(`docker ${args[0]} failed (${result.code})${detail ? `: ${detail}` : ""}`);
      }
      return result;
    } finally {
      if (activeCommand === child) {
        activeCommand = undefined;
        clearTimeout(interruptTimer);
      }
    }
  };

  Deno.addSignalListener("SIGINT", interrupt);
  Deno.addSignalListener("SIGTERM", interrupt);
  try {
    providers: for (const [provider, definition] of Object.entries(manifest.providers)) {
      if (!definition.testing) continue;
      const config: E2EManifest = JSON.parse(
        await Deno.readTextFile(new URL(definition.testing.manifest, root)),
      );
      for (const [version, release] of Object.entries(definition.versions)) {
        if (interrupted) break providers;
        const compose = new URL(release.artifacts.compose, root);
        const results = new URL(`${release.artifacts.results}/`, root);
        const auth = new URL(`${release.artifacts.tests}/.auth/`, root);
        const composeArgs = ["compose", "-f", decodeURIComponent(compose.pathname)];
        let project: string | undefined;
        let started = false;
        let versionFailed = false;
        const reportError = (error: unknown) => {
          failed = versionFailed = true;
          console.error(
            `${provider} ${version}: ${error instanceof Error ? error.message : error}`,
          );
        };
        const teardown = async () => {
          if (!project) return;
          const errors: string[] = [];
          try {
            await docker([...composeArgs, "down", "--volumes", "--remove-orphans"]);
          } catch (error) {
            errors.push(String(error));
          }
          // Include orphaned project volumes/services from earlier generated configurations.
          for (
            const [kind, listArgs, removeArgs] of [
              ["container", ["ls", "--all", "--quiet"], ["rm", "--force", "--volumes"]],
              ["network", ["ls", "--quiet"], ["rm"]],
              ["volume", ["ls", "--quiet"], ["rm"]],
            ] as const
          ) {
            const list = async () => {
              const output = await docker([
                kind,
                ...listArgs,
                "--filter",
                `label=com.docker.compose.project=${project}`,
              ], true) as Deno.CommandOutput;
              return decoder.decode(output.stdout).trim().split(/\s+/).filter(Boolean);
            };
            try {
              const remaining = await list();
              if (remaining.length) await docker([kind, ...removeArgs, ...remaining]);
              const retained = await list();
              if (retained.length) {
                throw new Error(`Retained ${kind} resources: ${retained.join(", ")}`);
              }
            } catch (error) {
              errors.push(String(error));
            }
          }
          if (errors.length) throw new Error(`Compose cleanup failed: ${errors.join("; ")}`);
        };
        try {
          if (
            results.href !==
              new URL(`src/generated/${provider}/${version}/tests/results/`, root).href
          ) {
            throw new Error(
              "E2E results must be beside the generated client tests; run deno task generate",
            );
          }
          const output = await docker(
            [...composeArgs, "config", "--format", "json"],
            true,
          ) as Deno.CommandOutput;
          const composeConfig = JSON.parse(decoder.decode(output.stdout));
          const name: unknown = composeConfig.name;
          if (typeof name !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
            throw new Error("Compose configuration has no valid project name");
          }
          project = name;
          composeArgs.push("--project-name", project);
          const mounts: Array<{ type?: string; source?: string; target?: string }> =
            composeConfig.services?.[config.runner.name]?.volumes ?? [];
          const outputMount = mounts.find((mount) => mount.target === config.runner.results);
          if (
            outputMount?.type !== "bind" ||
            outputMount.source !== decodeURIComponent(results.pathname).replace(/\/$/, "")
          ) {
            throw new Error(
              "Compose results mount differs from the manifest; run deno task generate",
            );
          }
          // Failure here must prevent startup with a potentially reused environment.
          await teardown();
          await clearDirectory(results);
          await clearDirectory(auth);
          started = true;
          await docker(
            [
              ...composeArgs,
              "up",
              "--build",
              "--wait",
              "--wait-timeout",
              "180",
              config.service.name,
              ...Object.keys(config.services ?? {}),
            ],
            false,
            true,
          );
          await docker(
            [
              ...composeArgs,
              "run",
              "--rm",
              "--no-deps",
              "--no-tty",
              "--interactive=false",
              config.runner.name,
            ],
            false,
            true,
          );
        } catch (error) {
          reportError(error);
        } finally {
          // Log/report failures must never bypass environment teardown.
          try {
            if (started) {
              const logs = await docker(
                [...composeArgs, "logs", "--no-color", config.service.name],
                true,
              ) as Deno.CommandOutput;
              await Deno.writeFile(
                new URL("server.log", results),
                new Uint8Array([...logs.stdout, ...logs.stderr]),
              );
            }
          } catch (error) {
            reportError(error);
          }
          try {
            await teardown();
          } catch (error) {
            reportError(error);
          }
          try {
            await clearDirectory(auth);
          } catch (error) {
            reportError(error);
          }
        }
        if (!versionFailed && !interrupted) {
          console.log(
            `${provider} ${version}: real API E2E passed; environment removed; ${release.artifacts.results}/index.html`,
          );
        }
      }
    }
  } finally {
    Deno.removeSignalListener("SIGINT", interrupt);
    Deno.removeSignalListener("SIGTERM", interrupt);
  }
  if (failed || interrupted) {
    throw new Error(
      "Real API E2E did not pass for every manifest version. See each version's results.",
    );
  }
}

if (import.meta.main) await runGeneratedClientTests();
