import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { AnyGiteaPullRequest } from "./payload-types.ts";
import { normalizePullRequestRef } from "./normalize-pull-request.ts";

export function validateHeadSelector(value: string): string {
  const head = requireIdentity(value, "pull-request head");
  const parts = head.split(":");
  if (parts.length > 2 || parts.some((part) => part.trim().length === 0)) {
    throw new TypeError("pull-request head must be a branch or owner:branch");
  }
  return parts.map((part) => headPart(part, "pull-request head component")).join(":");
}

export function headPart(value: string, name: string): string {
  const part = requireIdentity(value, name);
  if (part.includes(":")) throw new TypeError(`${name} cannot contain ':'`);
  return part;
}

export function pullRequestMatchesHead(
  pullRequest: AnyGiteaPullRequest,
  target: { readonly owner: string; readonly name: string },
  expected: string,
): boolean {
  try {
    const source = normalizePullRequestRef(pullRequest.head, "pull-request source");
    const actual = source.owner === target.owner && source.repository === target.name
      ? source.branch
      : `${source.owner}:${source.branch}`;
    return actual === expected;
  } catch {
    return false;
  }
}
