import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type {
  CommitStatusData,
  CommitStatusState,
} from "../../../fluent-api/adapter-contract/commit-statuses.ts";

import { type Dto, id, object, required, text } from "../transport/mod.ts";
import { door } from "../native/door.ts";

export const states: Readonly<Record<string, CommitStatusState | undefined>> = {
  pending: "pending",
  success: "success",
  failed: "failure",
};

export async function status<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
  ref: string,
): Promise<CommitStatusData<"gitlab", V>> {
  const providerState = required(c, "normalizeCommitStatus", p.status);
  return Object.freeze({
    id: id(c, "normalizeCommitStatus", p.id),
    ref,
    context: required(c, "normalizeCommitStatus", p.name),
    state: states[providerState],
    providerState,
    description: text(p.description),
    targetUrl: text(p.target_url),
    creator: p.author ? text(object(c, "normalizeCommitStatus", p.author).username) : undefined,
    createdAt: text(p.created_at),
    updatedAt: text(p.finished_at),
    native: await door(c, "commitStatus", p),
  });
}
