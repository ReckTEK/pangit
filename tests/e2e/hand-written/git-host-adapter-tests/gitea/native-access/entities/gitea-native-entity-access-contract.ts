import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-api/mod.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { GiteaNativeEntityAccessFixtures } from "./gitea-native-entity-access-fixtures.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove every core entity retains its already-fetched exact Gitea payload without refetching. */
export async function runGiteaNativeEntityAccessContract(
  t: Deno.TestContext,
  input: {
    readonly version: ProviderVersion<"gitea">;
    readonly apiUrl: string;
    readonly token: string;
    readonly fixtures: GiteaNativeEntityAccessFixtures;
  },
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();
  const prove = async <TValue>(
    operation: string,
    expected: readonly string[],
    action: () => Promise<TValue>,
  ): Promise<TValue> => {
    const proof = proveRequestSequence(operation, expected, await recorder.capture(action));
    requestEvidence.push(proof.evidence);
    return proof.value;
  };

  const passed = await t.step("native-access/gitea/entities", async () => {
    const git = await createClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const container = await git.container(input.fixtures.repository.owner);
    const repository = await container.repository(input.fixtures.repository.name);
    const branch = await repository.branches.get(input.fixtures.repository.branch);
    const tag = await repository.tags.get(input.fixtures.repository.tag);
    const commit = await repository.commits.get(input.fixtures.repository.commitSha);
    const content = await repository.content.read(input.fixtures.repository.contentPath, {
      ref: input.fixtures.repository.branch,
    });
    const pullRequest = await repository.pullRequests.get(
      input.fixtures.repository.pullRequestNumber,
    );
    const status = await repository.statuses.set(
      { kind: "commit", sha: input.fixtures.repository.commitSha },
      { context: "pangit/native-entity", state: "success" },
    ).execute();

    const reviewerGit = await createClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.basic(input.fixtures.reviewer).authorize();
    const reviewerRepository = await (await reviewerGit.container(
      input.fixtures.repository.owner,
    )).repository(input.fixtures.repository.name);
    const reviewerPullRequest = await reviewerRepository.pullRequests.get(
      input.fixtures.repository.pullRequestNumber,
    );
    const review = await reviewerRepository.pullRequests.reviews(reviewerPullRequest).create({
      body: "PanGit native entity proof",
    }).execute();

    const identities = await prove("entity.native.gitea", [], async () => ({
      container: await container.native.gitea(({ container }) => container.login),
      repository: await repository.native.gitea(({ repository }) => repository.full_name),
      branch: await branch.native.gitea(({ branch }) => branch.name),
      tag: await tag.native.gitea(({ tag }) => tag.name),
      commit: await commit.native.gitea((context) =>
        "filesResponse" in context ? context.filesResponse.commit?.sha : context.commit.sha
      ),
      content: await content.native.gitea((context) =>
        "requestedPath" in context ? context.requestedPath : context.content.path
      ),
      pullRequest: await pullRequest.native.gitea(({ pullRequest }) => pullRequest.number),
      review: await review.native.gitea(({ review }) => review.id),
      status: await status.native.gitea(({ commitStatus }) => commitStatus.context),
    }));
    assert(identities.container === input.fixtures.repository.owner, "Container payload changed");
    assert(
      identities.repository ===
        `${input.fixtures.repository.owner}/${input.fixtures.repository.name}`,
      "Repository payload changed",
    );
    assert(identities.branch === input.fixtures.repository.branch, "Branch payload changed");
    assert(identities.tag === input.fixtures.repository.tag, "Tag payload changed");
    assert(identities.commit === input.fixtures.repository.commitSha, "Commit payload changed");
    assert(identities.content === input.fixtures.repository.contentPath, "Content payload changed");
    assert(
      Number(identities.pullRequest) === input.fixtures.repository.pullRequestNumber,
      "Pull-request payload changed",
    );
    assert(identities.review !== undefined, "Review payload lost its identity");
    assert(identities.status === "pangit/native-entity", "Status payload changed");
    assertions.push(
      "container, repository, branch, tag, commit, content, pull request, review, and status native payloads require zero refetches",
    );
  });

  return Object.freeze({
    id: "native-access/gitea/entities",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
