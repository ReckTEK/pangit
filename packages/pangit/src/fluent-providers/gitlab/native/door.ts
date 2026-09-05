import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import {
  type GitLabEntityKind,
  type GitLabPayload,
  type GitLabVersion,
  native,
} from "./GitLabNative.ts";

export async function door<V extends GitLabVersion, K extends GitLabEntityKind>(
  c: GitLabAdapterContext<V>,
  kind: K,
  payload: unknown,
) {
  return native(await c.client(), kind, payload as GitLabPayload<V, K>);
}
