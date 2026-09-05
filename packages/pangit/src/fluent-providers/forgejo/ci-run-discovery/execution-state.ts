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
export function toForgejoStatuses(
  status: CiExecutionFilterStatus,
): ("waiting" | "blocked" | "running" | "failure" | "success" | "skipped")[] {
  if (status === "queued") return ["waiting", "blocked"];
  return [status === "pending" ? "waiting" : status];
}
