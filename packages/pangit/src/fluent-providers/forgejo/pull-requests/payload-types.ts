import type {
  ChangedFile as ChangedFile15,
  Issue as Issue15,
  PrBranchInfo as PrBranchInfo15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  ChangedFile as ChangedFile16,
  Issue as Issue16,
  PrBranchInfo as PrBranchInfo16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";

import type { ForgejoEntityPayload, ForgejoVersion } from "../native/ForgejoEntityNative.ts";

export type AnyForgejoPullRequest = ForgejoEntityPayload<ForgejoVersion, "pullRequest">;

export type AnyForgejoChangedFile = ChangedFile15 | ChangedFile16;

export type AnyForgejoPrBranchInfo = PrBranchInfo15 | PrBranchInfo16;

export type AnyForgejoIssue = Issue15 | Issue16;
