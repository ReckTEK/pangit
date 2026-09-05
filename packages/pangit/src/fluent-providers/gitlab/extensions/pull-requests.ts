/** GitLab synchronous merge controls, including an explicit optimistic head guard. */
export interface GitLabMergePullRequestExtension {
  readonly headCommitId?: string;
  readonly mergeMessage?: string;
  readonly squashMessage?: string;
}

export interface GitLabMergePullRequestExtensionContext {
  readonly repositoryFullName: string;
  readonly pullRequestNumber: number;
  readonly sourceSha?: string;
}
