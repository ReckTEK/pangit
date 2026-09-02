/** Known pull request and independent reviewer prepared by the provider fixture driver. */
export type PullRequestReviewContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly pullRequestNumber: number;
  readonly reviewer: {
    readonly username: string;
    readonly password: string;
  };
};
