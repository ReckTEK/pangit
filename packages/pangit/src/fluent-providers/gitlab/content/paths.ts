import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type { ReadContentOptions } from "../../../fluent-api/adapter-contract/content.ts";

import { invalid } from "../transport/mod.ts";
import type { Repo } from "../adapter.ts";
import { commits } from "../commits/mod.ts";

export function normalizePath(
  c: GitLabAdapterContext<GitLabVersion>,
  value: string,
  allowRoot = false,
): string {
  if (allowRoot && ["", ".", "/"].includes(value)) return "";
  if (
    !value || value.startsWith("/") || value.includes("\\") || value.includes("\0") ||
    value.split("/").some((p) => p === ".." || p === "." || p === "")
  ) invalid(c, "content", "Path must be relative and contain no empty, dot, or parent segments");
  return value;
}

export async function pin<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  ref: string | undefined,
  o: ReadContentOptions,
): Promise<string> {
  if (ref && /^[a-f0-9]{40}$/i.test(ref)) return ref;
  return (await commits(c).getCommit(r, ref ?? r.defaultBranch ?? "HEAD", o)).sha;
}
