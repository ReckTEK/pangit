import type { RepositoryWebhookCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

export const giteaRepositoryWebhookSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    list: "one-page",
    get: "direct",
    create: "direct",
    update: "direct",
    delete: "direct",
  }),
  providerConfiguration: "native-only",
  deliveryInspection: "native-only",
  testDelivery: "native-only",
}) satisfies RepositoryWebhookCapabilitySupport;
