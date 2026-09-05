import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";

/** Resolve a named ref to its peeled commit; status routes otherwise use annotated tag object IDs. */
export async function resolveStatusRef<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  client: ForgejoClient<V>,
  path: { owner: string; repo: string },
  ref: string,
  operation: string,
  signal?: AbortSignal,
): Promise<string> {
  if (/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(ref)) return ref;
  const commit = await requestForgejoBody<{ sha: string }, V>(
    context,
    { universal: operation, native: "repoGetSingleCommit" },
    () =>
      client.repoGetSingleCommit({
        path: { ...path, sha: ref },
        query: { files: false, stat: false, verification: false },
      }, { signal }),
    signal,
    (value): value is { sha: string } =>
      value !== null && typeof value === "object" &&
      "sha" in value && typeof value.sha === "string" &&
      /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value.sha),
  );
  return commit.sha;
}
