import type {
  Branch as Branch15,
  Commit as Commit15,
  CommitStatus as CommitStatus15,
  ContentsResponse as ContentsResponse15,
  FilesResponse as FilesResponse15,
  ForgejoRestClient as Client15,
  PullRequest as PullRequest15,
  PullReview as PullReview15,
  Tag as Tag15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  Branch as Branch16,
  Commit as Commit16,
  CommitStatus as CommitStatus16,
  ContentsResponse as ContentsResponse16,
  FilesResponse as FilesResponse16,
  ForgejoRestClient as Client16,
  PullRequest as PullRequest16,
  PullReview as PullReview16,
  Tag as Tag16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";

import type { ForgejoVersion } from "../versions.ts";
export type { ForgejoVersion } from "../versions.ts";
export type ForgejoClient<TVersion extends ForgejoVersion> = ForgejoClientVersions[TVersion];

/** Entity payload families retained by the high-level Forgejo adapter. */
export type ForgejoEntityKind =
  | "branch"
  | "tag"
  | "commit"
  | "content"
  | "pullRequest"
  | "review"
  | "commitStatus";

type Forgejo15Payloads = {
  branch: Branch15;
  tag: Tag15;
  commit: Commit15;
  content: ContentsResponse15;
  pullRequest: PullRequest15;
  review: PullReview15;
  commitStatus: CommitStatus15;
};

type Forgejo16Payloads = {
  branch: Branch16;
  tag: Tag16;
  commit: Commit16;
  content: ContentsResponse16;
  pullRequest: PullRequest16;
  review: PullReview16;
  commitStatus: CommitStatus16;
};

type Forgejo15SpecialPayloads = {
  contentsList: readonly ContentsResponse15[];
  filesResponse: FilesResponse15;
};

type Forgejo16SpecialPayloads = {
  contentsList: readonly ContentsResponse16[];
  filesResponse: FilesResponse16;
};

/** Exact generated entity payload selected by the configured Forgejo version. */
export type ForgejoEntityPayload<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoEntityKind,
> = TVersion extends "15.0.7" ? Forgejo15Payloads[TKind] : Forgejo16Payloads[TKind];

/** Exact generated multi-file mutation response selected by the configured Forgejo version. */
export type ForgejoFilesResponsePayload<TVersion extends ForgejoVersion> = TVersion extends "15.0.7"
  ? Forgejo15SpecialPayloads["filesResponse"]
  : Forgejo16SpecialPayloads["filesResponse"];

/** Exact generated client and already-fetched entity payload. */
type ForgejoCanonicalEntityNativeContext<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoEntityKind,
> = Readonly<
  & { client: ForgejoClient<TVersion> }
  & {
    [TKey in TKind]: ForgejoEntityPayload<TVersion, TKind>;
  }
>;

/**
 * Exact native source retained for a normalized entity.
 *
 * Directory listings and multi-file mutations do not return the canonical
 * `ContentsResponse`/`Commit` DTOs. Their exact responses are retained as distinct union members
 * instead of fabricating a DTO or issuing a refresh request merely to populate the native door.
 */
export type ForgejoEntityNativeContext<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoEntityKind,
> = TKind extends "content" ?
    | ForgejoCanonicalEntityNativeContext<TVersion, TKind>
    | Readonly<{
      client: ForgejoClient<TVersion>;
      requestedPath: string;
      contentsList: TVersion extends "15.0.7" ? Forgejo15SpecialPayloads["contentsList"]
        : Forgejo16SpecialPayloads["contentsList"];
    }>
  : TKind extends "commit" ?
      | ForgejoCanonicalEntityNativeContext<TVersion, TKind>
      | Readonly<{
        client: ForgejoClient<TVersion>;
        commit: ForgejoFilesResponsePayload<TVersion>["commit"];
        filesResponse: ForgejoFilesResponsePayload<TVersion>;
      }>
  : ForgejoCanonicalEntityNativeContext<TVersion, TKind>;

/** Forgejo native door for one exact entity and generated API version. */
export interface ForgejoEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoEntityKind,
> {
  forgejo<TResult>(
    use: (
      context: ForgejoEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Build an immutable native door without issuing another provider request. */
export function createForgejoEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoEntityKind,
>(
  kind: TKind,
  client: ForgejoClient<TVersion>,
  payload: ForgejoEntityPayload<TVersion, TKind>,
): ForgejoEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as ForgejoEntityNativeContext<
    TVersion,
    TKind
  >;
  return createNativeDoor(context);
}

/** Retain the exact root contents-list response used when no filepath segment exists. */
export function createForgejoContentsListNative<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  contentsList: readonly ForgejoEntityPayload<TVersion, "content">[],
  requestedPath = "",
): ForgejoEntityNative<TVersion, "content"> {
  const context = Object.freeze({
    client,
    requestedPath,
    contentsList: Object.freeze([...contentsList]),
  }) as ForgejoEntityNativeContext<TVersion, "content">;
  return createNativeDoor<TVersion, "content">(context);
}

/** Retain the exact files mutation response without an extra commit refresh. */
export function createForgejoFilesResponseCommitNative<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  filesResponse: ForgejoFilesResponsePayload<TVersion>,
): ForgejoEntityNative<TVersion, "commit"> {
  const context = Object.freeze({
    client,
    commit: filesResponse.commit,
    filesResponse,
  }) as ForgejoEntityNativeContext<
    TVersion,
    "commit"
  >;
  return createNativeDoor<TVersion, "commit">(context);
}

function createNativeDoor<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoEntityKind,
>(
  context: ForgejoEntityNativeContext<TVersion, TKind>,
): ForgejoEntityNative<TVersion, TKind> {
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}

export interface ForgejoClientVersions {
  readonly "15.0.7": Client15;
  readonly "16.0.3": Client16;
}
