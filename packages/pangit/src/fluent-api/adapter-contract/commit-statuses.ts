import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";
import type { ProviderExtensionOptions } from "../provider-extensions/ProviderExtensionRegistry.ts";

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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends CommitStatusStateData {
  readonly id?: string;
  readonly ref: string;
  readonly context: string;
  readonly description?: string;
  readonly targetUrl?: string;
  readonly creator?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly native: ProviderEntityNative<TProvider, TVersion, "commitStatus", TRegistry>;
}

export interface CombinedCommitStatus<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends CommitStatusStateData {
  readonly ref: string;
  readonly statuses: readonly CommitStatusData<TProvider, TVersion, TRegistry>[];
  readonly totalCount?: number;
}

export interface SetCommitStatusInput {
  readonly context: string;
  readonly state: CommitStatusState;
  readonly description?: string;
  readonly targetUrl?: string;
}

export type SetCommitStatusExtension<
  TProvider extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ProviderExtensionOptions<
  "statuses.set",
  TProvider,
  TRegistry
>;

export interface SetCommitStatusOptions<
  TProvider extends Provider = Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends OperationOptions {
  readonly extension?: SetCommitStatusExtension<TProvider, TRegistry>;
}

export interface CommitStatusAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  listCommitStatuses(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    ref: string,
    request: ResolvedPageRequest,
  ): Promise<Page<CommitStatusData<TProvider, TVersion, TRegistry>>>;
  getCommitStatus(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    ref: string,
    options?: OperationOptions,
  ): Promise<CombinedCommitStatus<TProvider, TVersion, TRegistry>>;
  setCommitStatus(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    ref: string,
    input: SetCommitStatusInput,
    options?: SetCommitStatusOptions<TProvider, TRegistry>,
  ): Promise<CommitStatusData<TProvider, TVersion, TRegistry>>;
}
