import type {} from "./registration.ts";
import type { Adapter } from "./adapter.ts";
import type { GiteaVersion } from "./versions.ts";
import { GiteaAdapterContext, type GiteaAdapterOptions } from "./transport/GiteaAdapterContext.ts";
import { createGiteaClientNative } from "./native/GiteaClientNative.ts";
import { giteaExtensions } from "./extensions/runtime.ts";
import { getGiteaUnsupportedOptionalCapabilities } from "./unsupported-capabilities.ts";
import { createOperations as currentUserProfile } from "./current-user-profile/mod.ts";
import { createOperations as issues } from "./issues/mod.ts";
import { createOperations as releases } from "./releases/mod.ts";
import { createOperations as repositoryWebhooks } from "./repository-webhooks/mod.ts";
import { createOperations as ciRunDiscovery } from "./ci-run-discovery/mod.ts";
import { createOperations as packages } from "./packages/mod.ts";
import { createOperations as blobReads } from "./blob-reads/mod.ts";
import { createOperations as pullRequestReviews } from "./pull-request-reviews/mod.ts";
import { createOperations as branchRules } from "./branch-rules/mod.ts";
import { createOperations as authentication } from "./authentication/mod.ts";
import { createOperations as repositoryContainers } from "./repository-containers/mod.ts";
import { createOperations as repositories } from "./repositories/mod.ts";
import { createOperations as forks } from "./forks/mod.ts";
import { createOperations as branches } from "./branches/mod.ts";
import { createOperations as tags } from "./tags/mod.ts";
import { createOperations as commits } from "./commits/mod.ts";
import { createOperations as content } from "./content/mod.ts";
import { createOperations as pullRequests } from "./pull-requests/mod.ts";
import { createOperations as commitStatuses } from "./commit-statuses/mod.ts";

/** Compose independent concern implementations around one immutable provider context. */
export function createGiteaAdapter<V extends GiteaVersion>(
  version: V,
  options: GiteaAdapterOptions,
  context = new GiteaAdapterContext(version, options),
): Adapter<V> {
  const withContext = (authorized: GiteaAdapterContext<V>) =>
    createGiteaAdapter(version, { baseUrl: authorized.webBaseUrl() }, authorized);
  return Object.freeze({
    provider: "gitea",
    version,
    extensions: giteaExtensions,
    unsupportedOptionalCapabilities: getGiteaUnsupportedOptionalCapabilities(version),
    native: createGiteaClientNative(() => context.client()),
    ...currentUserProfile(context),
    ...issues(context),
    ...releases(context),
    ...repositoryWebhooks(context),
    ...ciRunDiscovery(context),
    ...packages(context),
    ...blobReads(context),
    ...pullRequestReviews(context),
    ...branchRules(context),
    ...authentication(context, withContext),
    ...repositoryContainers(context),
    ...repositories(context),
    ...forks(context),
    ...branches(context),
    ...tags(context),
    ...commits(context),
    ...content(context),
    ...pullRequests(context),
    ...commitStatuses(context),
  });
}
