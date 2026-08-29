const projectName = "pangit-examples";
const composeFile = filePath(new URL("../compose.yaml", import.meta.url));
const compose = [
  "compose",
  "--project-name",
  projectName,
  "--file",
  composeFile,
];

const action = Deno.args[0] ?? "start";
if (action === "stop") {
  await stop();
  console.log("✓ Stopped the PanGit example containers; provider data was retained");
} else if (action === "start") {
  await start();
} else {
  throw new TypeError(`Unknown sandbox action: ${action}`);
}

async function start(): Promise<void> {
  try {
    console.log("▸ Starting or reusing the PanGit example services");
    await docker(["up", "--detach", "--wait", "--wait-timeout", "900"]);
  } catch (error) {
    console.error("✗ Sandbox startup failed; provider data and services were left intact");
    throw error;
  }

  console.log("✓ Sandbox is ready");
  console.log("  Site:   http://127.0.0.1:5173");
  console.log("  Gitea: http://localhost:3300  (sandbox / gitea-sandbox-password)");
  console.log("  GitLab: http://localhost:38080  (root / 7vQ9!mZ4-Lk2@xR8#pT6)");
  console.log("  Run `deno task stop` when finished");
}

async function stop(): Promise<void> {
  await docker(["stop"]);
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
