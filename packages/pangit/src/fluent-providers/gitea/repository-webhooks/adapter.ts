import type {} from "../registration.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  createGiteaRepositoryWebhook,
  deleteGiteaRepositoryWebhook,
  updateGiteaRepositoryWebhook,
} from "./mutate-webhooks.ts";

import { getGiteaRepositoryWebhook, listGiteaRepositoryWebhooks } from "./read-webhooks.ts";
import { giteaRepositoryWebhookSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "repositoryWebhookSupport"
  | "listRepositoryWebhooks"
  | "getRepositoryWebhook"
  | "createRepositoryWebhook"
  | "updateRepositoryWebhook"
  | "deleteRepositoryWebhook"
> {
  return {
    repositoryWebhookSupport: giteaRepositoryWebhookSupport,
    listRepositoryWebhooks: (repository, request) =>
      listGiteaRepositoryWebhooks(context, repository, request),
    getRepositoryWebhook: (repository, id, options) =>
      getGiteaRepositoryWebhook(context, repository, id, options),
    createRepositoryWebhook: (
      repository,
      input,
      options,
    ) => createGiteaRepositoryWebhook(context, repository, input, options),
    updateRepositoryWebhook: (
      repository,
      webhook,
      input,
      options,
    ) => updateGiteaRepositoryWebhook(context, repository, webhook, input, options),
    deleteRepositoryWebhook: (
      repository,
      webhook,
      options,
    ) => deleteGiteaRepositoryWebhook(context, repository, webhook, options),
  };
}
