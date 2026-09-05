import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import { type OperationOptions, requireIdentity } from "../adapter-contract/operation-options.ts";

import type { RepositoryData, RepositoryParentData } from "../adapter-contract/repositories.ts";
import {
  createRepositoryBranches,
  type RepositoryBranches,
} from "../capabilities/RepositoryBranches.ts";
import {
  createRepositoryCommits,
  type RepositoryCommits,
} from "../capabilities/RepositoryCommits.ts";
import {
  createRepositoryCommitStatuses,
  type RepositoryCommitStatuses,
} from "../capabilities/RepositoryCommitStatuses.ts";
import {
  createRepositoryContent,
  type RepositoryContent,
} from "../capabilities/RepositoryContent.ts";
import { createRepositoryForks, type RepositoryForks } from "../capabilities/RepositoryForks.ts";
import {
  createRepositoryPullRequests,
  type RepositoryPullRequests,
} from "../capabilities/RepositoryPullRequests.ts";
import { createRepositoryTags, type RepositoryTags } from "../capabilities/RepositoryTags.ts";
import {
  createRepositoryBlobs,
  type RepositoryBlobs,
} from "../capabilities/optional/RepositoryBlobs.ts";
import {
  createRepositoryBranchRules,
  type RepositoryBranchRules,
} from "../capabilities/optional/RepositoryBranchRules.ts";
import {
  createRepositoryCiRunDiscovery,
  type RepositoryCiRunDiscovery,
} from "../capabilities/optional/RepositoryCiRunDiscovery.ts";
import {
  createRepositoryIssues,
  type RepositoryIssues,
} from "../capabilities/optional/RepositoryIssues.ts";
import {
  createRepositoryReleases,
  type RepositoryReleases,
} from "../capabilities/optional/RepositoryReleases.ts";
import {
  createRepositoryWebhooks,
  type RepositoryWebhooks,
} from "../capabilities/optional/RepositoryWebhooks.ts";
import type { ProviderRepositoryNative } from "../native-access/ProviderNativeRegistry.ts";

/** Immutable repository snapshot with concern-oriented capability handles. */
export interface Repository<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly description?: string;
  readonly defaultBranch?: string;
  readonly private?: boolean;
  readonly url?: string;
  readonly parent?: Readonly<RepositoryParentData>;
  readonly native: ProviderRepositoryNative<TProvider, TVersion>;
  readonly forks: RepositoryForks<TProvider, TVersion>;
  readonly branches: RepositoryBranches<TProvider, TVersion>;
  readonly tags: RepositoryTags<TProvider, TVersion>;
  readonly commits: RepositoryCommits<TProvider, TVersion>;
  readonly content: RepositoryContent<TProvider, TVersion>;
  readonly pullRequests: RepositoryPullRequests<TProvider, TVersion>;
  readonly statuses: RepositoryCommitStatuses<TProvider, TVersion>;
  readonly issues: RepositoryIssues<TProvider, TVersion>;
  readonly releases: RepositoryReleases<TProvider, TVersion>;
  readonly webhooks: RepositoryWebhooks<TProvider, TVersion>;
  readonly ciRuns: RepositoryCiRunDiscovery<TProvider, TVersion>;
  readonly blobs: RepositoryBlobs<TProvider, TVersion>;
  readonly branchRules: RepositoryBranchRules<TProvider, TVersion>;

  rename(name: string, options?: OperationOptions): Promise<Repository<TProvider, TVersion>>;
  delete(options?: OperationOptions): Promise<void>;
}

class RepositoryImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> implements Repository<TProvider, TVersion> {
  readonly #adapter: GitHostAdapter<TProvider, TVersion>;
  readonly #data: RepositoryData<TProvider, TVersion>;
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly description?: string;
  readonly defaultBranch?: string;
  readonly private?: boolean;
  readonly url?: string;
  readonly parent?: Readonly<RepositoryParentData>;
  readonly native: ProviderRepositoryNative<TProvider, TVersion>;
  readonly forks: RepositoryForks<TProvider, TVersion>;
  readonly branches: RepositoryBranches<TProvider, TVersion>;
  readonly tags: RepositoryTags<TProvider, TVersion>;
  readonly commits: RepositoryCommits<TProvider, TVersion>;
  readonly content: RepositoryContent<TProvider, TVersion>;
  readonly pullRequests: RepositoryPullRequests<TProvider, TVersion>;
  readonly statuses: RepositoryCommitStatuses<TProvider, TVersion>;
  readonly issues: RepositoryIssues<TProvider, TVersion>;
  readonly releases: RepositoryReleases<TProvider, TVersion>;
  readonly webhooks: RepositoryWebhooks<TProvider, TVersion>;
  readonly ciRuns: RepositoryCiRunDiscovery<TProvider, TVersion>;
  readonly blobs: RepositoryBlobs<TProvider, TVersion>;
  readonly branchRules: RepositoryBranchRules<TProvider, TVersion>;

  constructor(
    adapter: GitHostAdapter<TProvider, TVersion>,
    data: RepositoryData<TProvider, TVersion>,
  ) {
    this.#adapter = adapter;
    this.#data = data;
    this.id = data.id;
    this.owner = data.owner;
    this.name = data.name;
    this.fullName = data.fullName;
    this.description = data.description;
    this.defaultBranch = data.defaultBranch;
    this.private = data.private;
    this.url = data.url;
    this.parent = data.parent === undefined ? undefined : Object.freeze({ ...data.parent });
    this.native = data.native;
    this.forks = createRepositoryForks(adapter, data, (fork) => createRepository(adapter, fork));
    this.branches = createRepositoryBranches(adapter, data);
    this.tags = createRepositoryTags(adapter, data);
    this.commits = createRepositoryCommits(adapter, data);
    this.content = createRepositoryContent(adapter, data);
    this.pullRequests = createRepositoryPullRequests(adapter, data);
    this.statuses = createRepositoryCommitStatuses(adapter, data);
    this.issues = createRepositoryIssues(adapter.provider, adapter.version, adapter, data);
    this.releases = createRepositoryReleases(adapter, data);
    this.webhooks = createRepositoryWebhooks(adapter, data);
    this.ciRuns = createRepositoryCiRunDiscovery(adapter, data);
    this.blobs = createRepositoryBlobs(adapter, data);
    this.branchRules = createRepositoryBranchRules(
      adapter.provider,
      adapter.version,
      adapter,
      data,
    );
    Object.freeze(this);
  }

  async rename(
    name: string,
    options: OperationOptions = {},
  ): Promise<Repository<TProvider, TVersion>> {
    return createRepository(
      this.#adapter,
      await this.#adapter.renameRepository(
        this.#data,
        requireIdentity(name, "repository name", {
          provider: this.#adapter.provider,
          version: this.#adapter.version,
          operation: "renameRepository",
        }),
        options,
      ),
    );
  }

  delete(options: OperationOptions = {}): Promise<void> {
    return this.#adapter.deleteRepository(this.#data, options);
  }
}

export function createRepository<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: GitHostAdapter<TProvider, TVersion>,
  data: RepositoryData<TProvider, TVersion>,
): Repository<TProvider, TVersion> {
  return new RepositoryImpl(adapter, data);
}
