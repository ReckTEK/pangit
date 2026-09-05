import type {
  Comment as Comment126,
  Issue as Issue126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  Comment as Comment127,
  Issue as Issue127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaIssueEntityKind = "issue" | "issueComment";

type Gitea126IssuePayloads = { issue: Issue126; issueComment: Comment126 };
type Gitea127IssuePayloads = { issue: Issue127; issueComment: Comment127 };

export type GiteaIssueEntityPayload<
  TVersion extends GiteaVersion,
  TKind extends GiteaIssueEntityKind,
> = TVersion extends "1.26.4" ? Gitea126IssuePayloads[TKind]
  : Gitea127IssuePayloads[TKind];

export type GiteaIssueEntityNativeContext<
  TVersion extends GiteaVersion,
  TKind extends GiteaIssueEntityKind,
> = Readonly<
  & { client: GiteaClient<TVersion> }
  & { [TKey in TKind]: GiteaIssueEntityPayload<TVersion, TKind> }
>;

export interface GiteaIssueEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaIssueEntityKind,
> {
  gitea<TResult>(
    use: (
      context: GiteaIssueEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaIssueEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaIssueEntityKind,
>(
  kind: TKind,
  client: GiteaClient<TVersion>,
  payload: GiteaIssueEntityPayload<TVersion, TKind>,
): GiteaIssueEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as GiteaIssueEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaIssueEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
