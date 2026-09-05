import type { Provider, ProviderTypeRegistry, ProviderVersion } from "../provider.ts";
import type { ProviderExtensionOptions } from "../../provider-extensions/ProviderExtensionRegistry.ts";

import type { ProviderIssueEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest, ScanPage } from "../pagination.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderIssueEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

export type IssueState = "open" | "closed";

export interface IssueData<
  TProvider extends Provider,
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

export interface IssueCommentData<
  TProvider extends Provider,
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

export interface ListIssuesRequest extends ResolvedPageRequest {
  readonly state?: IssueState | "all";
  readonly query?: string;
  readonly labels?: readonly string[];
}

export interface CreateIssueInput {
  readonly title: string;
  readonly description?: string;
}

export interface UpdateIssueInput {
  readonly title?: string;
  readonly description?: string;
}

export interface IssueCommentInput {
  readonly body: string;
}

export type IssueUpdateExtension<
  TProvider extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ProviderExtensionOptions<
  "issues.update",
  TProvider,
  TRegistry
>;

export interface IssueUpdateOptions<
  TProvider extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends OperationOptions {
  readonly extension?: IssueUpdateExtension<TProvider, TRegistry>;
}

export type IssueCapabilityOperation =
  | "list"
  | "get"
  | "create"
  | "update"
  | "set-state"
  | "list-comments"
  | "get-comment"
  | "create-comment"
  | "update-comment"
  | "delete-comment";

/** Static support and efficiency metadata for the optional issue family. */
export interface IssueCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<
    Record<IssueCapabilityOperation, "direct" | "one-page" | "one-page-derived">
  >;
  readonly contentVersionGuard: "provider-extension" | "unsupported";
  readonly timeTracking: "native-only";
  readonly dependencies: "native-only";
  readonly reactions: "native-only";
  readonly attachments: "native-only";
  readonly watchers: "native-only";
}

/** Optional shared issue capability implemented by a provider adapter. */
export interface IssueAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly issueSupport: IssueCapabilitySupport;
  listIssues(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    request: ListIssuesRequest,
  ): Promise<Page<IssueData<TProvider, TVersion, TRegistry>>>;
  getIssue(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    number: number,
    options?: OperationOptions,
  ): Promise<IssueData<TProvider, TVersion, TRegistry>>;
  createIssue(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: CreateIssueInput,
    options?: OperationOptions,
  ): Promise<IssueData<TProvider, TVersion, TRegistry>>;
  updateIssue(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    issue: IssueData<TProvider, TVersion, TRegistry>,
    input: UpdateIssueInput,
    options?: IssueUpdateOptions<TProvider, TRegistry>,
  ): Promise<IssueData<TProvider, TVersion, TRegistry>>;
  setIssueState(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    issue: IssueData<TProvider, TVersion, TRegistry>,
    state: IssueState,
    options?: OperationOptions,
  ): Promise<IssueData<TProvider, TVersion, TRegistry>>;
  listIssueComments(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    issue: IssueData<TProvider, TVersion, TRegistry>,
    request: ResolvedPageRequest,
  ): Promise<ScanPage<IssueCommentData<TProvider, TVersion, TRegistry>>>;
  getIssueComment(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    id: string,
    options?: OperationOptions,
  ): Promise<IssueCommentData<TProvider, TVersion, TRegistry>>;
  createIssueComment(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    issue: IssueData<TProvider, TVersion, TRegistry>,
    input: IssueCommentInput,
    options?: OperationOptions,
  ): Promise<IssueCommentData<TProvider, TVersion, TRegistry>>;
  updateIssueComment(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    comment: IssueCommentData<TProvider, TVersion, TRegistry>,
    input: IssueCommentInput,
    options?: OperationOptions,
  ): Promise<IssueCommentData<TProvider, TVersion, TRegistry>>;
  deleteIssueComment(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    comment: IssueCommentData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
}
