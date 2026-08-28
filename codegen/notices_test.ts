import { generatedComment, markGenerated } from "./notices.ts";

Deno.test("generated headers preserve file contents and shell interpreter directives", () => {
  for (const style of ["//", "#", "<!--"] as const) {
    const comment = generatedComment(style);
    if (!comment.includes("@generated") || !comment.includes("DO NOT EDIT")) {
      throw new Error("Missing generated header");
    }
    if (markGenerated("body\n", style) !== `${comment}body\n`) {
      throw new Error("Generated header changed the body");
    }
  }
  const script = "#!/bin/sh\nset -eu\n";
  if (markGenerated(script, "#") !== `#!/bin/sh\n${generatedComment("#")}set -eu\n`) {
    throw new Error("Generated header displaced the shell interpreter");
  }
});
