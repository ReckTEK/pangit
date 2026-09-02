export type GiteaPullRequestMergeCandidateFixture = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly number: number;
  readonly sourceSha: string;
};

/** Merge-ready PRs kept separate so Gitea repository locks cannot couple the assertions. */
export type GiteaPullRequestMergeFixtures = {
  readonly success: GiteaPullRequestMergeCandidateFixture;
  readonly staleHead: GiteaPullRequestMergeCandidateFixture;
  /** Target branch must require an unsatisfied status check so completion stays pending. */
  readonly scheduled?: GiteaPullRequestMergeCandidateFixture;
};
