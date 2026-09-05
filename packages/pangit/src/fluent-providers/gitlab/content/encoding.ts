import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { ContentUnavailableError } from "../../../fluent-api/adapter-contract/errors.ts";

import { context, type Dto, invariant, number } from "../transport/mod.ts";

export function encode(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function decode(
  c: GitLabAdapterContext<GitLabVersion>,
  p: Dto,
  sha: string,
): Promise<Uint8Array> {
  if (p.encoding !== "base64" || typeof p.content !== "string") {
    throw new ContentUnavailableError(
      "GitLab did not return base64 file bytes",
      context(c, "readContent"),
    );
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(p.content.replaceAll(/\s/g, "")), (x) => x.charCodeAt(0));
  } catch {
    invariant(c, "readContent", "GitLab returned invalid base64");
  }
  if (number(c, "readContent", p.size) !== bytes.length) {
    invariant(c, "readContent", "GitLab content length differs from metadata");
  }
  const prefix = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const data = new Uint8Array(prefix.length + bytes.length);
  data.set(prefix);
  data.set(bytes, prefix.length);
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-1", data)),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== sha.toLowerCase()) {
    invariant(c, "readContent", "GitLab blob hash differs from requested object");
  }
  return bytes;
}
