import type { CiWorkflowData } from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../versions.ts";
import { createForgejoCiEntityNative } from "../native/ForgejoCiRunDiscoveryNative.ts";
import { getContents } from "../content/get-contents.ts";
import { isContentArray } from "../content/validate-payload.ts";

/** Resolve the known workflow file; Forgejo does not expose a workflow-state resource. */
export async function getForgejoCiWorkflow<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V>,
  workflowId: string,
  options: OperationOptions = {},
): Promise<CiWorkflowData<"forgejo", V>> {
  const path = normalizeWorkflowPath(workflowId);
  const client = await context.client();
  const payload = await getContents(context, client, repository, path, repository.defaultBranch, {
    universal: "getCiWorkflow",
    native: "repoGetContents",
  }, options.signal);
  if (isContentArray(payload) || payload.type !== "file") {
    throw new TypeError("Workflow path is not a file");
  }
  return Object.freeze({
    id: path,
    path,
    name: payload.name,
    state: "unknown",
    url: payload.html_url,
    native: createForgejoCiEntityNative("workflow", client, payload),
  });
}

export function normalizeWorkflowPath(value: string): string {
  const path = requireIdentity(value, "workflow path").replace(/^\/+/, "");
  if (path.split("/").some((part) => part === ".." || part === ".")) {
    throw new TypeError("invalid workflow path");
  }
  if (/^\.(?:forgejo|gitea|github)\/workflows\/[^/]+$/.test(path)) return path;
  if (path.includes("/")) {
    throw new TypeError("workflow path must name a supported workflow directory");
  }
  return `.forgejo/workflows/${path}`;
}
