import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { createGiteaIssue, setGiteaIssueState, updateGiteaIssue } from "./mutate-issues.ts";
import {
  createGiteaIssueComment,
  deleteGiteaIssueComment,
  updateGiteaIssueComment,
} from "./mutate-comments.ts";

import { getGiteaIssue, listGiteaIssues } from "./read-issues.ts";
import { getGiteaIssueComment, listGiteaIssueComments } from "./read-comments.ts";
import { giteaIssueSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "issueSupport"
  | "listIssues"
  | "getIssue"
  | "createIssue"
  | "updateIssue"
  | "setIssueState"
  | "listIssueComments"
  | "getIssueComment"
  | "createIssueComment"
  | "updateIssueComment"
  | "deleteIssueComment"
> {
  return {
    issueSupport: giteaIssueSupport,
    listIssues: (repository, request) => listGiteaIssues(context, repository, request),
    getIssue: (repository, number, options) => getGiteaIssue(context, repository, number, options),
    createIssue: (repository, input, options) =>
      createGiteaIssue(context, repository, input, options),
    updateIssue: (repository, issue, input, options) =>
      updateGiteaIssue(context, repository, issue, input, options),
    setIssueState: (repository, issue, state, options) =>
      setGiteaIssueState(context, repository, issue, state, options),
    listIssueComments: (repository, issue, request) =>
      listGiteaIssueComments(context, repository, issue, request),
    getIssueComment: (repository, id, options) =>
      getGiteaIssueComment(context, repository, id, options),
    createIssueComment: (
      repository,
      issue,
      input,
      options,
    ) => createGiteaIssueComment(context, repository, issue, input, options),
    updateIssueComment: (
      repository,
      comment,
      input,
      options,
    ) => updateGiteaIssueComment(context, repository, comment, input, options),
    deleteIssueComment: (repository, comment, options) =>
      deleteGiteaIssueComment(context, repository, comment, options),
  };
}
