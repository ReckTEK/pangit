import type {
  CiExecutionConclusion,
  CiExecutionFilterStatus,
  CiExecutionStatus,
} from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
export function normalizeExecutionStatus(status?: string): CiExecutionStatus {
  if (status === "waiting" || status === "blocked") return "queued";
  if (status === "running") return "running";
  if (["success", "failure", "cancelled", "skipped"].includes(status ?? "")) return "completed";
  return "unknown";
}
export function normalizeConclusion(status?: string): CiExecutionConclusion | undefined {
  if (
    status === "success" || status === "failure" || status === "cancelled" || status === "skipped"
  ) return status;
  return undefined;
}
export function toForgejoStatus(
  status: CiExecutionFilterStatus,
): "waiting" | "running" | "failure" | "success" | "skipped" {
  return status === "pending" || status === "queued" ? "waiting" : status;
}
