import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";
import type { RepositoryData } from "./repositories.ts";

export type CommitStatusState = "pending" | "success" | "failure";

/** Explicit source whose current commit receives or exposes statuses. */
export type CommitStatusReference =
  | { readonly kind: "commit"; readonly sha: string }
  | { readonly kind: "branch"; readonly name: string }
  | { readonly kind: "tag"; readonly name: string }
  | { readonly kind: "pullRequestHead"; readonly number: number };

/**
 * Truthful state projection for providers whose native status vocabulary is wider
 * than PanGit's portable status vocabulary.
 */
export interface CommitStatusStateData {
  /** Portable state when the provider returned an exact portable value. */
  readonly state?: CommitStatusState;
  /** Exact provider state; never collapsed into a different portable state. */
  readonly providerState: string;
}

export interface CommitStatusData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> extends CommitStatusStateData {
  readonly id?: string;
  readonly ref: string;
  readonly context: string;
  readonly description?: string;
  readonly targetUrl?: string;
  readonly creator?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly native: ProviderEntityNative<TProvider, TVersion, "commitStatus">;
}

export interface CombinedCommitStatus<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> extends CommitStatusStateData {
  readonly ref: string;
  readonly statuses: readonly CommitStatusData<TProvider, TVersion>[];
  readonly totalCount?: number;
}

export interface SetCommitStatusInput {
  readonly context: string;
  readonly state: CommitStatusState;
  readonly description?: string;
  readonly targetUrl?: string;
}

/** Gitea status states that have no portable meaning across fluent providers. */
export type GiteaCommitStatusExtensionState = "error" | "warning" | "skipped";

/** Gitea-only state selection for one status publication. */
export interface GiteaSetCommitStatusExtension {
  readonly state: GiteaCommitStatusExtensionState;
}

/** Immutable context exposed to the Gitea status extension callback. */
export interface GiteaSetCommitStatusExtensionContext {
  readonly repositoryFullName: string;
  readonly reference: CommitStatusReference;
  readonly context: string;
  readonly portableState: CommitStatusState;
}

/** Native GitLab states remain visible without inventing a portable equivalent. */
export interface GitLabSetCommitStatusExtension {
  readonly state: "running" | "canceled" | "skipped";
}
export type GitLabSetCommitStatusExtensionContext = GiteaSetCommitStatusExtensionContext;

export type SetCommitStatusExtension<TProvider extends Provider> = TProvider extends "gitea"
  ? GiteaSetCommitStatusExtension
  : TProvider extends "gitlab" ? GitLabSetCommitStatusExtension
  : never;

export interface SetCommitStatusOptions<TProvider extends Provider = Provider>
  extends OperationOptions {
  readonly extension?: SetCommitStatusExtension<TProvider>;
}

export interface CommitStatusAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  listCommitStatuses(
    repository: RepositoryData<TProvider, TVersion>,
    ref: string,
    request: ResolvedPageRequest,
  ): Promise<Page<CommitStatusData<TProvider, TVersion>>>;
  getCommitStatus(
    repository: RepositoryData<TProvider, TVersion>,
    ref: string,
    options?: OperationOptions,
  ): Promise<CombinedCommitStatus<TProvider, TVersion>>;
  setCommitStatus(
    repository: RepositoryData<TProvider, TVersion>,
    ref: string,
    input: SetCommitStatusInput,
    options?: SetCommitStatusOptions<TProvider>,
  ): Promise<CommitStatusData<TProvider, TVersion>>;
}
