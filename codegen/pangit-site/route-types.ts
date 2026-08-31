import { workspace, type WorkspacePaths } from "../workspace-layout.ts";

/** Use the site's pinned React Router dependency, not another codegen version pin. */
export async function generateRouteTypes(paths: WorkspacePaths = workspace): Promise<void> {
  const site = paths.packages.site;
  const { dependencies } = JSON.parse(await Deno.readTextFile(new URL("package.json", site)));
  const version = dependencies?.["@react-router/dev"];
  if (typeof version !== "string" || !version) {
    throw new Error("The site package must declare its @react-router/dev dependency");
  }
  const output = await new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", `npm:@react-router/dev@${version}`, "typegen"],
    cwd: site,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    const decoder = new TextDecoder();
    throw new Error(
      `Site route type generation failed (${output.code}):\n${decoder.decode(output.stdout)}${
        decoder.decode(output.stderr)
      }`,
    );
  }
}
