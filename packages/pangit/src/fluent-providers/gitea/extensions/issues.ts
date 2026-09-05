/** Gitea-only optimistic concurrency input for one issue update. */
export interface GiteaIssueUpdateExtension {
  readonly contentVersion: number | bigint;
}

/** Safe, immutable Gitea issue context exposed to the extension callback. */
export interface GiteaIssueUpdateExtensionContext {
  readonly issueNumber: number;
}
