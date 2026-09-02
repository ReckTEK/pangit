import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type {
  PullRequestData,
  PullRequestRef,
  PullRequestState,
} from "../adapter-contract/pull-requests.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { FluentProvider } from "../provider-registry.ts";

export interface PullRequest<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly description?: string;
  readonly state: PullRequestState;
  readonly source: Readonly<PullRequestRef>;
  readonly target: Readonly<PullRequestRef>;
  readonly author?: string;
  readonly merged: boolean;
  readonly mergeable?: boolean;
  readonly mergeBaseSha?: string;
  readonly mergeCommitSha?: string;
  readonly url?: string;
  readonly native: ProviderEntityNative<TProvider, TVersion, "pullRequest">;
}

export function createPullRequest<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: PullRequestData<TProvider, TVersion>): PullRequest<TProvider, TVersion> {
  return Object.freeze({
    id: data.id,
    number: data.number,
    title: data.title,
    ...(data.description === undefined ? {} : { description: data.description }),
    state: data.state,
    source: Object.freeze({ ...data.source }),
    target: Object.freeze({ ...data.target }),
    ...(data.author === undefined ? {} : { author: data.author }),
    merged: data.merged,
    ...(data.mergeable === undefined ? {} : { mergeable: data.mergeable }),
    ...(data.mergeBaseSha === undefined ? {} : { mergeBaseSha: data.mergeBaseSha }),
    ...(data.mergeCommitSha === undefined ? {} : { mergeCommitSha: data.mergeCommitSha }),
    ...(data.url === undefined ? {} : { url: data.url }),
    native: data.native,
  });
}
