import type { RestInt64, RestOperation } from "../../generated-rest-clients/runtime/mod.ts";

/** Documented GitLab API fields absent from the pinned upstream OpenAPI. */
export interface GitLabUserPayload {
  readonly id: RestInt64;
  readonly username: string;
  readonly name?: string;
  readonly email?: string;
  readonly avatar_url?: string;
  readonly web_url?: string;
}
export interface GitLabNotePayload {
  readonly id: RestInt64;
  readonly body: string;
  readonly author?: GitLabUserPayload;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly system?: boolean;
  readonly noteable_iid?: number;
}

/**
 * Hand-written supplements, never additions to generated operation coverage.
 * Sources: https://docs.gitlab.com/api/users/, /notes/, /discussions/, /protected_branches/.
 * All requests still use the selected generated client's transport and lifecycle hooks.
 */
export function supplementalOperation(
  method: RestOperation["method"],
  path: string,
): RestOperation {
  return Object.freeze({
    id: `gitlab-supplement:${method}:${path}`,
    method,
    path: `/api/v4${path}`,
    pathParameters: [...path.matchAll(/\{([^}]+)\}/g)].map((m) => ({ name: m[1] })),
    requestMediaTypes: ["application/json", "multipart/form-data"],
    responses: [200, 201, 202, 204].map((status) => ({
      status,
      mediaTypes: status === 204 ? [] : ["application/json"],
      decoders: { "application/json": "json" as const },
    })),
  });
}

/** Repository file/blob responses are untyped in the pinned OpenAPI. */
export interface GitLabBlobPayload {
  readonly size: number;
  readonly encoding: string;
  readonly content: string;
}
export interface GitLabFilePayload {
  readonly file_name: string;
  readonly file_path: string;
  readonly size: number;
  readonly encoding: string;
  readonly content: string;
  readonly blob_id: string;
  readonly commit_id: string;
  readonly last_commit_id: string;
  readonly execute_filemode?: boolean;
}
