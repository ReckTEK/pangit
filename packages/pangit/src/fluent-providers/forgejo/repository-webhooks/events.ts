import type { RepositoryWebhookEvent } from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

export function toForgejoEvent(event: RepositoryWebhookEvent): string {
  return event === "pull-request" ? "pull_request" : event === "issue" ? "issues" : event;
}

export function fromForgejoEvent(event: string): RepositoryWebhookEvent | undefined {
  return event === "pull_request"
    ? "pull-request"
    : event === "issues"
    ? "issue"
    : event === "push" || event === "release"
    ? event
    : undefined;
}
