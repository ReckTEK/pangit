import { createRepositoryPullRequests } from "../fluent-api/capabilities/RepositoryPullRequests.ts";
import { createRepositoryIssues } from "../fluent-api/capabilities/optional/RepositoryIssues.ts";
import { createGiteaAdapter } from "../fluent-providers/gitea/create-adapter.ts";
import { createRepositoryContent } from "../fluent-api/capabilities/RepositoryContent.ts";
import { createRepositoryCommitStatuses } from "../fluent-api/capabilities/RepositoryCommitStatuses.ts";
import type { CommitFileChangesInput } from "../fluent-api/adapter-contract/content.ts";
import type { SetCommitStatusInput } from "../fluent-api/adapter-contract/commit-statuses.ts";

const captured = new Error("adapter input captured");

async function fixture() {
  const adapter = createGiteaAdapter("1.27.2", {
    baseUrl: "https://provider.invalid/api/v1",
    fetch: () =>
      Promise.resolve(Response.json({
        number: 1,
        title: "Original",
        state: "open",
        merged: false,
        head: {
          ref: "feature",
          sha: "a".repeat(40),
          repo: { name: "project", owner: { login: "acme" } },
        },
        base: {
          ref: "main",
          sha: "b".repeat(40),
          repo: { name: "project", owner: { login: "acme" } },
        },
        id: 1,
        username: "acme",
        login: "acme",
        name: "project",
        full_name: "acme/project",
        owner: { login: "acme" },
      })),
  });
  const repository = await adapter.getRepository(
    await adapter.getRepositoryContainer("acme"),
    "project",
  );
  return { adapter, repository };
}

async function execute(operation: { execute(): Promise<unknown> }) {
  try {
    await operation.execute();
    throw new Error("Operation did not reach the adapter");
  } catch (error) {
    if (error !== captured) throw error;
  }
}

for (const shared of [false, true]) {
  Deno.test(`deferred file commits own inputs and ${shared ? "shared" : "ordinary"} binary content`, async () => {
    const { adapter, repository } = await fixture();
    const received: CommitFileChangesInput[] = [];
    const content = createRepositoryContent({
      ...adapter,
      commitFileChanges(_repository, input) {
        received.push(input);
        return Promise.reject(captured);
      },
    }, repository);
    const bytes = new Uint8Array(shared ? new SharedArrayBuffer(2) : new ArrayBuffer(2));
    bytes.set([0, 255]);
    const input = {
      branch: "main",
      message: "original",
      author: { name: "original" },
      changes: [{
        operation: "create" as const,
        path: "file.bin",
        content: bytes,
      }],
    };
    const operation = content.commitChanges(input);
    input.branch = "other";
    input.message = "changed";
    input.author.name = "changed";
    input.changes[0].path = "other.bin";
    input.changes[0].content.fill(1);
    input.changes.length = 0;
    let contextBranch: string | undefined;
    const configured = operation.gitea((context) => {
      contextBranch = context.branch;
      return {};
    });
    await execute(configured);
    const result = received[0];
    const change = result.changes[0];
    if (
      result.branch !== contextBranch || result.branch !== "main" ||
      result.message !== "original" ||
      result.author?.name !== "original" || result.changes.length !== 1 ||
      change.operation !== "create" || change.path !== "file.bin" ||
      !(change.content instanceof Uint8Array) || change.content[0] !== 0 ||
      change.content[1] !== 255
    ) throw new Error("Caller mutation changed the deferred commit");
  });
}

Deno.test("deferred statuses retain their validated input until execution", async () => {
  const { adapter, repository } = await fixture();
  const received: SetCommitStatusInput[] = [];
  const statuses = createRepositoryCommitStatuses({
    ...adapter,
    setCommitStatus(_repository, _reference, input) {
      received.push(input);
      return Promise.reject(captured);
    },
  }, repository);
  const input: { context: string; state: "pending" | "success" } = {
    context: "original",
    state: "pending",
  };
  const operation = statuses.set({ kind: "commit", sha: "a".repeat(40) }, input);
  input.context = "changed";
  input.state = "success";
  await execute(operation);
  if (received[0].context !== "original" || received[0].state !== "pending") {
    throw new Error("Caller mutation changed the validated status");
  }
});

Deno.test("deferred merges, reviews, and issue edits retain their prepared fields", async () => {
  const { adapter, repository } = await fixture();
  const observed: unknown[] = [];
  const capture = (input: unknown): Promise<never> => {
    observed.push(input);
    return Promise.reject(captured);
  };
  const operations = {
    ...adapter,
    mergePullRequest: (...args: Parameters<typeof adapter.mergePullRequest>) => capture(args[2]),
    createPullRequestReview: (...args: Parameters<typeof adapter.createPullRequestReview>) =>
      capture(args[2]),
    updateIssue: (...args: Parameters<typeof adapter.updateIssue>) => capture(args[2]),
  };
  const pullRequests = createRepositoryPullRequests(operations, repository);
  const issues = createRepositoryIssues("gitea", "1.27.2", operations, repository);
  const pull = await pullRequests.get(1);
  const issue = await issues.get(1);
  const mergeInput: { method: "squash" | "provider-default"; deleteSourceBranch: boolean } = {
    method: "squash",
    deleteSourceBranch: true,
  };
  const reviewInput = { body: "original", commitSha: "a".repeat(40) };
  const issueInput = { title: "original", description: "original" };
  const merge = pullRequests.merge(pull, mergeInput);
  const review = pullRequests.reviews(pull).create(reviewInput);
  const edit = issues.update(issue, issueInput);
  mergeInput.method = "provider-default";
  mergeInput.deleteSourceBranch = false;
  reviewInput.body = "changed";
  reviewInput.commitSha = "b".repeat(40);
  issueInput.title = "changed";
  issueInput.description = "changed";
  await execute(merge);
  await execute(review);
  await execute(edit);
  const expected = [
    { method: "squash", deleteSourceBranch: true },
    { body: "original", commitSha: "a".repeat(40) },
    { title: "original", description: "original" },
  ];
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    throw new Error("Caller mutation changed a deferred operation");
  }
});
