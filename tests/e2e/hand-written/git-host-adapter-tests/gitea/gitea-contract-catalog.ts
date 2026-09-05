import type { ProviderVersion } from "../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { FluentApiContractResult } from "../../fluent-api-contracts/contract-result.ts";
import { runAuthenticationContract } from "../../fluent-api-contracts/authentication/authentication-contract.ts";
import { runBranchContract } from "../../fluent-api-contracts/branches/branch-contract.ts";
import { runCommitContract } from "../../fluent-api-contracts/commits/commit-contract.ts";
import { runContentReadContract } from "../../fluent-api-contracts/content/content-read-contract.ts";
import { runFileChangeContract } from "../../fluent-api-contracts/content/file-change-contract.ts";
import { runForkContract } from "../../fluent-api-contracts/forks/fork-contract.ts";
import { runCommitStatusContract } from "../../fluent-api-contracts/commit-statuses/commit-status-contract.ts";
import { runBlobReadContract } from "../../fluent-api-contracts/optional/blob-reads/blob-read-contract.ts";
import { runBranchRuleContract } from "../../fluent-api-contracts/optional/branch-rules/branch-rule-contract.ts";
import { runBranchRulePriorityContract } from "../../fluent-api-contracts/optional/branch-rules/branch-rule-priority-contract.ts";
import { runCiRunDiscoveryContract } from "../../fluent-api-contracts/optional/ci-run-discovery/ci-run-discovery-contract.ts";
import { runCurrentUserProfileContract } from "../../fluent-api-contracts/optional/current-user-profile/current-user-profile-contract.ts";
import { runGiteaIssueContentVersionContract } from "../../fluent-api-contracts/optional/issues/issue-content-version-contract.ts";
import { runIssueContract } from "../../fluent-api-contracts/optional/issues/issue-contract.ts";
import { runPackageContract } from "../../fluent-api-contracts/optional/packages/package-contract.ts";
import { runPullRequestReviewContract } from "../../fluent-api-contracts/optional/pull-request-reviews/pull-request-review-contract.ts";
import { runReleaseContract } from "../../fluent-api-contracts/optional/releases/release-contract.ts";
import { runRepositoryWebhookContract } from "../../fluent-api-contracts/optional/repository-webhooks/repository-webhook-contract.ts";
import { runUnsupportedGiteaModulesContract } from "../../fluent-api-contracts/optional/unsupported-gitea-modules/unsupported-gitea-modules-contract.ts";
import { runPullRequestDiscoveryContract } from "../../fluent-api-contracts/pull-requests/pull-request-discovery-contract.ts";
import { runPullRequestMergeContract } from "../../fluent-api-contracts/pull-requests/pull-request-merge-contract.ts";
import { runPullRequestMutationContract } from "../../fluent-api-contracts/pull-requests/pull-request-mutation-contract.ts";
import { runPullRequestReviewsCommentsContract } from "../../fluent-api-contracts/pull-requests/pull-request-reviews-comments-contract.ts";
import { runRepositoryContract } from "../../fluent-api-contracts/repositories/repository-contract.ts";
import { runTagContract } from "../../fluent-api-contracts/tags/tag-contract.ts";
import { runGiteaCommitStatusContract } from "./extensions/commit-status/gitea-commit-status-contract.ts";
import { runGiteaCompareDiffPatchContract } from "./extensions/compare-diff-patch/gitea-compare-diff-patch-contract.ts";
import { runGiteaFileChangeCommitContract } from "./extensions/file-change-commit/gitea-file-change-commit-contract.ts";
import { runGiteaPullRequestMergeContract } from "./extensions/pull-request-merge/gitea-pull-request-merge-contract.ts";
import { runGiteaPullRequestReviewContract } from "./extensions/pull-request-review/gitea-pull-request-review-contract.ts";
import type { GiteaE2EFixtureDriver } from "./GiteaE2EFixtureDriver.ts";
import { GiteaAuthenticationFixtureDriver } from "./authentication/GiteaAuthenticationFixtureDriver.ts";
import { type GiteaFluentContractId, giteaFluentContractIds } from "./gitea-contract-ids.ts";
import { runGiteaNativeClientAccessContract } from "./native-access/client/gitea-native-client-access-contract.ts";
import { runGiteaNativeEntityAccessContract } from "./native-access/entities/gitea-native-entity-access-contract.ts";

export type GiteaContractContext<TVersion extends ProviderVersion<"gitea">> = {
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly webBaseUrl: string;
  readonly token: string;
  readonly username: string;
  readonly password: string;
  readonly timeoutMs: number;
  readonly fixtures: GiteaE2EFixtureDriver<TVersion>;
};

export type GiteaContractCatalogEntry = {
  readonly id: GiteaFluentContractId;
  readonly run: (
    t: Deno.TestContext,
    context: GiteaContractContext<ProviderVersion<"gitea">>,
  ) => Promise<FluentApiContractResult>;
};

/** Complete one-pixel PNG, including its image data and end chunk. */
function pngFixture(): Uint8Array {
  return Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    ),
    (character) => character.charCodeAt(0),
  );
}

const runners: Record<GiteaFluentContractId, GiteaContractCatalogEntry["run"]> = {
  "core/authentication": async (t, context) => {
    const authenticationFixtures = await GiteaAuthenticationFixtureDriver.create({
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      timeoutMs: context.timeoutMs,
    });
    try {
      const fixtures = await authenticationFixtures.createFixtures({
        username: context.username,
        password: context.password,
        webBaseUrl: context.webBaseUrl,
      });
      return await runAuthenticationContract(t, {
        provider: "gitea",
        version: context.version,
        apiUrl: context.apiUrl,
        webBaseUrl: context.webBaseUrl,
        token: context.token,
        fixtures,
      });
    } finally {
      await authenticationFixtures.cleanup();
    }
  },
  "core/repositories": async (t, context) => {
    const fixtures = await context.fixtures.createRepositoryFixtures();
    return await runRepositoryContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures,
    });
  },
  "core/forks": async (t, context) => {
    const source = await context.fixtures.createInitializedRepository("fork-source");
    const destination = await context.fixtures.createOrganization("fork-destination");
    const forkName = `${context.fixtures.prefix}-created-fork`;
    context.fixtures.trackKnownRepository(destination.name, forkName);
    return await runForkContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        source: { owner: source.owner, repository: source.name },
        destination,
        forkName,
      },
    });
  },
  "core/branches": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("branches");
    const head = "feature-diverged";
    await context.fixtures.createBranch(repository, head, repository.headSha);
    const baseSha = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "main divergence fixture",
      changes: [{ operation: "create", path: "main-only.txt", content: "main\n" }],
    });
    const headSha = await context.fixtures.commitFiles(repository, {
      branch: head,
      message: "feature divergence fixture",
      changes: [{ operation: "create", path: "feature-only.txt", content: "feature\n" }],
    });
    return await runBranchContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        base: repository.defaultBranch,
        head,
        baseSha,
        headSha,
        expectedAhead: 1,
        expectedBehind: 1,
        mutationBranch: `${context.fixtures.prefix}-branch-mutation`,
      },
    });
  },
  "core/tags": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("tags");
    const existingTag = "fixture-v1";
    await context.fixtures.createTag(repository, existingTag, repository.headSha);
    return await runTagContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        targetSha: repository.headSha,
        existingTag,
        mutationTag: "fluent-v2",
      },
    });
  },
  "core/commits": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("commits");
    const head = "feature-commits";
    await context.fixtures.createBranch(repository, head, repository.headSha);
    const baseChangedPath = "main-commit.txt";
    const baseSha = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "main commit fixture",
      changes: [{ operation: "create", path: baseChangedPath, content: "main\n" }],
    });
    const headSha = await context.fixtures.commitFiles(repository, {
      branch: head,
      message: "feature commit fixture",
      changes: [{ operation: "create", path: "feature-commit.txt", content: "feature\n" }],
    });
    const headTag = "feature-head";
    await context.fixtures.createTag(repository, headTag, headSha);
    return await runCommitContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        rootSha: repository.headSha,
        base: repository.defaultBranch,
        baseSha,
        head,
        headSha,
        baseChangedPath,
        headTag,
      },
    });
  },
  "core/content-reads": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("content");
    const linkedRepository = {
      owner: context.fixtures.currentUser,
      name: "e2e-links",
    };
    const submoduleSha = await context.fixtures.getFileSha(
      linkedRepository,
      "vendor/external",
      "main",
    );
    const text = { path: "text.txt", value: "hello from PanGit\n" };
    const binary = { path: "binary.bin", value: [0, 1, 2, 127, 128, 255] };
    const unicodeValue = "Hello, 世界 🌍 café\n";
    const json = { path: "config.json", value: { title: "世界 🌍", enabled: true, count: 2 } };
    const image = { path: "image.png", extensionlessPath: "image", bytes: [...pngFixture()] };
    const unknownBinaryPath = "unknown-content";
    const nestedPath = "nested/a.txt";
    const deepPath = "nested/deeper/b.txt";
    const parentRef = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "content tree fixture",
      changes: [
        { operation: "create", path: text.path, content: text.value },
        { operation: "create", path: binary.path, content: new Uint8Array(binary.value) },
        { operation: "create", path: "empty.txt", content: "" },
        { operation: "create", path: "unicodé-文件.txt", content: unicodeValue },
        { operation: "create", path: json.path, content: JSON.stringify(json.value) },
        { operation: "create", path: "invalid.json", content: "{not JSON}" },
        { operation: "create", path: image.path, content: new Uint8Array(image.bytes) },
        {
          operation: "create",
          path: image.extensionlessPath,
          content: new Uint8Array(image.bytes),
        },
        { operation: "create", path: unknownBinaryPath, content: new Uint8Array(binary.value) },
        { operation: "create", path: nestedPath, content: "parent\n" },
        { operation: "create", path: deepPath, content: "deep\n" },
        { operation: "create", path: "chain/one/two/file.txt", content: "chain\n" },
      ],
    });
    const nestedSha = await context.fixtures.getFileSha(repository, nestedPath, parentRef);
    const ref = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "content first-parent fixture",
      changes: [{
        operation: "update",
        path: nestedPath,
        content: "current\n",
        sha: nestedSha,
      }],
    });
    return await runContentReadContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        ref,
        branch: repository.defaultBranch,
        parentRef,
        text,
        binary,
        emptyPath: "empty.txt",
        unicodePath: "unicodé-文件.txt",
        unicodeValue,
        json,
        invalidJsonPath: "invalid.json",
        image,
        unknownBinaryPath,
        nestedDirectory: "nested",
        nestedPath,
        deepPath,
        chainDirectory: "chain",
        linkedContent: {
          repository: linkedRepository,
          ref: "main",
          symlinkPath: "link.txt",
          symlinkTarget: "target.txt",
          symlinkTargetValue: "symlink-target\n",
          submodulePath: "vendor/external",
          submoduleUrl: "https://example.invalid/external.git",
          internalSubmodulePath: "vendor/internal",
          internalSubmoduleUrl: `http://gitea:3000/${context.username}/e2e-submodule.git`,
          submoduleSha,
        },
      },
    });
  },
  "core/file-change-commits": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("file-changes");
    const originalHeadSha = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "file-change starting tree",
      changes: [
        { operation: "create", path: "update.txt", content: "before update\n" },
        { operation: "create", path: "delete.txt", content: "delete me\n" },
        { operation: "create", path: "move.txt", content: "move me\n" },
      ],
    });
    return await runFileChangeContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        branch: repository.defaultBranch,
        originalHeadSha,
        updatePath: "update.txt",
        deletePath: "delete.txt",
        movePath: "move.txt",
        createdPath: "created.txt",
        movedPath: "moved.txt",
        newBranch: "batch-created-branch",
      },
    });
  },
  "core/pull-request-discovery": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("pr-discovery");
    const sameBranch = "discovery-same";
    const samePath = "same-source.txt";
    await context.fixtures.createBranch(repository, sameBranch, repository.headSha);
    const sameSha = await context.fixtures.commitFiles(repository, {
      branch: sameBranch,
      message: "same-repository PR discovery fixture",
      changes: [{ operation: "create", path: samePath, content: "same\n" }],
    });
    const sameTitle = "PanGit discovery same repository";
    const samePullRequest = await context.fixtures.createPullRequest(repository, {
      title: sameTitle,
      body: "same-repository discovery fixture",
      base: repository.defaultBranch,
      head: sameBranch,
    });
    await context.fixtures.waitForPullRequestSearch(
      repository,
      samePullRequest.number,
      sameTitle,
    );

    const forkOwner = await context.fixtures.createOrganization("prd");
    const forkName = `${context.fixtures.prefix}-pr-discovery-fork`;
    await context.fixtures.createFork(repository, forkOwner.name, forkName);
    const crossBranch = "discovery-cross";
    const crossPath = "cross-source.txt";
    const forkRepository = { owner: forkOwner.name, name: forkName };
    await context.fixtures.createBranch(forkRepository, crossBranch, repository.headSha);
    const crossSha = await context.fixtures.commitFiles(forkRepository, {
      branch: crossBranch,
      message: "cross-fork PR discovery fixture",
      changes: [{ operation: "create", path: crossPath, content: "cross\n" }],
    });
    const crossPullRequest = await context.fixtures.createPullRequest(repository, {
      title: "PanGit discovery cross fork",
      base: repository.defaultBranch,
      head: `${forkOwner.name}:${crossBranch}`,
    });

    return await runPullRequestDiscoveryContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        base: repository.defaultBranch,
        sameRepository: {
          owner: repository.owner,
          repository: repository.name,
          branch: sameBranch,
          sha: sameSha,
          changedPath: samePath,
          number: samePullRequest.number,
          title: sameTitle,
        },
        crossFork: {
          owner: forkOwner.name,
          repository: forkName,
          branch: crossBranch,
          sha: crossSha,
          changedPath: crossPath,
          number: crossPullRequest.number,
        },
      },
    });
  },
  "core/pull-request-mutation": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("pr-mutation");
    const createSource = async (
      owner: string,
      name: string,
      branch: string,
      source: string,
      path: string,
    ) => {
      const target = { owner, name };
      await context.fixtures.createBranch(target, branch, source);
      const sha = await context.fixtures.commitFiles(target, {
        branch,
        message: `${branch} fixture`,
        changes: [{ operation: "create" as const, path, content: `${branch}\n` }],
      });
      return { owner, repository: name, branch, sha, changedPath: path };
    };
    const sameRepository = await createSource(
      repository.owner,
      repository.name,
      "mutation-same",
      repository.headSha,
      "mutation-same.txt",
    );
    const closeSource = await createSource(
      repository.owner,
      repository.name,
      "mutation-close",
      repository.headSha,
      "mutation-close.txt",
    );
    const forkOwner = await context.fixtures.createOrganization("prm");
    const forkName = `${context.fixtures.prefix}-pr-mutation-fork`;
    await context.fixtures.createFork(repository, forkOwner.name, forkName);
    const crossFork = await createSource(
      forkOwner.name,
      forkName,
      "mutation-cross",
      repository.headSha,
      "mutation-cross.txt",
    );
    return await runPullRequestMutationContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        base: repository.defaultBranch,
        sameRepository,
        crossFork,
        closeSource,
      },
    });
  },
  "core/pull-request-merge": async (t, context) => {
    const createMergeCandidate = async (label: string, branch: string, path: string) => {
      const repository = await context.fixtures.createInitializedRepository(label);
      await context.fixtures.createBranch(repository, branch, repository.headSha);
      await context.fixtures.commitFiles(repository, {
        branch,
        message: `${branch} fixture`,
        changes: [{ operation: "create", path, content: `${branch}\n` }],
      });
      const pullRequest = await context.fixtures.createPullRequest(repository, {
        title: `PanGit ${branch}`,
        base: repository.defaultBranch,
        head: branch,
      });
      await context.fixtures.waitForPullRequestMergeable(repository, pullRequest.number);
      return {
        repository: { owner: repository.owner, name: repository.name },
        number: pullRequest.number,
        sourceBranch: branch,
      };
    };
    const defaultMerge = await createMergeCandidate(
      "pr-merge-default",
      "merge-default",
      "merge-default.txt",
    );
    const squashMerge = await createMergeCandidate(
      "pr-merge-squash",
      "merge-squash",
      "merge-squash.txt",
    );
    return await runPullRequestMergeContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        defaultMerge,
        squashMerge,
      },
    });
  },
  "core/pull-request-reviews-comments": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("pr-reviews");
    const changedPath = "reviewed.txt";
    const baseSha = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "review base fixture",
      changes: [{ operation: "create", path: changedPath, content: "old one\nold two\n" }],
    });
    const branch = "review-source";
    await context.fixtures.createBranch(repository, branch, baseSha);
    const fileSha = await context.fixtures.getFileSha(repository, changedPath, branch);
    await context.fixtures.commitFiles(repository, {
      branch,
      message: "review source fixture",
      changes: [{
        operation: "update",
        path: changedPath,
        sha: fileSha,
        content: "new one\nnew two\n",
      }],
    });
    const pullRequest = await context.fixtures.createPullRequest(repository, {
      title: "PanGit review actions",
      base: repository.defaultBranch,
      head: branch,
    });
    const reviewer = await context.fixtures.createUser("reviewer");
    await context.fixtures.addCollaborator(repository, reviewer.username, "write");
    return await runPullRequestReviewsCommentsContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        number: pullRequest.number,
        changedPath,
        reviewer,
      },
    });
  },
  "core/commit-statuses": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("statuses");
    const branch = "status-branch";
    await context.fixtures.createBranch(repository, branch, repository.headSha);
    const commitSha = await context.fixtures.commitFiles(repository, {
      branch,
      message: "status fixture commit",
      changes: [{ operation: "create", path: "status.txt", content: "status\n" }],
    });
    const tag = "status-tag";
    await context.fixtures.createTag(repository, tag, commitSha);
    const pullRequest = await context.fixtures.createPullRequest(repository, {
      title: "PanGit status PR",
      base: repository.defaultBranch,
      head: branch,
    });
    if (pullRequest.number <= 0) throw new Error("Status PR fixture is invalid");
    const providerOnlyContext = "pangit/provider-warning";
    await context.fixtures.createCommitStatus(repository, commitSha, {
      context: providerOnlyContext,
      state: "warning",
      description: "provider-only state fixture",
    });
    return await runCommitStatusContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        commitSha,
        branch,
        tag,
        pullRequestNumber: pullRequest.number,
        providerOnlyContext,
        providerOnlyState: "warning",
      },
    });
  },
  "gitea-extension/file-change-commit": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("extension-files");
    return await runGiteaFileChangeCommitContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        branch: repository.defaultBranch,
        createdPath: "gitea-extension.txt",
      },
    });
  },
  "gitea-extension/compare-diff-patch": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("extension-compare");
    const base = repository.headSha;
    const branch = "extension-compare-head";
    await context.fixtures.createBranch(repository, branch, base);
    const changedPath = "extension-compare.txt";
    const head = await context.fixtures.commitFiles(repository, {
      branch,
      message: "Gitea raw comparison fixture",
      changes: [{ operation: "create", path: changedPath, content: "compare me\n" }],
    });
    return await runGiteaCompareDiffPatchContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        base,
        head,
        changedPath,
      },
    });
  },
  "gitea-extension/pull-request-merge": async (t, context) => {
    const createCandidate = async (label: string) => {
      const repository = await context.fixtures.createInitializedRepository(label);
      const branch = "extension-merge";
      await context.fixtures.createBranch(repository, branch, repository.headSha);
      const sourceSha = await context.fixtures.commitFiles(repository, {
        branch,
        message: `${label} source`,
        changes: [{ operation: "create", path: `${label}.txt`, content: `${label}\n` }],
      });
      const pullRequest = await context.fixtures.createPullRequest(repository, {
        title: `PanGit ${label}`,
        base: repository.defaultBranch,
        head: branch,
      });
      await context.fixtures.waitForPullRequestMergeable(repository, pullRequest.number);
      return {
        repository: { owner: repository.owner, name: repository.name },
        number: pullRequest.number,
        sourceSha,
      };
    };
    return await runGiteaPullRequestMergeContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        success: await createCandidate("extension-merge-success"),
        staleHead: await createCandidate("extension-merge-stale"),
        scheduled: await (async () => {
          const candidate = await createCandidate("extension-merge-scheduled");
          await context.fixtures.requireCommitStatusForBranch(
            candidate.repository,
            "main",
            "pangit/required-never-set",
          );
          await context.fixtures.waitForPullRequestMergeable(
            candidate.repository,
            candidate.number,
          );
          return candidate;
        })(),
      },
    });
  },
  "gitea-extension/pull-request-review": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("extension-review");
    const changedPath = "extension-reviewed.txt";
    const baseSha = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "Gitea review extension base",
      changes: [{ operation: "create", path: changedPath, content: "old line\n" }],
    });
    const branch = "extension-review-head";
    await context.fixtures.createBranch(repository, branch, baseSha);
    const fileSha = await context.fixtures.getFileSha(repository, changedPath, branch);
    const sourceSha = await context.fixtures.commitFiles(repository, {
      branch,
      message: "Gitea review extension source",
      changes: [{
        operation: "update",
        path: changedPath,
        sha: fileSha,
        content: "new line\n",
      }],
    });
    const pullRequest = await context.fixtures.createPullRequest(repository, {
      title: "PanGit Gitea review extension",
      base: repository.defaultBranch,
      head: branch,
    });
    const reviewer = await context.fixtures.createUser("ext-review");
    await context.fixtures.addCollaborator(repository, reviewer.username, "write");
    return await runGiteaPullRequestReviewContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        pullRequestNumber: pullRequest.number,
        sourceSha,
        changedPath,
        reviewer,
      },
    });
  },
  "gitea-extension/commit-status": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("extension-status");
    return await runGiteaCommitStatusContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        ref: repository.headSha,
      },
    });
  },
  "shared-capability/current-user-profile": async (t, context) => {
    return await runCurrentUserProfileContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: { expectedUsername: context.fixtures.currentUser },
    });
  },
  "shared-capability/issues": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("issues");
    return await runIssueContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: { repository: { owner: repository.owner, name: repository.name } },
    });
  },
  "gitea-extension/issue-content-version": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository(
      "issue-content-version",
    );
    return await runGiteaIssueContentVersionContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: { repository: { owner: repository.owner, name: repository.name } },
    });
  },
  "shared-capability/releases": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("releases");
    const tagName = "optional-release-v1";
    await context.fixtures.createTag(repository, tagName, repository.headSha);
    return await runReleaseContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        tagName,
        asset: {
          name: "release-fixture.bin",
          renamedName: "release-fixture-renamed.bin",
          bytes: [0, 1, 2, 127, 128, 255],
        },
      },
    });
  },
  "shared-capability/repository-webhooks": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("webhooks");
    return await runRepositoryWebhookContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        branch: repository.defaultBranch,
        receiver: context.fixtures.createWebhookReceiver("repository-webhooks"),
      },
    });
  },
  "shared-capability/ci-run-discovery": async (t, context) => {
    return await runCiRunDiscoveryContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: await context.fixtures.createCiRunDiscoveryFixtures(),
    });
  },
  "shared-capability/packages": async (t, context) => {
    return await runPackageContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: await context.fixtures.createPackageFixtures(),
    });
  },
  "shared-capability/blob-reads": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("blob-reads");
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
    const path = "known-blob.bin";
    const text = "Hello, 世界 🌍 café\n";
    const json = { title: "世界 🌍", enabled: true, count: 2 };
    const image = pngFixture();
    const ref = await context.fixtures.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "add known blob fixture",
      changes: [
        { operation: "create", path, content: bytes },
        { operation: "create", path: "text.txt", content: text },
        { operation: "create", path: "empty.txt", content: "" },
        { operation: "create", path: "config.json", content: JSON.stringify(json) },
        { operation: "create", path: "invalid.json", content: "{not JSON}" },
        { operation: "create", path: "image.png", content: image },
      ],
    });
    const sha = await context.fixtures.getFileSha(repository, path, ref);
    return await runBlobReadContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        blob: { sha, bytes },
        text: { sha: await context.fixtures.getFileSha(repository, "text.txt", ref), value: text },
        emptySha: await context.fixtures.getFileSha(repository, "empty.txt", ref),
        json: {
          sha: await context.fixtures.getFileSha(repository, "config.json", ref),
          value: json,
        },
        invalidJsonSha: await context.fixtures.getFileSha(repository, "invalid.json", ref),
        image: {
          sha: await context.fixtures.getFileSha(repository, "image.png", ref),
          bytes: image,
        },
        missingSha: "ffffffffffffffffffffffffffffffffffffffff",
      },
    });
  },
  "shared-capability/pull-request-reviews": async (t, context) => {
    const reviewer = await context.fixtures.createUser("opt-review");
    const repository = await context.fixtures.createInitializedRepository("review-objects");
    await context.fixtures.addCollaborator(repository, reviewer.username, "write");
    const branch = "review-object-source";
    await context.fixtures.createBranch(repository, branch, repository.headSha);
    await context.fixtures.commitFiles(repository, {
      branch,
      message: "add review-object source",
      changes: [{ operation: "create", path: "review-object.txt", content: "review me\n" }],
    });
    const pullRequest = await context.fixtures.createPullRequest(repository, {
      title: "PanGit review-object fixture",
      base: repository.defaultBranch,
      head: branch,
    });
    return await runPullRequestReviewContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        pullRequestNumber: pullRequest.number,
        reviewer,
      },
    });
  },
  "shared-capability/branch-rules": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("branch-rules");
    return await runBranchRuleContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        branch: repository.defaultBranch,
        ruleName: repository.defaultBranch,
      },
    });
  },
  "gitea-extension/branch-rule-priority": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("branch-rule-priority");
    return await runBranchRulePriorityContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: { owner: repository.owner, name: repository.name },
        orderedRuleNames: ["priority-first", "priority-second"],
      },
    });
  },
  "shared-capability/unsupported-gitea-modules": async (t, context) => {
    return await runUnsupportedGiteaModulesContract(t, {
      provider: "gitea",
      version: context.version,
      apiUrl: context.apiUrl,
    });
  },
  "native-access/gitea/client": async (t, context) => {
    return await runGiteaNativeClientAccessContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
    });
  },
  "native-access/gitea/entities": async (t, context) => {
    const repository = await context.fixtures.createInitializedRepository("native-entities");
    const branch = "native-entity-branch";
    await context.fixtures.createBranch(repository, branch, repository.headSha);
    const contentPath = "native-entity.txt";
    const commitSha = await context.fixtures.commitFiles(repository, {
      branch,
      message: "native entity fixture",
      changes: [{ operation: "create", path: contentPath, content: "native entity\n" }],
    });
    const tag = "native-entity-tag";
    await context.fixtures.createTag(repository, tag, commitSha);
    const pullRequest = await context.fixtures.createPullRequest(repository, {
      title: "PanGit native entity fixture",
      base: repository.defaultBranch,
      head: branch,
    });
    const reviewer = await context.fixtures.createUser("nat-review");
    await context.fixtures.addCollaborator(repository, reviewer.username, "write");
    return await runGiteaNativeEntityAccessContract(t, {
      version: context.version,
      apiUrl: context.apiUrl,
      token: context.token,
      fixtures: {
        repository: {
          owner: repository.owner,
          name: repository.name,
          branch,
          tag,
          commitSha,
          contentPath,
          pullRequestNumber: pullRequest.number,
        },
        reviewer,
      },
    });
  },
};

/** Stable ordered Gitea contract catalog; IDs and implementations must be added together. */
export const giteaContractCatalog: readonly GiteaContractCatalogEntry[] = Object.freeze(
  giteaFluentContractIds.map((id) => Object.freeze({ id, run: runners[id] })),
);

/** Select one stable contract or the complete ordered catalog. */
export function selectGiteaContracts(
  requestedId?: string,
): readonly GiteaContractCatalogEntry[] {
  if (requestedId === undefined) return giteaContractCatalog;
  const found = giteaContractCatalog.find((entry) => entry.id === requestedId);
  if (found === undefined) throw new TypeError(`Unknown Gitea fluent contract: ${requestedId}`);
  return Object.freeze([found]);
}
