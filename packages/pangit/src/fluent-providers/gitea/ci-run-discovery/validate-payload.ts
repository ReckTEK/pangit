import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaCiEntityPayload } from "../native/GiteaCiRunDiscoveryNative.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

export type AnyWorkflow = GiteaCiEntityPayload<GiteaVersion, "workflow">;

export type AnyRun = GiteaCiEntityPayload<GiteaVersion, "run">;

export type AnyJob = GiteaCiEntityPayload<GiteaVersion, "job">;

export type AnyArtifact = GiteaCiEntityPayload<GiteaVersion, "artifact">;

export function requireRunList<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { items: readonly AnyRun[]; totalCount?: number } {
  if (typeof value !== "object" || value === null) {
    throw invariant(context, operation, "returned a malformed run list");
  }
  const wrapper = value as { workflow_runs?: unknown; total_count?: unknown };
  if (!Array.isArray(wrapper.workflow_runs) || !wrapper.workflow_runs.every(isRunPayload)) {
    throw invariant(context, operation, "returned a malformed run list");
  }
  return {
    items: wrapper.workflow_runs,
    ...optionalTotal(context, operation, wrapper.total_count),
  };
}

export function requireJobList<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { items: readonly AnyJob[]; totalCount?: number } {
  if (typeof value !== "object" || value === null) {
    throw invariant(context, operation, "returned a malformed job list");
  }
  const wrapper = value as { jobs?: unknown; total_count?: unknown };
  if (!Array.isArray(wrapper.jobs) || !wrapper.jobs.every(isJobPayload)) {
    throw invariant(context, operation, "returned a malformed job list");
  }
  return { items: wrapper.jobs, ...optionalTotal(context, operation, wrapper.total_count) };
}

export function requireArtifactList<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { items: readonly AnyArtifact[] } {
  if (typeof value !== "object" || value === null) {
    throw invariant(context, operation, "returned a malformed artifact list");
  }
  const wrapper = value as { artifacts?: unknown };
  if (!Array.isArray(wrapper.artifacts) || !wrapper.artifacts.every(isArtifactPayload)) {
    throw invariant(context, operation, "returned a malformed artifact list");
  }
  return { items: wrapper.artifacts };
}

export function isWorkflowPayload(value: unknown): value is AnyWorkflow {
  if (typeof value !== "object" || value === null) return false;
  const workflow = value as AnyWorkflow;
  return typeof workflow.id === "string" && workflow.id.length > 0;
}

export function isRunPayload(value: unknown): value is AnyRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as AnyRun;
  return (typeof run.id === "number" || typeof run.id === "bigint") && run.id > 0 &&
    optionalSafeInteger(run.run_number, false) && optionalSafeInteger(run.run_attempt, true);
}

export function isJobPayload(value: unknown): value is AnyJob {
  if (typeof value !== "object" || value === null) return false;
  const job = value as AnyJob;
  return (typeof job.id === "number" || typeof job.id === "bigint") && job.id > 0 &&
    (job.labels === undefined ||
      (Array.isArray(job.labels) && job.labels.every((label) => typeof label === "string")));
}

export function isArtifactPayload(value: unknown): value is AnyArtifact {
  if (typeof value !== "object" || value === null) return false;
  const artifact = value as AnyArtifact;
  return (typeof artifact.id === "number" || typeof artifact.id === "bigint") && artifact.id > 0 &&
    optionalSafeInteger(artifact.size_in_bytes, true);
}

export function safeInteger(value: unknown, allowZero = false): number {
  const number = typeof value === "bigint" ? Number(value) : value;
  if (
    typeof number !== "number" || !Number.isSafeInteger(number) ||
    (allowZero ? number < 0 : number < 1)
  ) {
    throw new TypeError("Gitea returned an invalid integer");
  }
  return number;
}

function optionalSafeInteger(value: unknown, allowZero: boolean): boolean {
  if (value === undefined) return true;
  try {
    safeInteger(value, allowZero);
    return true;
  } catch {
    return false;
  }
}

export function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  detail: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${detail}`, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}

export function parseGiteaId(value: string, name: string): bigint {
  const normalized = requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(normalized)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(normalized);
}

export function optionalTotal<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): { totalCount?: number } {
  if (value === undefined) return {};
  try {
    return { totalCount: safeInteger(value, true) };
  } catch {
    throw invariant(context, operation, "returned an invalid total count");
  }
}
