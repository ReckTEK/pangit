import { finalizeLiveResult } from "./finalize-live-result.ts";
import { relativePath, workspace, type WorkspacePaths } from "../../../codegen/workspace-layout.ts";
import { prepareResultDirectories } from "../result-management/prepare-result-directories.ts";
import { discoverGeneratedLiveTests } from "./discover-generated-live-tests.ts";
import {
  filterE2EReleases,
  parseE2ERunSelection,
  resolveE2EResultDirectory,
} from "./e2e-run-selection.ts";
import { liveE2ERunCatalog } from "./live-e2e-run-catalog.ts";
import { recordedServerLog } from "./server-log.ts";

/** Treat fixture crashes and forced kills as failures, even when Compose cleanup succeeds. */
export function assertCleanServiceShutdown(
  containers: readonly {
    Name: string;
    State: { Running: boolean; ExitCode: number; Error?: string };
  }[],
): void {
  const failed = containers.filter(({ State }) =>
    State.Running || (State.ExitCode !== 0 && State.ExitCode !== 143) ||
    State.Error
  );
  if (failed.length > 0) {
    throw new Error(
      `Unclean E2E service shutdown: ${
        failed.map(({ Name, State }) =>
          `${Name.replace(/^\//, "")} (${
            State.Running ? "still running" : `exit ${State.ExitCode}`
          }${State.Error ? `: ${State.Error}` : ""})`
        ).join("; ")
      }`,
    );
  }
}

/** Replace temporary authentication artifacts while retaining their generated ignore file. */
async function clearAuthenticationDirectory(directory: URL): Promise<void> {
  await Deno.mkdir(directory, { recursive: true });
  for await (const entry of Deno.readDir(directory)) {
    if (entry.name !== ".gitignore") {
      await Deno.remove(new URL(encodeURIComponent(entry.name), directory), {
        recursive: true,
      });
    }
  }
}

/** Run selected manifest suites and retain their machine-readable evidence. */
export async function runAllLiveTests(
  paths: WorkspacePaths = workspace,
  args: readonly string[] = Deno.args,
): Promise<void> {
  const root = paths.root;
  const selection = parseE2ERunSelection(args, liveE2ERunCatalog);
  const discovered = await discoverGeneratedLiveTests(paths);
  const releases = filterE2EReleases(discovered, selection).map((release) => ({
    ...release,
    results: resolveE2EResultDirectory(root, release, selection),
  }));
  const resultsRoot = new URL(
    selection.focused ? "tests/e2e/.focused-results/" : "tests/e2e/results/",
    root,
  );
  await prepareResultDirectories(resultsRoot, releases, {
    pruneUnselected: !selection.focused,
  });

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
        // Docker forwards signals to its Compose plugin. Signal the owned child:
        // Deno.kill requires unrestricted process permissions even for our process group.
        child.kill(value);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) console.error(error);
      }
    };
    signal("SIGTERM");
    interruptTimer = setTimeout(() => signal("SIGKILL"), 2_000);
  };
  const docker = async (
    args: string[],
    capture = false,
    interruptible = false,
    environment: Readonly<Record<string, string>> = {},
  ) => {
    if (interruptible && interrupted) throw new Error("E2E interrupted");
    const child = new Deno.Command("docker", {
      args,
      detached: true,
      env: environment,
      stdout: capture ? "piped" : "inherit",
      stderr: capture ? "piped" : "inherit",
    }).spawn();
    if (interruptible) activeCommand = child;
    try {
      const result = capture ? await child.output() : await child.status;
      if (!result.success) {
        const detail = capture ? decoder.decode((result as Deno.CommandOutput).stderr).trim() : "";
        throw new Error(
          `docker ${args[0]} failed (${result.code})${detail ? `: ${detail}` : ""}`,
        );
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
      const { gitHost, version, compose, results, auth, run } = release;
      const composeArgs = [
        "compose",
        "-f",
        decodeURIComponent(compose.pathname),
      ];
      const dockerEnvironment = {
        PANGIT_E2E_RESULTS_SOURCE: decodeURIComponent(results.pathname).replace(
          /\/$/,
          "",
        ),
      };
      const runDocker = (
        dockerArgs: string[],
        capture = false,
        interruptible = false,
      ) => docker(dockerArgs, capture, interruptible, dockerEnvironment);
      let project: string | undefined;
      let started = false;
      let versionFailed = false;
      const reportError = (error: unknown) => {
        failed = versionFailed = true;
        console.error(
          `${gitHost} ${version}: ${error instanceof Error ? error.message : error}`,
        );
      };
      const captureServerLogs = async () => {
        const logs = await runDocker(
          [...composeArgs, "logs", "--no-color", run.service.name],
          true,
        ) as Deno.CommandOutput;
        const serverLog = decoder.decode(
          new Uint8Array([...logs.stdout, ...logs.stderr]),
        ).replace(/[ \t]+$/gm, "");
        const environmentResults = new URL(
          "live-test-environment/",
          results,
        );
        await Deno.mkdir(environmentResults, { recursive: true });
        const recorded = recordedServerLog(serverLog);
        if (recorded !== serverLog) {
          await Deno.writeTextFile(new URL("server.full.log", environmentResults), serverLog);
        }
        await Deno.writeTextFile(
          new URL("server.log", environmentResults),
          recorded,
        );
      };
      const teardown = async (verifyShutdown = false) => {
        if (!project) return;
        const errors: string[] = [];
        if (verifyShutdown) {
          try {
            await runDocker([...composeArgs, "stop"]);
            const output = await runDocker([
              ...composeArgs,
              "ps",
              "--all",
              "--quiet",
            ], true) as Deno.CommandOutput;
            const containers = decoder.decode(output.stdout).trim().split(/\s+/)
              .filter(Boolean);
            if (containers.length > 0) {
              const inspection = await runDocker([
                "inspect",
                ...containers,
              ], true) as Deno.CommandOutput;
              assertCleanServiceShutdown(
                JSON.parse(decoder.decode(inspection.stdout)),
              );
            }
          } catch (error) {
            errors.push(String(error));
          }
        }
        if (verifyShutdown) {
          try {
            await captureServerLogs();
          } catch (error) {
            errors.push(`Could not capture shutdown diagnostics: ${error}`);
          }
        }
        try {
          await runDocker([
            ...composeArgs,
            "down",
            "--volumes",
            "--remove-orphans",
          ]);
        } catch (error) {
          errors.push(String(error));
        }
        for (
          const [kind, listArgs, removeArgs] of [
            ["container", ["ls", "--all", "--quiet"], [
              "rm",
              "--force",
              "--volumes",
            ]],
            ["network", ["ls", "--quiet"], ["rm"]],
            ["volume", ["ls", "--quiet"], ["rm"]],
          ] as const
        ) {
          const list = async () => {
            const output = await runDocker([
              kind,
              ...listArgs,
              "--filter",
              `label=com.docker.compose.project=${project}`,
            ], true) as Deno.CommandOutput;
            return decoder.decode(output.stdout).trim().split(/\s+/).filter(
              Boolean,
            );
          };
          try {
            const remaining = await list();
            if (remaining.length) {
              await runDocker([kind, ...removeArgs, ...remaining]);
            }
            const retained = await list();
            if (retained.length) {
              throw new Error(
                `Retained ${kind} resources: ${retained.join(", ")}`,
              );
            }
          } catch (error) {
            errors.push(String(error));
          }
        }
        if (errors.length) {
          throw new Error(`Compose cleanup failed: ${errors.join("; ")}`);
        }
      };

      try {
        const output = await runDocker(
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
        const mounts: Array<
          { type?: string; source?: string; target?: string }
        > = composeConfig.services?.[run.runner.name]?.volumes ?? [];
        const outputMount = mounts.find((mount) => mount.target === run.runner.results);
        if (
          outputMount?.type !== "bind" ||
          outputMount.source !==
            decodeURIComponent(results.pathname).replace(/\/$/, "")
        ) {
          throw new Error(
            "Compose results mount differs from the manifest; run deno task generate",
          );
        }
        await teardown();
        await clearAuthenticationDirectory(auth);
        started = true;
        await runDocker(
          [
            ...composeArgs,
            "up",
            "--build",
            "--wait",
            "--wait-timeout",
            String(run.service.startupTimeoutSeconds ?? 180),
            run.service.name,
            ...Object.keys(run.services ?? {}),
          ],
          false,
          true,
        );
        await runDocker(
          [
            ...composeArgs,
            "run",
            "--rm",
            "--no-deps",
            "--no-tty",
            "--interactive=false",
            "--env",
            `PANGIT_E2E_SUITE=${selection.suite}`,
            ...(selection.contract === undefined
              ? []
              : ["--env", `PANGIT_E2E_CONTRACT=${selection.contract}`]),
            run.runner.name,
          ],
          false,
          true,
        );
      } catch (error) {
        reportError(error);
      } finally {
        try {
          await teardown(started);
        } catch (error) {
          reportError(error);
        }
        try {
          await clearAuthenticationDirectory(auth);
        } catch (error) {
          reportError(error);
        }
        try {
          await finalizeLiveResult(results, !versionFailed && !interrupted);
        } catch (error) {
          reportError(error);
        }
      }
      if (!versionFailed && !interrupted) {
        console.log(
          `${gitHost} ${version}: ${selection.suite} E2E suite passed; environment removed; ${
            relativePath(root, results)
          }/summary.json`,
        );
      }
    }
  } finally {
    Deno.removeSignalListener("SIGINT", interrupt);
    Deno.removeSignalListener("SIGTERM", interrupt);
  }

  if (failed || interrupted) {
    throw new Error(
      "Selected real API E2E execution did not complete successfully.",
    );
  }
}

if (import.meta.main) await runAllLiveTests();
