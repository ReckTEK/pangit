import { gitlabExtensions } from "./extensions/runtime.ts";
import { gitlabUnsupportedOptionalCapabilities } from "./unsupported-capabilities.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import {
  GitLabAdapterContext,
  type GitLabAdapterOptions,
} from "./transport/GitLabAdapterContext.ts";
import type { Adapter } from "./adapter.ts";
import { createOperations as authentication } from "./authentication/mod.ts";
import { createClientNative } from "./native/client.ts";
import { repositoryContainers } from "./repository-containers/mod.ts";
import { forks } from "./forks/mod.ts";
import { repositories } from "./repositories/mod.ts";
import { branches } from "./branches/mod.ts";
import { tags } from "./tags/mod.ts";
import { commits } from "./commits/mod.ts";
import { content } from "./content/mod.ts";
import { blobOperations } from "./blob-reads/mod.ts";
import { pullRequests } from "./pull-requests/mod.ts";
import { issues } from "./issues/mod.ts";
import { commitStatuses } from "./commit-statuses/mod.ts";
import { currentUserProfile } from "./current-user-profile/mod.ts";
import { repositoryWebhooks } from "./repository-webhooks/mod.ts";
import { branchRules } from "./branch-rules/mod.ts";
import { releases } from "./releases/mod.ts";
import { packages } from "./packages/mod.ts";
import { ciRunDiscovery } from "./ci-run-discovery/mod.ts";
import { pullRequestReviews } from "./pull-request-reviews/mod.ts";

/** One immutable, lazily selected exact-version GitLab adapter. */
export function createGitLabAdapter<V extends GitLabVersion>(
  version: V,
  options: GitLabAdapterOptions,
  c = new GitLabAdapterContext(version, options),
): Adapter<V> {
  return Object.freeze(
    {
      provider: "gitlab",
      extensions: gitlabExtensions,
      unsupportedOptionalCapabilities: gitlabUnsupportedOptionalCapabilities,
      version,
      native: createClientNative(() => c.client()),
      ...authentication(
        c,
        (authorized) =>
          createGitLabAdapter(version, { baseUrl: authorized.webBaseUrl() }, authorized),
      ),
      ...repositoryContainers(c),
      ...repositories(c),
      ...forks(c),
      ...branches(c),
      ...tags(c),
      ...commits(c),
      ...content(c),
      ...blobOperations(c),
      ...pullRequests(c),
      ...issues(c),
      ...commitStatuses(c),
      ...currentUserProfile(c),
      ...repositoryWebhooks(c),
      ...branchRules(c),
      ...releases(c),
      ...packages(c),
      ...ciRunDiscovery(c),
      ...pullRequestReviews(c),
    } satisfies Adapter<V>,
  );
}
