import type {
  Comment as Comment15,
  Issue as Issue15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  Comment as Comment16,
  Issue as Issue16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoIssueEntityKind = "issue" | "issueComment";

type Forgejo15IssuePayloads = { issue: Issue15; issueComment: Comment15 };
type Forgejo16IssuePayloads = { issue: Issue16; issueComment: Comment16 };

export type ForgejoIssueEntityPayload<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoIssueEntityKind,
> = TVersion extends "15.0.7" ? Forgejo15IssuePayloads[TKind]
  : Forgejo16IssuePayloads[TKind];

export type ForgejoIssueEntityNativeContext<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoIssueEntityKind,
> = Readonly<
  & { client: ForgejoClient<TVersion> }
  & { [TKey in TKind]: ForgejoIssueEntityPayload<TVersion, TKind> }
>;

export interface ForgejoIssueEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoIssueEntityKind,
> {
  forgejo<TResult>(
    use: (
      context: ForgejoIssueEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoIssueEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoIssueEntityKind,
>(
  kind: TKind,
  client: ForgejoClient<TVersion>,
  payload: ForgejoIssueEntityPayload<TVersion, TKind>,
): ForgejoIssueEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as ForgejoIssueEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoIssueEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
