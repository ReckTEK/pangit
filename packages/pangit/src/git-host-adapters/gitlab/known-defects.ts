import { CapabilityUnavailableError } from "../../fluent-api/adapter-contract/errors.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";

/** Confirmed server defects, with reproductions and upstream work in the diagnostic directory. */
export const gitlabKnownDefects = Object.freeze([
  Object.freeze({
    id: "GL-001",
    versions: Object.freeze(["18.11.11", "19.3.1"] as const),
    operation: "getEffectiveBranchProtection",
    reason: "GitLab can enforce stale branch permissions after protection rules change",
    status: "upstream-fix-required",
  }),
]);

export function rejectGitLabProtectionDefect(version: GitLabVersion): never {
  const defect = gitlabKnownDefects[0];
  throw new CapabilityUnavailableError(
    `${defect.id}: ${defect.reason}. Effective protection is unavailable on GitLab ${version} pending a server fix.`,
    { provider: "gitlab", version, operation: defect.operation },
  );
}
