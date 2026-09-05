import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type { CommitStatusData, CommitStatusState } from "../adapter-contract/commit-statuses.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";

export interface CommitStatus<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id?: string;
  readonly ref: string;
  readonly context: string;
  readonly state?: CommitStatusState;
  /** Exact provider state, retained when it has no portable equivalent. */
  readonly providerState: string;
  readonly description?: string;
  readonly targetUrl?: string;
  readonly creator?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly native: ProviderEntityNative<TProvider, TVersion, "commitStatus", TRegistry>;
}

export function createCommitStatus<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: CommitStatusData<TProvider, TVersion, TRegistry>,
): CommitStatus<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data });
}
