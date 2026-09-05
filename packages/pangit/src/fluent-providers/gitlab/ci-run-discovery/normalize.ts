import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import type {
  CiArtifactData,
  CiExecutionConclusion,
  CiExecutionStatus,
  CiJobData,
  CiRunData,
} from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import { type Dto, id, object, text } from "../transport/mod.ts";
import { door } from "../native/door.ts";

export function state(
  p: Dto,
): {
  status: CiExecutionStatus;
  conclusion?: CiExecutionConclusion;
  providerStatus?: string;
  providerConclusion?: string;
} {
  const raw = text(p.status) ?? "unknown";
  const conclusion: CiExecutionConclusion | undefined = raw === "success" || raw === "skipped"
    ? raw
    : raw === "failed"
    ? "failure"
    : raw === "canceled"
    ? "cancelled"
    : undefined;
  return {
    status: conclusion
      ? "completed"
      : raw === "running"
      ? "running"
      : raw === "pending"
      ? "pending"
      : ["created", "waiting_for_resource", "preparing", "scheduled"].includes(raw)
      ? "queued"
      : "unknown",
    conclusion: conclusion,
    providerStatus: raw,
    providerConclusion: conclusion ? raw : undefined,
  };
}

export async function run<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<CiRunData<"gitlab", V>> {
  return Object.freeze({
    id: id(c, "normalizeCiRun", p.id),
    ...state(p),
    title: text(p.name),
    branch: text(p.ref),
    sha: text(p.sha),
    event: text(p.source),
    actor: p.user ? text(object(c, "normalizeCiRun", p.user).username) : undefined,
    startedAt: text(p.started_at),
    completedAt: text(p.finished_at),
    url: text(p.web_url),
    native: await door(c, "run", p),
  });
}

export async function job<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<CiJobData<"gitlab", V>> {
  return Object.freeze({
    id: id(c, "normalizeCiJob", p.id),
    runId: p.pipeline
      ? id(c, "normalizeCiJob", object(c, "normalizeCiJob", p.pipeline).id)
      : undefined,
    name: text(p.name),
    ...state(p),
    sha: p.commit ? text(object(c, "normalizeCiJob", p.commit).id) : undefined,
    labels: Object.freeze(
      Array.isArray(p.tag_list) ? p.tag_list.filter((v): v is string => typeof v === "string") : [],
    ),
    runnerName: p.runner ? text(object(c, "normalizeCiJob", p.runner).description) : undefined,
    startedAt: text(p.started_at),
    completedAt: text(p.finished_at),
    url: text(p.web_url),
    native: await door(c, "job", p),
  });
}

export async function artifact<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<CiArtifactData<"gitlab", V> | undefined> {
  if (!p.artifacts_file) return undefined;
  const file = object(c, "normalizeCiArtifact", p.artifacts_file);
  if (!file.filename) return undefined;
  return Object.freeze({
    id: `job:${id(c, "normalizeCiArtifact", p.id)}`,
    runId: p.pipeline
      ? id(c, "normalizeCiArtifact", object(c, "normalizeCiArtifact", p.pipeline).id)
      : undefined,
    name: text(file.filename),
    size: typeof file.size === "number" ? file.size : undefined,
    createdAt: text(p.finished_at),
    expiresAt: text(p.artifacts_expire_at),
    native: await door(c, "artifact", p),
  });
}
