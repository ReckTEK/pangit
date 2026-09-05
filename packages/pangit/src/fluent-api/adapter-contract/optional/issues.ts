import type { ProviderExtensionOptions } from "../../provider-extensions/ProviderExtensionRegistry.ts";
import type { Provider, ProviderVersion } from "../provider.ts";
import type { ProviderIssueEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest, ScanPage } from "../pagination.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderIssueEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

export type IssueState = "open" | "closed";

export interface IssueData<
  TProvider extends Provider,
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

export interface IssueCommentData<
  TProvider extends Provider,
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

export type IssueUpdateExtension<TProvider extends Provider> = ProviderExtensionOptions<
  "issues.update",
  TProvider
>;

export interface IssueUpdateOptions<TProvider extends Provider> extends OperationOptions {
  readonly extension?: IssueUpdateExtension<TProvider>;
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
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly issueSupport: IssueCapabilitySupport;
  listIssues(
    repository: RepositoryData<TProvider, TVersion>,
    request: ListIssuesRequest,
  ): Promise<Page<IssueData<TProvider, TVersion>>>;
  getIssue(
    repository: RepositoryData<TProvider, TVersion>,
    number: number,
    options?: OperationOptions,
  ): Promise<IssueData<TProvider, TVersion>>;
  createIssue(
    repository: RepositoryData<TProvider, TVersion>,
    input: CreateIssueInput,
    options?: OperationOptions,
  ): Promise<IssueData<TProvider, TVersion>>;
  updateIssue(
    repository: RepositoryData<TProvider, TVersion>,
    issue: IssueData<TProvider, TVersion>,
    input: UpdateIssueInput,
    options?: IssueUpdateOptions<TProvider>,
  ): Promise<IssueData<TProvider, TVersion>>;
  setIssueState(
    repository: RepositoryData<TProvider, TVersion>,
    issue: IssueData<TProvider, TVersion>,
    state: IssueState,
    options?: OperationOptions,
  ): Promise<IssueData<TProvider, TVersion>>;
  listIssueComments(
    repository: RepositoryData<TProvider, TVersion>,
    issue: IssueData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<ScanPage<IssueCommentData<TProvider, TVersion>>>;
  getIssueComment(
    repository: RepositoryData<TProvider, TVersion>,
    id: string,
    options?: OperationOptions,
  ): Promise<IssueCommentData<TProvider, TVersion>>;
  createIssueComment(
    repository: RepositoryData<TProvider, TVersion>,
    issue: IssueData<TProvider, TVersion>,
    input: IssueCommentInput,
    options?: OperationOptions,
  ): Promise<IssueCommentData<TProvider, TVersion>>;
  updateIssueComment(
    repository: RepositoryData<TProvider, TVersion>,
    comment: IssueCommentData<TProvider, TVersion>,
    input: IssueCommentInput,
    options?: OperationOptions,
  ): Promise<IssueCommentData<TProvider, TVersion>>;
  deleteIssueComment(
    repository: RepositoryData<TProvider, TVersion>,
    comment: IssueCommentData<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<void>;
}
