import type { ReleaseCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/releases.ts";

export const forgejoReleaseSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    list: "one-page",
    get: "direct",
    "get-by-tag": "direct",
    create: "direct",
    update: "direct",
    delete: "direct",
    "list-assets": "direct-bounded-result",
    "get-asset": "direct",
    "upload-asset": "direct",
    "update-asset": "direct",
    "delete-asset": "direct",
  }),
  signing: "native-only",
}) satisfies ReleaseCapabilitySupport;
