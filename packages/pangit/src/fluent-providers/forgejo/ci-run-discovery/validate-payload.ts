import type { ForgejoCiEntityPayload } from "../native/ForgejoCiRunDiscoveryNative.ts";
import type { ForgejoVersion } from "../versions.ts";
export type AnyRun = ForgejoCiEntityPayload<ForgejoVersion, "run">;
export type AnyJob = ForgejoCiEntityPayload<ForgejoVersion, "job">;
export type AnyArtifact = ForgejoCiEntityPayload<ForgejoVersion, "artifact">;
export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
export function safeInteger(v: unknown, allowZero = false): number {
  const n = typeof v === "bigint" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < (allowZero ? 0 : 1)) {
    throw new TypeError("invalid Forgejo integer");
  }
  return n;
}
export function parseForgejoId(v: string, label: string): number {
  if (!/^[1-9][0-9]*$/.test(v)) throw new TypeError(`invalid ${label}`);
  return safeInteger(Number(v));
}
function hasId(v: unknown): v is Record<string, unknown> {
  if (!isRecord(v)) return false;
  try {
    safeInteger(v.id);
    return true;
  } catch {
    return false;
  }
}
export function isRunPayload(v: unknown): v is AnyRun {
  return hasId(v) && typeof v.status === "string";
}
export function isJobPayload(v: unknown): v is AnyJob {
  return hasId(v) && typeof v.status === "string" && typeof v.run_id === "number";
}
export function isArtifactPayload(v: unknown): v is AnyArtifact {
  return hasId(v) && typeof v.name === "string";
}
