import type { RestClientTypeMap } from "../../../generated-rest-clients/rest-client-type-map.ts";
import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  Branch as Branch126,
  Commit as Commit126,
  CommitStatus as CommitStatus126,
  ContentsExtResponse as ContentsExtResponse126,
  ContentsResponse as ContentsResponse126,
  FilesResponse as FilesResponse126,
  PullRequest as PullRequest126,
  PullReview as PullReview126,
  Tag as Tag126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  Branch as Branch127,
  Commit as Commit127,
  CommitStatus as CommitStatus127,
  ContentsExtResponse as ContentsExtResponse127,
  ContentsResponse as ContentsResponse127,
  FilesResponse as FilesResponse127,
  PullRequest as PullRequest127,
  PullReview as PullReview127,
  Tag as Tag127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";

export type GiteaVersion = ProviderVersion<"gitea">;
export type GiteaClient<TVersion extends GiteaVersion> = RestClientTypeMap["gitea"][TVersion];

/** Entity payload families retained by the high-level Gitea adapter. */
export type GiteaEntityKind =
  | "branch"
  | "tag"
  | "commit"
  | "content"
  | "pullRequest"
  | "review"
  | "commitStatus";

type Gitea126Payloads = {
  branch: Branch126;
  tag: Tag126;
  commit: Commit126;
  content: ContentsResponse126;
  pullRequest: PullRequest126;
  review: PullReview126;
  commitStatus: CommitStatus126;
};

type Gitea127Payloads = {
  branch: Branch127;
  tag: Tag127;
  commit: Commit127;
  content: ContentsResponse127;
  pullRequest: PullRequest127;
  review: PullReview127;
  commitStatus: CommitStatus127;
};

type Gitea126SpecialPayloads = {
  contentsExt: ContentsExtResponse126;
  contentsList: readonly ContentsResponse126[];
  filesResponse: FilesResponse126;
};

type Gitea127SpecialPayloads = {
  contentsExt: ContentsExtResponse127;
  contentsList: readonly ContentsResponse127[];
  filesResponse: FilesResponse127;
};

/** Exact generated entity payload selected by the configured Gitea version. */
export type GiteaEntityPayload<
  TVersion extends GiteaVersion,
  TKind extends GiteaEntityKind,
> = TVersion extends "1.26.4" ? Gitea126Payloads[TKind] : Gitea127Payloads[TKind];

/** Exact generated contents-ext wrapper selected by the configured Gitea version. */
export type GiteaContentsExtPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? Gitea126SpecialPayloads["contentsExt"]
  : Gitea127SpecialPayloads["contentsExt"];

/** Exact generated multi-file mutation response selected by the configured Gitea version. */
export type GiteaFilesResponsePayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? Gitea126SpecialPayloads["filesResponse"]
  : Gitea127SpecialPayloads["filesResponse"];

/** Exact generated client and already-fetched entity payload. */
type GiteaCanonicalEntityNativeContext<
  TVersion extends GiteaVersion,
  TKind extends GiteaEntityKind,
> = Readonly<
  & { client: GiteaClient<TVersion> }
  & {
    [TKey in TKind]: GiteaEntityPayload<TVersion, TKind>;
  }
>;

/**
 * Exact native source retained for a normalized entity.
 *
 * Contents-ext directory results and multi-file mutations do not return the canonical
 * `ContentsResponse`/`Commit` DTOs. Their exact wrappers are retained as distinct union members
 * instead of fabricating a DTO or issuing a refresh request merely to populate the native door.
 */
export type GiteaEntityNativeContext<
  TVersion extends GiteaVersion,
  TKind extends GiteaEntityKind,
> = TKind extends "content" ?
    | GiteaCanonicalEntityNativeContext<TVersion, TKind>
    | Readonly<{
      client: GiteaClient<TVersion>;
      requestedPath: string;
      contentsExt: GiteaContentsExtPayload<TVersion>;
    }>
    | Readonly<{
      client: GiteaClient<TVersion>;
      requestedPath: "";
      contentsList: TVersion extends "1.26.4" ? Gitea126SpecialPayloads["contentsList"]
        : Gitea127SpecialPayloads["contentsList"];
    }>
  : TKind extends "commit" ?
      | GiteaCanonicalEntityNativeContext<TVersion, TKind>
      | Readonly<{
        client: GiteaClient<TVersion>;
        commit: GiteaFilesResponsePayload<TVersion>["commit"];
        filesResponse: GiteaFilesResponsePayload<TVersion>;
      }>
  : GiteaCanonicalEntityNativeContext<TVersion, TKind>;

/** Gitea native door for one exact entity and generated API version. */
export interface GiteaEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaEntityKind,
> {
  gitea<TResult>(
    use: (
      context: GiteaEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Build an immutable native door without issuing another provider request. */
export function createGiteaEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaEntityKind,
>(
  kind: TKind,
  client: GiteaClient<TVersion>,
  payload: GiteaEntityPayload<TVersion, TKind>,
): GiteaEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as GiteaEntityNativeContext<
    TVersion,
    TKind
  >;
  return createNativeDoor(context);
}

/** Retain an exact contents-ext wrapper for a normalized directory without synthesizing a DTO. */
export function createGiteaContentsExtNative<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  requestedPath: string,
  contentsExt: GiteaContentsExtPayload<TVersion>,
): GiteaEntityNative<TVersion, "content"> {
  const context = Object.freeze({ client, requestedPath, contentsExt }) as GiteaEntityNativeContext<
    TVersion,
    "content"
  >;
  return createNativeDoor<TVersion, "content">(context);
}

/** Retain the exact root contents-list response used when no filepath segment exists. */
export function createGiteaContentsListNative<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  contentsList: readonly GiteaEntityPayload<TVersion, "content">[],
): GiteaEntityNative<TVersion, "content"> {
  const context = Object.freeze({
    client,
    requestedPath: "",
    contentsList: Object.freeze([...contentsList]),
  }) as GiteaEntityNativeContext<TVersion, "content">;
  return createNativeDoor<TVersion, "content">(context);
}

/** Retain the exact files mutation response without an extra commit refresh. */
export function createGiteaFilesResponseCommitNative<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  filesResponse: GiteaFilesResponsePayload<TVersion>,
): GiteaEntityNative<TVersion, "commit"> {
  const context = Object.freeze({
    client,
    commit: filesResponse.commit,
    filesResponse,
  }) as GiteaEntityNativeContext<
    TVersion,
    "commit"
  >;
  return createNativeDoor<TVersion, "commit">(context);
}

function createNativeDoor<
  TVersion extends GiteaVersion,
  TKind extends GiteaEntityKind,
>(
  context: GiteaEntityNativeContext<TVersion, TKind>,
): GiteaEntityNative<TVersion, TKind> {
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
