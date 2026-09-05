/** Gitea 1.27.2 raw comparison representation selected by the provider extension. */
export type GiteaCommitComparisonOutputFormat = "diff" | "patch";

/** Provider-only selector for the raw comparison representation. */
export interface GiteaCompareCommitsExtension {
  readonly output: GiteaCommitComparisonOutputFormat;
}

/** Safe operation context passed to the Gitea comparison extension callback. */
export interface GiteaCompareCommitsExtensionContext {
  readonly repositoryFullName: string;
  readonly base: string;
  readonly head: string;
}

/** Complete raw comparison returned by Gitea without parsing or truncation. */
export interface GiteaCommitComparisonOutput {
  readonly output: GiteaCommitComparisonOutputFormat;
  readonly content: string;
}
