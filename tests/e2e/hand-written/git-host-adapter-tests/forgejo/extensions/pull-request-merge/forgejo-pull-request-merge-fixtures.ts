export type ForgejoPullRequestMergeCandidateFixture = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly number: number;
  readonly sourceSha: string;
};

/** Merge-ready PRs kept separate so Forgejo repository locks cannot couple the assertions. */
export type ForgejoPullRequestMergeFixtures = {
  readonly success: ForgejoPullRequestMergeCandidateFixture;
  readonly staleHead: ForgejoPullRequestMergeCandidateFixture;
  /** Target branch must require an unsatisfied status check so completion stays pending. */
  readonly scheduled?: ForgejoPullRequestMergeCandidateFixture;
};
