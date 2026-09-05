import type {
  ForgejoEntityPayload,
  ForgejoFilesResponsePayload,
  ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";

export type AnyForgejoContent = ForgejoEntityPayload<ForgejoVersion, "content">;

export type ForgejoContents = AnyForgejoContent | readonly AnyForgejoContent[];

export type AnyForgejoFilesResponse = ForgejoFilesResponsePayload<ForgejoVersion>;

export interface ValidatedChange {
  readonly operation: "create" | "delete" | "move" | "update" | "upsert";
  readonly path: string;
  readonly existingPath: string;
  readonly fromPath?: string;
  readonly content?: string;
  readonly sha?: string;
  readonly needsSha: boolean;
}
