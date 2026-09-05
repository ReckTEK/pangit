/** Known changed pull request plus an independent reviewer identity. */
export type ForgejoPullRequestReviewFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly pullRequestNumber: number;
  readonly sourceSha: string;
  readonly changedPath: string;
  readonly reviewer: {
    readonly username: string;
    readonly password: string;
  };
};
