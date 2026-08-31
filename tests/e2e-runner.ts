import { relativePath, workspace, type WorkspacePaths } from "../codegen/workspace-layout.ts";
import { readE2EReleases } from "./e2e-releases.ts";
import { prepareE2EResultTree } from "./e2e-result-tree.ts";
import { publishE2EDocumentation } from "./reporting/publish-e2e-documentation.ts";

/** Replace temporary authentication artifacts while retaining their generated ignore file. */
async function clearAuthenticationDirectory(directory: URL): Promise<void> {
  await Deno.mkdir(directory, { recursive: true });
  for await (const entry of Deno.readDir(directory)) {
    if (entry.name !== ".gitignore") {
      await Deno.remove(new URL(encodeURIComponent(entry.name), directory), { recursive: true });
    }
  }
}

/** Run every manifest-declared suite and publish its complete Markdown evidence tree. */
export async function runGeneratedClientTests(paths: WorkspacePaths = workspace): Promise<void> {
  const root = paths.root;
  const releases = await readE2EReleases(paths);
  await prepareE2EResultTree(new URL("tests/providers/", root), releases);

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
    for (const release of releases) {
      if (interrupted) break;
      const { provider, version, compose, results, auth, manifest } = release;
      const composeArgs = ["compose", "-f", decodeURIComponent(compose.pathname)];
      let project: string | undefined;
      let started = false;
      let versionFailed = false;
      const reportError = (error: unknown) => {
        failed = versionFailed = true;
        console.error(`${provider} ${version}: ${error instanceof Error ? error.message : error}`);
      };
      const teardown = async () => {
        if (!project) return;
        const errors: string[] = [];
        try {
          await docker([...composeArgs, "down", "--volumes", "--remove-orphans"]);
        } catch (error) {
          errors.push(String(error));
        }
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
          composeConfig.services?.[manifest.runner.name]?.volumes ?? [];
        const outputMount = mounts.find((mount) => mount.target === manifest.runner.results);
        if (
          outputMount?.type !== "bind" ||
          outputMount.source !== decodeURIComponent(results.pathname).replace(/\/$/, "")
        ) {
          throw new Error(
            "Compose results mount differs from the manifest; run deno task generate",
          );
        }
        await teardown();
        await clearAuthenticationDirectory(auth);
        started = true;
        await docker(
          [
            ...composeArgs,
            "up",
            "--build",
            "--wait",
            "--wait-timeout",
            "180",
            manifest.service.name,
            ...Object.keys(manifest.services ?? {}),
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
            manifest.runner.name,
          ],
          false,
          true,
        );
      } catch (error) {
        reportError(error);
      } finally {
        try {
          if (started) {
            const logs = await docker(
              [...composeArgs, "logs", "--no-color", manifest.service.name],
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
          await clearAuthenticationDirectory(auth);
        } catch (error) {
          reportError(error);
        }
      }
      if (!versionFailed && !interrupted) {
        console.log(
          `${provider} ${version}: real API E2E passed; environment removed; ${
            relativePath(root, results)
          }/index.html`,
        );
      }
    }
  } finally {
    Deno.removeSignalListener("SIGINT", interrupt);
    Deno.removeSignalListener("SIGTERM", interrupt);
  }

  try {
    await publishE2EDocumentation(paths, releases);
    console.log(`Published ${releases.length} deterministic E2E Markdown reports.`);
  } catch (error) {
    failed = true;
    console.error(
      `E2E documentation publication failed: ${error instanceof Error ? error.message : error}`,
    );
  }
  if (failed || interrupted) {
    throw new Error(
      "Real API E2E and documentation publication did not complete for every manifest version.",
    );
  }
}

if (import.meta.main) await runGeneratedClientTests();
