import type {
  CiExecutionConclusion,
  CiExecutionFilterStatus,
  CiExecutionStatus,
  CiWorkflowState,
} from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";

export function normalizeWorkflowState(value?: string): CiWorkflowState {
  const state = value?.toLowerCase();
  if (state === "active") return "active";
  if (state === "disabled" || state === "disabled_manually") return "disabled";
  return "unknown";
}

export function normalizeExecutionStatus(status?: string, conclusion?: string): CiExecutionStatus {
  const value = status?.toLowerCase();
  if (value === "pending") return "pending";
  if (value === "queued" || value === "waiting" || value === "blocked") return "queued";
  if (value === "running" || value === "in_progress") return "running";
  if (
    value === "completed" || conclusion !== undefined || value === "success" ||
    value === "failure" || value === "cancelled" || value === "canceled" || value === "skipped"
  ) return "completed";
  return "unknown";
}

export function normalizeConclusion(
  conclusion?: string,
  status?: string,
): CiExecutionConclusion | undefined {
  const value = (conclusion ?? status)?.toLowerCase().replaceAll("_", "-");
  if (
    value === undefined || value === "pending" || value === "queued" || value === "running" ||
    value === "in-progress"
  ) return undefined;
  if (value === "canceled") return "cancelled";
  if (
    value === "success" || value === "failure" || value === "cancelled" || value === "skipped" ||
    value === "neutral" || value === "timed-out" || value === "action-required"
  ) return value;
  return "unknown";
}

export function toGiteaStatus(status: CiExecutionFilterStatus): string {
  return status === "running" ? "in_progress" : status;
}
