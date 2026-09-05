import type { ForgejoEntityPayload, ForgejoVersion } from "../native/ForgejoEntityNative.ts";

export type AnyForgejoCommit = ForgejoEntityPayload<ForgejoVersion, "commit">;
