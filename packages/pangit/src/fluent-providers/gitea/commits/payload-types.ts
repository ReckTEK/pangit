import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";

export type AnyGiteaCommit = GiteaEntityPayload<GiteaVersion, "commit">;
