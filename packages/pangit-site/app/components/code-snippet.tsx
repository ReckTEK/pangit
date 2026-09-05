// Vite reads these files as text at build time; snippets are never executed by the site.
import { CodeBlock } from "./code-block.tsx";

const snippets = import.meta.glob<string>("../snippets/**/*", {
  eager: true,
  query: "?raw",
  import: "default",
});

export function CodeSnippet({ file, label }: { file: string; label?: string }) {
  const source = snippets[`../snippets/${file}`];
  if (source === undefined) throw new Error(`Unknown code snippet: ${file}`);
  // Declarations before this marker give partial examples real, checked types.
  const displayed = source.split("// @example\n").at(-1)!.trim();
  return (
    <CodeBlock
      source={displayed}
      label={label ?? (file.endsWith(".sh") ? "Terminal" : "TypeScript")}
    />
  );
}
