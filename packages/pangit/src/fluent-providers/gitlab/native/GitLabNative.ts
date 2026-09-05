import type { GitLabRestClient as Client18 } from "../../../generated-rest-clients/gitlab/18.11.11/GitLabRestClient.ts";
import type { GitLabRestClient as Client19 } from "../../../generated-rest-clients/gitlab/19.3.1/GitLabRestClient.ts";
import type * as V18 from "../../../generated-rest-clients/gitlab/18.11.11/GitLabRestClient.ts";
import type * as V19 from "../../../generated-rest-clients/gitlab/19.3.1/GitLabRestClient.ts";
import type {
  GitLabBlobPayload,
  GitLabFilePayload,
  GitLabNotePayload,
  GitLabUserPayload,
} from "../supplemental.ts";

import type { GitLabVersion } from "../versions.ts";
export type { GitLabVersion } from "../versions.ts";
export type GitLabClient<V extends GitLabVersion> = GitLabClientVersions[V];

type Payloads18 = {
  repositoryContainer: V18.ApiEntitiesNamespace | V18.ApiEntitiesGroup | GitLabUserPayload;
  repository: V18.ApiEntitiesProject;
  branch: V18.ApiEntitiesBranch;
  tag: V18.ApiEntitiesTag;
  commit: V18.ApiEntitiesCommit | V18.ApiEntitiesCommitDetail;
  content: GitLabFilePayload | V18.ApiEntitiesTreeObject | readonly V18.ApiEntitiesTreeObject[];
  pullRequest: V18.ApiEntitiesMergeRequest;
  review: GitLabNotePayload;
  commitStatus: V18.ApiEntitiesCommitStatus;
  blob: GitLabBlobPayload;
  configuredRule: V18.ApiEntitiesProtectedBranch;
  effectiveProtection: V18.ApiEntitiesBranch;
  currentUserProfile: GitLabUserPayload;
  issue: V18.ApiEntitiesIssue;
  issueComment: GitLabNotePayload;
  package: V18.ApiEntitiesPackage;
  packageFile: V18.ApiEntitiesPackageFile;
  pullRequestReview: V18.ApiEntitiesDraftNote | GitLabNotePayload;
  release: V18.ApiEntitiesRelease;
  releaseAsset: V18.ApiEntitiesReleasesLink;
  repositoryWebhook: V18.ApiEntitiesProjectHook;
  workflow: GitLabFilePayload;
  run: V18.ApiEntitiesCiPipeline | V18.ApiEntitiesCiPipelineBasic;
  job: V18.ApiEntitiesCiJob;
  artifact: V18.ApiEntitiesCiJob;
};
type Payloads19 = {
  repositoryContainer: V19.ApiEntitiesNamespace | V19.ApiEntitiesGroup | GitLabUserPayload;
  repository: V19.ApiEntitiesProject;
  branch: V19.ApiEntitiesBranch;
  tag: V19.ApiEntitiesTag;
  commit: V19.ApiEntitiesCommit | V19.ApiEntitiesCommitDetail;
  content: GitLabFilePayload | V19.ApiEntitiesTreeObject | readonly V19.ApiEntitiesTreeObject[];
  pullRequest: V19.ApiEntitiesMergeRequest;
  review: GitLabNotePayload;
  commitStatus: V19.ApiEntitiesCommitStatus;
  blob: GitLabBlobPayload;
  configuredRule: V19.ApiEntitiesProtectedBranch;
  effectiveProtection: V19.ApiEntitiesBranch;
  currentUserProfile: GitLabUserPayload;
  issue: V19.ApiEntitiesIssue;
  issueComment: GitLabNotePayload;
  package: V19.ApiEntitiesPackage;
  packageFile: V19.ApiEntitiesPackageFile;
  pullRequestReview: V19.ApiEntitiesDraftNote | GitLabNotePayload;
  release: V19.ApiEntitiesRelease;
  releaseAsset: V19.ApiEntitiesReleasesLink;
  repositoryWebhook: V19.ApiEntitiesProjectHook;
  workflow: GitLabFilePayload;
  run: V19.ApiEntitiesCiPipeline | V19.ApiEntitiesCiPipelineBasic;
  job: V19.ApiEntitiesCiJob;
  artifact: V19.ApiEntitiesCiJob;
};
export type GitLabEntityKind = keyof Payloads18;
export type GitLabPayload<V extends GitLabVersion, K extends GitLabEntityKind> = V extends
  "18.11.11" ? Payloads18[K] : Payloads19[K];
export type GitLabNativeContext<V extends GitLabVersion, K extends GitLabEntityKind> = Readonly<
  { client: GitLabClient<V> } & { [P in K]: GitLabPayload<V, K> }
>;
export interface GitLabNative<V extends GitLabVersion, K extends GitLabEntityKind> {
  gitlab<R>(use: (context: GitLabNativeContext<V, K>) => R | Promise<R>): Promise<R>;
}
export interface GitLabClientNative<V extends GitLabVersion> {
  gitlab<R>(use: (context: Readonly<{ client: GitLabClient<V> }>) => R | Promise<R>): Promise<R>;
}
export type GitLabProviderNativeRegistry<V extends GitLabVersion> =
  & { readonly client: GitLabClientNative<V> }
  & {
    readonly [K in GitLabEntityKind]: GitLabNative<V, K>;
  };

/** Retain exactly the response payload used to normalize the entity; never refresh for native access. */
export function native<V extends GitLabVersion, K extends GitLabEntityKind>(
  client: GitLabClient<V>,
  kind: K,
  payload: GitLabPayload<V, K>,
): GitLabNative<V, K> {
  const context = Object.freeze({ client, [kind]: payload }) as GitLabNativeContext<V, K>;
  return Object.freeze({
    async gitlab<R>(use: (value: GitLabNativeContext<V, K>) => R | Promise<R>) {
      return await use(context);
    },
  });
}

export interface GitLabClientVersions {
  readonly "18.11.11": Client18;
  readonly "19.3.1": Client19;
}
