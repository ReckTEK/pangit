const projectName = "pangit-examples";
const composeFile = filePath(new URL("./compose.yaml", import.meta.url));
const envFile = filePath(new URL("./sandbox.env", import.meta.url));
const compose = [
  "compose",
  "--project-name",
  projectName,
  "--env-file",
  envFile,
  "--file",
  composeFile,
];

const action = Deno.args[0] ?? "start";
if (action === "stop") {
  await down();
  console.log("✓ Removed all PanGit example containers, networks, and volumes");
} else if (action === "start") {
  await start();
} else {
  throw new TypeError(`Unknown sandbox action: ${action}`);
}

async function start(): Promise<void> {
  console.log("▸ Cleaning the previous PanGit example sandbox");
  await down();

  try {
    console.log("▸ Starting fresh Gitea 1.27.2 and GitLab 19.3.1 services");
    await docker(["up", "--detach", "--wait", "--wait-timeout", "900"]);

    console.log("▸ Running the unchanged Gitea token example");
    await docker(["--profile", "example", "run", "--rm", "--no-deps", "example"]);
  } catch (error) {
    console.error("✗ Sandbox startup failed; removing its Docker resources");
    await down();
    throw error;
  }

  console.log("✓ Sandbox is ready");
  console.log("  Gitea: http://localhost:3300  (sandbox / gitea-sandbox-password)");
  console.log("  GitLab: http://localhost:38080  (root / 7vQ9!mZ4-Lk2@xR8#pT6)");
  console.log("  Run `deno task stop` when finished");
}

async function down(): Promise<void> {
  let composeFailure: unknown;
  try {
    await docker(["down", "--volumes", "--remove-orphans", "--timeout", "10"]);
  } catch (error) {
    composeFailure = error;
  }

  try {
    await removeProjectResources();
    await assertNoProjectResources();
  } catch (cleanupFailure) {
    if (composeFailure !== undefined) {
      throw new AggregateError(
        [composeFailure, cleanupFailure],
        "Docker Compose teardown and project-resource cleanup both failed",
      );
    }
    throw cleanupFailure;
  }

  if (composeFailure !== undefined) throw composeFailure;
}

async function docker(args: readonly string[]): Promise<void> {
  const command = new Deno.Command("docker", {
    args: [...compose, ...args],
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await command.spawn().status;
  if (!status.success) {
    throw new Error(`Docker Compose exited with status ${status.code}`);
  }
}

function filePath(url: URL): string {
  return decodeURIComponent(url.pathname);
}

async function removeProjectResources(): Promise<void> {
  const label = `label=com.docker.compose.project=${projectName}`;
  const containers = await dockerOutput(["ps", "--all", "--quiet", "--filter", label]);
  if (containers.length > 0) {
    await dockerCommand(["rm", "--force", "--volumes", ...containers]);
  }

  const networks = await dockerOutput(["network", "ls", "--quiet", "--filter", label]);
  if (networks.length > 0) await dockerCommand(["network", "rm", ...networks]);

  const volumes = await dockerOutput(["volume", "ls", "--quiet", "--filter", label]);
  if (volumes.length > 0) await dockerCommand(["volume", "rm", "--force", ...volumes]);
}

async function assertNoProjectResources(): Promise<void> {
  const label = `label=com.docker.compose.project=${projectName}`;
  const remaining = [
    ...(await dockerOutput(["ps", "--all", "--quiet", "--filter", label])),
    ...(await dockerOutput(["network", "ls", "--quiet", "--filter", label])),
    ...(await dockerOutput(["volume", "ls", "--quiet", "--filter", label])),
  ];
  if (remaining.length > 0) {
    throw new Error(`Docker cleanup left ${remaining.length} PanGit example resources`);
  }
}

async function dockerOutput(args: readonly string[]): Promise<readonly string[]> {
  const output = await new Deno.Command("docker", {
    args: [...args],
    stdin: "null",
    stdout: "piped",
    stderr: "inherit",
  }).output();
  if (!output.success) throw new Error(`Docker exited with status ${output.code}`);
  return new TextDecoder().decode(output.stdout).trim().split("\n").filter(Boolean);
}

async function dockerCommand(args: readonly string[]): Promise<void> {
  const status = await new Deno.Command("docker", {
    args: [...args],
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!status.success) throw new Error(`Docker exited with status ${status.code}`);
}
