import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  createForgejoRepositoryWebhook,
  deleteForgejoRepositoryWebhook,
  updateForgejoRepositoryWebhook,
} from "./mutate-webhooks.ts";

import { getForgejoRepositoryWebhook, listForgejoRepositoryWebhooks } from "./read-webhooks.ts";
import { forgejoRepositoryWebhookSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
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
    repositoryWebhookSupport: forgejoRepositoryWebhookSupport,
    listRepositoryWebhooks: (repository, request) =>
      listForgejoRepositoryWebhooks(context, repository, request),
    getRepositoryWebhook: (repository, id, options) =>
      getForgejoRepositoryWebhook(context, repository, id, options),
    createRepositoryWebhook: (
      repository,
      input,
      options,
    ) => createForgejoRepositoryWebhook(context, repository, input, options),
    updateRepositoryWebhook: (
      repository,
      webhook,
      input,
      options,
    ) => updateForgejoRepositoryWebhook(context, repository, webhook, input, options),
    deleteRepositoryWebhook: (
      repository,
      webhook,
      options,
    ) => deleteForgejoRepositoryWebhook(context, repository, webhook, options),
  };
}
