import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type {
  IssueCommentData,
  IssueData,
  IssueState,
  ProviderIssueEntityNative,
} from "../../adapter-contract/optional/issues.ts";

export interface Issue<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly description?: string;
  readonly state: IssueState;
  readonly author?: string;
  readonly assignees: readonly string[];
  readonly labels: readonly string[];
  readonly commentCount?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly closedAt?: string;
  readonly url?: string;
  readonly native: ProviderIssueEntityNative<TProvider, TVersion, "issue", TRegistry>;
}

export interface IssueComment<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly body: string;
  readonly author?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly url?: string;
  readonly native: ProviderIssueEntityNative<TProvider, TVersion, "issueComment", TRegistry>;
}

export function createIssueEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(data: IssueData<TProvider, TVersion, TRegistry>): Issue<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    ...data,
    assignees: Object.freeze([...data.assignees]),
    labels: Object.freeze([...data.labels]),
    native: data.native,
  });
}

export function createIssueCommentEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: IssueCommentData<TProvider, TVersion, TRegistry>,
): IssueComment<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data, native: data.native });
}
