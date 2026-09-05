import type {
  GiteaContentsExtPayload,
  GiteaEntityPayload,
  GiteaFilesResponsePayload,
  GiteaVersion,
} from "../native/GiteaEntityNative.ts";

export type AnyGiteaContent = GiteaEntityPayload<GiteaVersion, "content">;

export type AnyGiteaContentsExt = GiteaContentsExtPayload<GiteaVersion>;

export type AnyGiteaFilesResponse = GiteaFilesResponsePayload<GiteaVersion>;

export interface ValidatedChange {
  readonly operation: "create" | "delete" | "rename" | "update" | "upload";
  readonly path: string;
  readonly existingPath: string;
  readonly fromPath?: string;
  readonly content?: string;
  readonly sha?: string;
  readonly needsSha: boolean;
}
