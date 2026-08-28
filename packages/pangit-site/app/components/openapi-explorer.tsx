import { useEffect, useMemo, useState } from "react";
import type { DocumentationOperation } from "@mannsion/pangit/documentation";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { type ExplorerSpec, explorerSpec } from "../explorer.ts";
import { useColorScheme } from "../hooks/use-color-scheme.ts";
import { scalarConfiguration } from "../scalar.ts";

type ScalarComponent = typeof import("@scalar/api-reference-react").ApiReferenceReact;
type ExplorerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; Scalar: ScalarComponent; document: ExplorerSpec };

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`API documentation could not load (${response.status}).`);
  return await response.json() as T;
}

export function OpenApiExplorer({ specUrl, operationsUrl, variant }: {
  specUrl: string;
  operationsUrl: string;
  variant?: { method: string; path: string };
}) {
  const [state, setState] = useState<ExplorerState>({ status: "loading" });
  const colorScheme = useColorScheme();
  const variantMethod = variant?.method;
  const variantPath = variant?.path;
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    Promise.all([
      import("@scalar/api-reference-react"),
      readJson<ExplorerSpec>(specUrl, controller.signal),
      readJson<DocumentationOperation[]>(operationsUrl, controller.signal),
    ]).then(([{ ApiReferenceReact }, document, operations]) => {
      if (!controller.signal.aborted) {
        setState({
          status: "ready",
          Scalar: ApiReferenceReact,
          document: explorerSpec(
            document,
            variantMethod && variantPath ? { method: variantMethod, path: variantPath } : undefined,
            operations,
          ),
        });
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return () => controller.abort();
  }, [specUrl, operationsUrl, variantMethod, variantPath]);
  const configuration = useMemo(
    () =>
      state.status === "ready"
        ? scalarConfiguration(state.document, colorScheme, globalThis.location.origin)
        : null,
    [state, colorScheme],
  );
  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="mx-5 flex gap-3 rounded-xl border border-red-500/30 p-6 text-sm sm:mx-10"
      >
        <AlertCircle size={18} />
        <span>
          {state.message}{" "}
          <a href={specUrl} className="underline">Open the specification directly</a>.
        </span>
      </div>
    );
  }
  if (state.status !== "ready" || !configuration) {
    return (
      <div
        role="status"
        className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted"
      >
        <LoaderCircle size={18} className="animate-spin" />Loading the API reference…
        <noscript>
          JavaScript is required for the interactive explorer. The client method index and tutorials
          are available without it.
        </noscript>
      </div>
    );
  }
  return (
    <div className="api-explorer min-w-0" aria-label="Interactive OpenAPI reference">
      {/* Scalar initializes its forced color mode when mounted. */}
      <state.Scalar key={colorScheme} configuration={configuration} />
    </div>
  );
}
