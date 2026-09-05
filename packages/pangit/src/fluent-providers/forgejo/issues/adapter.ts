import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { createForgejoIssue, setForgejoIssueState, updateForgejoIssue } from "./mutate-issues.ts";
import {
  createForgejoIssueComment,
  deleteForgejoIssueComment,
  updateForgejoIssueComment,
} from "./mutate-comments.ts";

import { getForgejoIssue, listForgejoIssues } from "./read-issues.ts";
import { getForgejoIssueComment, listForgejoIssueComments } from "./read-comments.ts";
import { forgejoIssueSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
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
    issueSupport: forgejoIssueSupport,
    listIssues: (repository, request) => listForgejoIssues(context, repository, request),
    getIssue: (repository, number, options) =>
      getForgejoIssue(context, repository, number, options),
    createIssue: (repository, input, options) =>
      createForgejoIssue(context, repository, input, options),
    updateIssue: (repository, issue, input, options) =>
      updateForgejoIssue(context, repository, issue, input, options),
    setIssueState: (repository, issue, state, options) =>
      setForgejoIssueState(context, repository, issue, state, options),
    listIssueComments: (repository, issue, request) =>
      listForgejoIssueComments(context, repository, issue, request),
    getIssueComment: (repository, id, options) =>
      getForgejoIssueComment(context, repository, id, options),
    createIssueComment: (
      repository,
      issue,
      input,
      options,
    ) => createForgejoIssueComment(context, repository, issue, input, options),
    updateIssueComment: (
      repository,
      comment,
      input,
      options,
    ) => updateForgejoIssueComment(context, repository, comment, input, options),
    deleteIssueComment: (repository, comment, options) =>
      deleteForgejoIssueComment(context, repository, comment, options),
  };
}
