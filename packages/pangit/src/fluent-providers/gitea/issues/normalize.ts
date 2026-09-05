import type {
  IssueCommentData,
  IssueData,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";

import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaIssueEntityNative,
  type GiteaIssueEntityPayload,
} from "../native/GiteaIssueNative.ts";

import {
  type AnyGiteaComment,
  type AnyGiteaIssue,
  optionalNonNegativeNumber,
  optionalText,
  requiredIssueState,
  requiredPositiveNumber,
  requiredString,
  requiredText,
} from "./validate-payload.ts";

export function normalizeGiteaIssue<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaIssue,
): IssueData<"gitea", TVersion> {
  const number = requiredPositiveNumber(payload.number, "issue number");
  const state = requiredIssueState(payload.state, `issue ${number} state`);
  return Object.freeze({
    id: requiredText(payload.id, `issue ${number} id`),
    number,
    title: requiredText(payload.title, `issue ${number} title`),
    ...(optionalText(payload.body) === undefined
      ? {}
      : { description: optionalText(payload.body) }),
    state,
    ...(optionalText(payload.user?.login) === undefined
      ? {}
      : { author: optionalText(payload.user?.login) }),
    assignees: Object.freeze((payload.assignees ?? []).flatMap((user) => {
      const login = optionalText(user.login);
      return login === undefined ? [] : [login];
    })),
    labels: Object.freeze((payload.labels ?? []).flatMap((label) => {
      const name = optionalText(label.name);
      return name === undefined ? [] : [name];
    })),
    ...(optionalNonNegativeNumber(payload.comments) === undefined
      ? {}
      : { commentCount: optionalNonNegativeNumber(payload.comments) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    ...(optionalText(payload.updated_at) === undefined
      ? {}
      : { updatedAt: optionalText(payload.updated_at) }),
    ...(optionalText(payload.closed_at) === undefined
      ? {}
      : { closedAt: optionalText(payload.closed_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createGiteaIssueEntityNative(
      "issue",
      client,
      payload as GiteaIssueEntityPayload<TVersion, "issue">,
    ),
  });
}

export function normalizeGiteaIssueComment<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaComment,
): IssueCommentData<"gitea", TVersion> {
  const id = requiredText(payload.id, "issue comment id");
  return Object.freeze({
    id,
    body: requiredString(payload.body, `issue comment ${id} body`),
    ...(optionalText(payload.user?.login) === undefined
      ? {}
      : { author: optionalText(payload.user?.login) }),
    ...(optionalText(payload.created_at) === undefined
      ? {}
      : { createdAt: optionalText(payload.created_at) }),
    ...(optionalText(payload.updated_at) === undefined
      ? {}
      : { updatedAt: optionalText(payload.updated_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createGiteaIssueEntityNative(
      "issueComment",
      client,
      payload as GiteaIssueEntityPayload<TVersion, "issueComment">,
    ),
  });
}
