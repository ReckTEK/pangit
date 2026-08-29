const projectName = "pangit-examples";
const composeFile = filePath(new URL("../compose.yaml", import.meta.url));
const examplesDirectory = filePath(new URL("../", import.meta.url));
const siteDirectory = filePath(new URL("../site/", import.meta.url));
const cliEntry = filePath(new URL("../cli/main.ts", import.meta.url));
const localCookieSecret = randomSecret();

const [action, ...forwardedArguments] = Deno.args;
if (action === undefined) {
  throw new TypeError("Expected one of: site-dev, site-build, site-prod, cli");
}

const clientId = await readOAuthClientId();
const environment = {
  PANGIT_GITEA_CLIENT_ID: clientId,
  PANGIT_EXAMPLE_COOKIE_SECRET: localCookieSecret,
  HOST: "127.0.0.1",
  PORT: "5173",
};

const command = childCommand(action, forwardedArguments);
const status = await new Deno.Command(command.executable, {
  args: command.args,
  cwd: command.cwd,
  env: environment,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
}).spawn().status;
Deno.exit(status.code);

async function readOAuthClientId(): Promise<string> {
  const output = await new Deno.Command("docker", {
    args: [
      "compose",
      "--project-name",
      projectName,
      "--file",
      composeFile,
      "exec",
      "--no-TTY",
      "gitea",
      "cat",
      "/sandbox-auth/gitea-oauth-client-id",
    ],
    cwd: examplesDirectory,
    stdin: "null",
    stdout: "piped",
    stderr: "inherit",
  }).output();
  if (!output.success) {
    throw new Error("Start the example sandbox before launching OAuth examples");
  }
  const clientId = new TextDecoder().decode(output.stdout).trim();
  if (clientId.length === 0 || clientId.includes("\n")) {
    throw new Error("The sandbox did not produce a valid Gitea OAuth client ID");
  }
  return clientId;
}

function childCommand(
  action: string,
  forwardedArguments: readonly string[],
): { readonly executable: string; readonly args: string[]; readonly cwd: string } {
  switch (action) {
    case "site-dev":
      return denoTask("dev", forwardedArguments);
    case "site-build":
      return denoTask("build", forwardedArguments);
    case "site-prod":
      return denoTask("start", forwardedArguments);
    case "cli":
      return {
        executable: Deno.execPath(),
        args: [
          "run",
          "--allow-env=PANGIT_GITEA_CLIENT_ID",
          "--allow-net=127.0.0.1",
          `--allow-run=${browserExecutable()}`,
          cliEntry,
          ...forwardedArguments,
        ],
        cwd: examplesDirectory,
      };
    default:
      throw new TypeError(`Unknown example launch action: ${action}`);
  }
}

function browserExecutable(): string {
  switch (Deno.build.os) {
    case "darwin":
      return "open";
    case "windows":
      return "rundll32";
    default:
      return "xdg-open";
  }
}

function denoTask(
  task: string,
  forwardedArguments: readonly string[],
): { readonly executable: string; readonly args: string[]; readonly cwd: string } {
  return {
    executable: Deno.execPath(),
    args: ["task", task, ...forwardedArguments],
    cwd: siteDirectory,
  };
}

function filePath(url: URL): string {
  return decodeURIComponent(url.pathname);
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
