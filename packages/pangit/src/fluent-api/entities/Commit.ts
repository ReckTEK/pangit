import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import type { CommitData, CommitFileData, GitActor } from "../adapter-contract/commits.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";

export interface Commit<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly sha: string;
  readonly message: string;
  readonly url?: string;
  readonly author?: Readonly<GitActor>;
  readonly committer?: Readonly<GitActor>;
  readonly parents: readonly string[];
  readonly files?: readonly Readonly<CommitFileData>[];
  readonly additions?: number;
  readonly deletions?: number;
  readonly changedFiles?: number;
  readonly verified?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "commit">;
}

export function createCommit<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: CommitData<TProvider, TVersion>): Commit<TProvider, TVersion> {
  return Object.freeze({
    sha: data.sha,
    message: data.message,
    ...(data.url === undefined ? {} : { url: data.url }),
    ...(data.author === undefined ? {} : { author: Object.freeze({ ...data.author }) }),
    ...(data.committer === undefined ? {} : { committer: Object.freeze({ ...data.committer }) }),
    parents: Object.freeze([...data.parents]),
    ...(data.files === undefined
      ? {}
      : { files: Object.freeze(data.files.map((file) => Object.freeze({ ...file }))) }),
    ...(data.additions === undefined ? {} : { additions: data.additions }),
    ...(data.deletions === undefined ? {} : { deletions: data.deletions }),
    ...(data.changedFiles === undefined ? {} : { changedFiles: data.changedFiles }),
    ...(data.verified === undefined ? {} : { verified: data.verified }),
    native: data.native,
  });
}
