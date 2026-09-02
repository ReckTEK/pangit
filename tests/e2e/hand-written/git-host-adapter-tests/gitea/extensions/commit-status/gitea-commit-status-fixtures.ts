/** One known ref used to publish Gitea-only status vocabulary. */
export type GiteaCommitStatusFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly ref: string;
};
