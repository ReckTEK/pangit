import type {
  ChangedFile as ChangedFile126,
  Issue as Issue126,
  PrBranchInfo as PrBranchInfo126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  ChangedFile as ChangedFile127,
  Issue as Issue127,
  PrBranchInfo as PrBranchInfo127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";

import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";

export type AnyGiteaPullRequest = GiteaEntityPayload<GiteaVersion, "pullRequest">;

export type AnyGiteaChangedFile = ChangedFile126 | ChangedFile127;

export type AnyGiteaPrBranchInfo = PrBranchInfo126 | PrBranchInfo127;

export type AnyGiteaIssue = Issue126 | Issue127;
