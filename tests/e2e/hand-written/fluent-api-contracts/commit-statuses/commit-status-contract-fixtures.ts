/** Known refs and raw provider-only setup needed by the common status contract. */
export type CommitStatusContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly commitSha: string;
  readonly branch: string;
  readonly tag: string;
  readonly pullRequestNumber: number;
  readonly providerOnlyContext: string;
  readonly providerOnlyState: string;
};
