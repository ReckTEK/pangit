export { giteaIssueSupport } from "./support.ts";
export { getGiteaIssue, listGiteaIssues } from "./read-issues.ts";

export { createGiteaIssue, setGiteaIssueState, updateGiteaIssue } from "./mutate-issues.ts";

export { getGiteaIssueComment, listGiteaIssueComments } from "./read-comments.ts";

export {
  createGiteaIssueComment,
  deleteGiteaIssueComment,
  updateGiteaIssueComment,
} from "./mutate-comments.ts";

export { normalizeGiteaIssue, normalizeGiteaIssueComment } from "./normalize.ts";

export { createOperations } from "./adapter.ts";
