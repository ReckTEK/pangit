import type { RepositoryWebhookEvent } from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

export function toGiteaEvent(event: RepositoryWebhookEvent): string {
  return event === "pull-request" ? "pull_request" : event === "issue" ? "issues" : event;
}

export function fromGiteaEvent(event: string): RepositoryWebhookEvent | undefined {
  return event === "pull_request"
    ? "pull-request"
    : event === "issues"
    ? "issue"
    : event === "push" || event === "release"
    ? event
    : undefined;
}
