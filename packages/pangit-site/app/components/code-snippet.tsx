// Vite reads these files as text at build time; snippets are never executed by the site.
const snippets = import.meta.glob<string>("../snippets/*", {
  eager: true,
  query: "?raw",
  import: "default",
});

export function CodeSnippet({ file }: { file: string }) {
  const source = snippets[`../snippets/${file}`];
  if (source === undefined) throw new Error(`Unknown code snippet: ${file}`);
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-panel p-4 text-[13px] leading-6">
      <code>{source.trimEnd()}</code>
    </pre>
  );
}
