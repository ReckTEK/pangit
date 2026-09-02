/** Provider-created identities shared by the focused pull-request contracts. */
export type PullRequestSourceFixture = {
  readonly owner: string;
  readonly repository: string;
  readonly branch: string;
  readonly sha: string;
  readonly changedPath: string;
};

export type PullRequestDiscoveryFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly base: string;
  readonly sameRepository: PullRequestSourceFixture & {
    readonly number: number;
    readonly title: string;
  };
  readonly crossFork: PullRequestSourceFixture & {
    readonly number: number;
  };
};

export type PullRequestMutationFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly base: string;
  readonly sameRepository: PullRequestSourceFixture;
  readonly crossFork: PullRequestSourceFixture;
  readonly closeSource: PullRequestSourceFixture;
};

export type PullRequestMergeFixture = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly number: number;
  readonly sourceBranch: string;
};

export type PullRequestMergeFixtures = {
  readonly defaultMerge: PullRequestMergeFixture;
  readonly squashMerge: PullRequestMergeFixture;
};

export type PullRequestReviewsCommentsFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly number: number;
  readonly changedPath: string;
  readonly reviewer: {
    readonly username: string;
    readonly password: string;
  };
};
