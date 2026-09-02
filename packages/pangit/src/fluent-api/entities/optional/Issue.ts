import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  IssueCommentData,
  IssueData,
  IssueState,
  ProviderIssueEntityNative,
} from "../../adapter-contract/optional/issues.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface Issue<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
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
  readonly native: ProviderIssueEntityNative<TProvider, TVersion, "issue">;
}

export interface IssueComment<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly body: string;
  readonly author?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly url?: string;
  readonly native: ProviderIssueEntityNative<TProvider, TVersion, "issueComment">;
}

export function createIssueEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: IssueData<TProvider, TVersion>): Issue<TProvider, TVersion> {
  return Object.freeze({
    ...data,
    assignees: Object.freeze([...data.assignees]),
    labels: Object.freeze([...data.labels]),
    native: data.native,
  });
}

export function createIssueCommentEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: IssueCommentData<TProvider, TVersion>): IssueComment<TProvider, TVersion> {
  return Object.freeze({ ...data, native: data.native });
}
