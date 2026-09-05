import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ source, label = "TypeScript" }: { source: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setFailed(false);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }
  return (
    <figure className="code-block">
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label} code`}
          className="flex min-h-8 items-center gap-2 rounded px-2 text-xs text-muted hover:text-accent"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span aria-live="polite">
            {failed ? "Select code to copy" : copied ? "Copied" : "Copy"}
          </span>
        </button>
      </figcaption>
      <pre tabIndex={0} aria-label={`${label} code`}><code>{source}</code></pre>
    </figure>
  );
}
