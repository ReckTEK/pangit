import type { IssueCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/issues.ts";

export const giteaIssueSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    list: "one-page",
    get: "direct",
    create: "direct",
    update: "direct",
    "set-state": "direct",
    "list-comments": "one-page-derived",
    "get-comment": "direct",
    "create-comment": "direct",
    "update-comment": "direct",
    "delete-comment": "direct",
  }),
  contentVersionGuard: "provider-extension",
  timeTracking: "native-only",
  dependencies: "native-only",
  reactions: "native-only",
  attachments: "native-only",
  watchers: "native-only",
}) satisfies IssueCapabilitySupport;
