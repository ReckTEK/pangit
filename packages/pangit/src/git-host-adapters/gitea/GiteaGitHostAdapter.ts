import type { GitHostAdapter } from "../../fluent-api/adapter-contract/GitHostAdapter.ts";
import {
  authorizeGiteaBasic,
  authorizeGiteaToken,
  beginGiteaOAuth,
  exchangeGiteaOAuthCode,
} from "./authentication.ts";
import {
  createGiteaBranch,
  deleteGiteaBranch,
  getGiteaBranch,
  getGiteaBranchDivergence,
  giteaBranchExists,
  listGiteaBranchDivergences,
  listGiteaBranches,
  renameGiteaBranch,
} from "./branches.ts";
import {
  compareGiteaCommits,
  countGiteaReachableCommits,
  findGiteaMergeBases,
  findGiteaRefsForCommit,
  getGiteaCommit,
  getGiteaCommits,
  listGiteaCommitFiles,
  listGiteaCommits,
  listGiteaContributors,
} from "./commits.ts";
import {
  commitGiteaFileChanges,
  getGiteaDirectory,
  listGiteaDirectory,
  readGiteaContent,
  readGiteaFiles,
  readGiteaPathMetadataBatch,
  readGiteaSubmodule,
  readGiteaSymlink,
} from "./content.ts";
import { createGiteaFork, listGiteaForks } from "./forks.ts";
import { GiteaAdapterContext, type GiteaAdapterOptions } from "./GiteaAdapterContext.ts";
import { createGiteaClientNative } from "./native/GiteaClientNative.ts";
import type { GiteaVersion } from "./native/GiteaEntityNative.ts";
import { getGiteaBlob, giteaBlobReadSupport } from "./optional-capabilities/blob-reads.ts";
import {
  createGiteaBranchRule,
  deleteGiteaBranchRule,
  getGiteaBranchRule,
  getGiteaEffectiveBranchProtection,
  giteaBranchRuleSupport,
  listGiteaBranchRules,
  setGiteaBranchRuleOrder,
  updateGiteaBranchRule,
} from "./optional-capabilities/branch-rules.ts";
import {
  findGiteaCiRunArtifact,
  getGiteaCiArtifact,
  getGiteaCiJob,
  getGiteaCiRun,
  getGiteaCiWorkflow,
  giteaCiRunDiscoverySupport,
  listGiteaCiRunJobs,
  listGiteaCiRuns,
} from "./optional-capabilities/ci-run-discovery.ts";
import {
  getGiteaCurrentUserProfile,
  giteaCurrentUserProfileSupport,
} from "./optional-capabilities/current-user-profile.ts";
import {
  createGiteaIssue,
  createGiteaIssueComment,
  deleteGiteaIssueComment,
  getGiteaIssue,
  getGiteaIssueComment,
  giteaIssueSupport,
  listGiteaIssueComments,
  listGiteaIssues,
  setGiteaIssueState,
  updateGiteaIssue,
  updateGiteaIssueComment,
} from "./optional-capabilities/issues.ts";
import {
  deleteGiteaPackage,
  deleteGiteaPackageVersion,
  findGiteaPackageVersion,
  getGiteaPackageVersion,
  giteaPackageSupport,
  listGiteaPackageFiles,
  listGiteaPackages,
  listGiteaPackageVersions,
} from "./optional-capabilities/packages.ts";
import {
  createGiteaPullRequestReview,
  getGiteaPullRequestReview,
  giteaPullRequestReviewSupport,
  listGiteaPullRequestReviews,
  submitGiteaPullRequestReview,
} from "./optional-capabilities/pull-request-reviews.ts";
import {
  createGiteaRelease,
  deleteGiteaRelease,
  deleteGiteaReleaseAsset,
  getGiteaRelease,
  getGiteaReleaseAsset,
  getGiteaReleaseByTag,
  giteaReleaseSupport,
  listGiteaReleaseAssets,
  listGiteaReleases,
  updateGiteaRelease,
  updateGiteaReleaseAsset,
  uploadGiteaReleaseAsset,
} from "./optional-capabilities/releases.ts";
import {
  createGiteaRepositoryWebhook,
  deleteGiteaRepositoryWebhook,
  getGiteaRepositoryWebhook,
  giteaRepositoryWebhookSupport,
  listGiteaRepositoryWebhooks,
  updateGiteaRepositoryWebhook,
} from "./optional-capabilities/repository-webhooks.ts";
import {
  createGiteaRepository,
  deleteGiteaRepository,
  findGiteaRepository,
  getGiteaRepository,
  hasGiteaRepository,
  listGiteaRepositories,
  renameGiteaRepository,
} from "./repositories.ts";
import {
  getGiteaRepositoryContainer,
  listGiteaRepositoryContainers,
} from "./repository-containers.ts";
import { createGiteaTag, deleteGiteaTag, getGiteaTag, listGiteaTags } from "./tags.ts";
import {
  approveGiteaPullRequest,
  closeGiteaPullRequest,
  createGiteaPullRequest,
  findGiteaPullRequest,
  getGiteaPullRequest,
  isGiteaPullRequestMerged,
  listGiteaPullRequestCommits,
  listGiteaPullRequestFiles,
  listGiteaPullRequests,
  mergeGiteaPullRequest,
  publishGiteaPullRequestComment,
  requestGiteaPullRequestReviewers,
  updateGiteaPullRequest,
} from "./pull-requests.ts";
import {
  getGiteaCommitStatus,
  listGiteaCommitStatuses,
  setGiteaCommitStatus,
} from "./commit-statuses.ts";

type Adapter<TVersion extends GiteaVersion> = GitHostAdapter<"gitea", TVersion>;

/** Complete Gitea implementation behind the universal concern contracts. */
export class GiteaGitHostAdapter<TVersion extends GiteaVersion> implements Adapter<TVersion> {
  readonly #context: GiteaAdapterContext<TVersion>;
  readonly provider = "gitea" as const;
  readonly native: Adapter<TVersion>["native"];
  readonly currentUserProfileSupport = giteaCurrentUserProfileSupport;
  readonly issueSupport = giteaIssueSupport;
  readonly releaseSupport = giteaReleaseSupport;
  readonly repositoryWebhookSupport = giteaRepositoryWebhookSupport;
  readonly ciRunDiscoverySupport = giteaCiRunDiscoverySupport;
  readonly packageSupport = giteaPackageSupport;
  readonly blobReadSupport = giteaBlobReadSupport;
  readonly pullRequestReviewSupport = giteaPullRequestReviewSupport;
  readonly branchRuleSupport = giteaBranchRuleSupport;

  constructor(
    readonly version: TVersion,
    options: GiteaAdapterOptions,
    context?: GiteaAdapterContext<TVersion>,
  ) {
    this.#context = context ?? new GiteaAdapterContext(version, options);
    this.native = createGiteaClientNative(() => this.#context.client());
  }

  authorizeToken: Adapter<TVersion>["authorizeToken"] = async (input, options) =>
    this.#withContext(await authorizeGiteaToken(this.#context, input, options));

  authorizeBasic: Adapter<TVersion>["authorizeBasic"] = async (input, options) =>
    this.#withContext(await authorizeGiteaBasic(this.#context, input, options));

  beginOAuth: Adapter<TVersion>["beginOAuth"] = (input) => beginGiteaOAuth(this.#context, input);

  exchangeOAuthCode: Adapter<TVersion>["exchangeOAuthCode"] = (input, options) =>
    exchangeGiteaOAuthCode(this.#context, input, options);

  listRepositoryContainers: Adapter<TVersion>["listRepositoryContainers"] = (request) =>
    listGiteaRepositoryContainers(this.#context, request);

  getRepositoryContainer: Adapter<TVersion>["getRepositoryContainer"] = (name, options) =>
    getGiteaRepositoryContainer(this.#context, name, options);

  listRepositories: Adapter<TVersion>["listRepositories"] = (container, request) =>
    listGiteaRepositories(this.#context, container, request);

  getRepository: Adapter<TVersion>["getRepository"] = (container, name, options) =>
    getGiteaRepository(this.#context, container, name, options);

  findRepository: Adapter<TVersion>["findRepository"] = (container, name, options) =>
    findGiteaRepository(this.#context, container, name, options);

  hasRepository: Adapter<TVersion>["hasRepository"] = (container, name, options) =>
    hasGiteaRepository(this.#context, container, name, options);

  createRepository: Adapter<TVersion>["createRepository"] = (container, name, options) =>
    createGiteaRepository(this.#context, container, name, options);

  renameRepository: Adapter<TVersion>["renameRepository"] = (repository, name, options) =>
    renameGiteaRepository(this.#context, repository, name, options);

  deleteRepository: Adapter<TVersion>["deleteRepository"] = (repository, options) =>
    deleteGiteaRepository(this.#context, repository, options);

  listForks: Adapter<TVersion>["listForks"] = (repository, request) =>
    listGiteaForks(this.#context, repository, request);

  createFork: Adapter<TVersion>["createFork"] = (repository, options) =>
    createGiteaFork(this.#context, repository, options);

  listBranches: Adapter<TVersion>["listBranches"] = (repository, request) =>
    listGiteaBranches(this.#context, repository, request);

  getBranch: Adapter<TVersion>["getBranch"] = (repository, name, options) =>
    getGiteaBranch(this.#context, repository, name, options);

  branchExists: Adapter<TVersion>["branchExists"] = (repository, name, options) =>
    giteaBranchExists(this.#context, repository, name, options);

  createBranch: Adapter<TVersion>["createBranch"] = (repository, input, options) =>
    createGiteaBranch(this.#context, repository, input, options);

  renameBranch: Adapter<TVersion>["renameBranch"] = (repository, branch, name, options) =>
    renameGiteaBranch(this.#context, repository, branch, name, options);

  deleteBranch: Adapter<TVersion>["deleteBranch"] = (repository, branch, options) =>
    deleteGiteaBranch(this.#context, repository, branch, options);

  getDivergence: Adapter<TVersion>["getDivergence"] = (repository, base, head, options) =>
    getGiteaBranchDivergence(this.#context, repository, base, head, options);

  listBranchDivergences: Adapter<TVersion>["listBranchDivergences"] = (repository, request) =>
    listGiteaBranchDivergences(this.#context, repository, request);

  listTags: Adapter<TVersion>["listTags"] = (repository, request) =>
    listGiteaTags(this.#context, repository, request);

  getTag: Adapter<TVersion>["getTag"] = (repository, name, options) =>
    getGiteaTag(this.#context, repository, name, options);

  createTag: Adapter<TVersion>["createTag"] = (repository, input, options) =>
    createGiteaTag(this.#context, repository, input, options);

  deleteTag: Adapter<TVersion>["deleteTag"] = (repository, tag, options) =>
    deleteGiteaTag(this.#context, repository, tag, options);

  listCommits: Adapter<TVersion>["listCommits"] = (repository, request) =>
    listGiteaCommits(this.#context, repository, request);

  getCommit: Adapter<TVersion>["getCommit"] = (repository, sha, options) =>
    getGiteaCommit(this.#context, repository, sha, options);

  getCommits: Adapter<TVersion>["getCommits"] = (repository, shas, options) =>
    getGiteaCommits(this.#context, repository, shas, options);

  compareCommits: Adapter<TVersion>["compareCommits"] = (repository, base, head, options) =>
    compareGiteaCommits(this.#context, repository, base, head, options);

  listCommitFiles: Adapter<TVersion>["listCommitFiles"] = (repository, sha, options) =>
    listGiteaCommitFiles(this.#context, repository, sha, options);

  findMergeBases: Adapter<TVersion>["findMergeBases"] = (repository, left, right, options) =>
    findGiteaMergeBases(this.#context, repository, left, right, options);

  countReachableCommits: Adapter<TVersion>["countReachableCommits"] = (
    repository,
    include,
    exclude,
    options,
  ) => countGiteaReachableCommits(this.#context, repository, include, exclude, options);

  findRefsForCommit: Adapter<TVersion>["findRefsForCommit"] = (repository, sha, request) =>
    findGiteaRefsForCommit(this.#context, repository, sha, request);

  listContributors: Adapter<TVersion>["listContributors"] = (repository, request) =>
    listGiteaContributors(this.#context, repository, request);

  readContent: Adapter<TVersion>["readContent"] = (repository, path, options) =>
    readGiteaContent(this.#context, repository, path, options);

  readFiles: Adapter<TVersion>["readFiles"] = (repository, paths, options) =>
    readGiteaFiles(this.#context, repository, paths, options);

  getDirectory: Adapter<TVersion>["getDirectory"] = (repository, path, options) =>
    getGiteaDirectory(this.#context, repository, path, options);

  listDirectory: Adapter<TVersion>["listDirectory"] = (repository, path, options) =>
    listGiteaDirectory(this.#context, repository, path, options);

  readPathMetadataBatch: Adapter<TVersion>["readPathMetadataBatch"] = (
    repository,
    paths,
    options,
  ) => readGiteaPathMetadataBatch(this.#context, repository, paths, options);

  readSymlink: Adapter<TVersion>["readSymlink"] = (repository, path, options) =>
    readGiteaSymlink(this.#context, repository, path, options);

  readSubmodule: Adapter<TVersion>["readSubmodule"] = (repository, path, options) =>
    readGiteaSubmodule(this.#context, repository, path, options);

  commitFileChanges: Adapter<TVersion>["commitFileChanges"] = (repository, input, options) =>
    commitGiteaFileChanges(this.#context, repository, input, options);
  listPullRequests: Adapter<TVersion>["listPullRequests"] = (repository, request) =>
    listGiteaPullRequests(this.#context, repository, request);

  getPullRequest: Adapter<TVersion>["getPullRequest"] = (repository, number, options) =>
    getGiteaPullRequest(this.#context, repository, number, options);

  findPullRequest: Adapter<TVersion>["findPullRequest"] = (repository, input, options) =>
    findGiteaPullRequest(this.#context, repository, input, options);

  isPullRequestMerged: Adapter<TVersion>["isPullRequestMerged"] = (
    repository,
    pullRequest,
    refresh,
    options,
  ) => isGiteaPullRequestMerged(this.#context, repository, pullRequest, refresh, options);

  listPullRequestCommits: Adapter<TVersion>["listPullRequestCommits"] = (
    repository,
    pullRequest,
    request,
  ) => listGiteaPullRequestCommits(this.#context, repository, pullRequest, request);

  listPullRequestFiles: Adapter<TVersion>["listPullRequestFiles"] = (
    repository,
    pullRequest,
    request,
  ) => listGiteaPullRequestFiles(this.#context, repository, pullRequest, request);

  createPullRequest: Adapter<TVersion>["createPullRequest"] = (repository, input, options) =>
    createGiteaPullRequest(this.#context, repository, input, options);

  updatePullRequest: Adapter<TVersion>["updatePullRequest"] = (
    repository,
    pullRequest,
    input,
    options,
  ) => updateGiteaPullRequest(this.#context, repository, pullRequest, input, options);

  closePullRequest: Adapter<TVersion>["closePullRequest"] = (
    repository,
    pullRequest,
    options,
  ) => closeGiteaPullRequest(this.#context, repository, pullRequest, options);

  mergePullRequest: Adapter<TVersion>["mergePullRequest"] = (
    repository,
    pullRequest,
    options,
  ) => mergeGiteaPullRequest(this.#context, repository, pullRequest, options);

  requestPullRequestReviewers: Adapter<TVersion>["requestPullRequestReviewers"] = (
    repository,
    pullRequest,
    reviewers,
    options,
  ) =>
    requestGiteaPullRequestReviewers(
      this.#context,
      repository,
      pullRequest,
      reviewers,
      options,
    );

  approvePullRequest: Adapter<TVersion>["approvePullRequest"] = (
    repository,
    pullRequest,
    body,
    options,
  ) => approveGiteaPullRequest(this.#context, repository, pullRequest, body, options);

  publishPullRequestComment: Adapter<TVersion>["publishPullRequestComment"] = (
    repository,
    pullRequest,
    input,
    options,
  ) => publishGiteaPullRequestComment(this.#context, repository, pullRequest, input, options);

  listCommitStatuses: Adapter<TVersion>["listCommitStatuses"] = (repository, ref, request) =>
    listGiteaCommitStatuses(this.#context, repository, ref, request);

  getCommitStatus: Adapter<TVersion>["getCommitStatus"] = (repository, ref, options) =>
    getGiteaCommitStatus(this.#context, repository, ref, options);

  setCommitStatus: Adapter<TVersion>["setCommitStatus"] = (repository, ref, input, options) =>
    setGiteaCommitStatus(this.#context, repository, ref, input, options);

  getCurrentUserProfile: Adapter<TVersion>["getCurrentUserProfile"] = (options) =>
    getGiteaCurrentUserProfile(this.#context, options);

  listIssues: Adapter<TVersion>["listIssues"] = (repository, request) =>
    listGiteaIssues(this.#context, repository, request);

  getIssue: Adapter<TVersion>["getIssue"] = (repository, number, options) =>
    getGiteaIssue(this.#context, repository, number, options);

  createIssue: Adapter<TVersion>["createIssue"] = (repository, input, options) =>
    createGiteaIssue(this.#context, repository, input, options);

  updateIssue: Adapter<TVersion>["updateIssue"] = (repository, issue, input, options) =>
    updateGiteaIssue(this.#context, repository, issue, input, options);

  setIssueState: Adapter<TVersion>["setIssueState"] = (repository, issue, state, options) =>
    setGiteaIssueState(this.#context, repository, issue, state, options);

  listIssueComments: Adapter<TVersion>["listIssueComments"] = (repository, issue, request) =>
    listGiteaIssueComments(this.#context, repository, issue, request);

  getIssueComment: Adapter<TVersion>["getIssueComment"] = (repository, id, options) =>
    getGiteaIssueComment(this.#context, repository, id, options);

  createIssueComment: Adapter<TVersion>["createIssueComment"] = (
    repository,
    issue,
    input,
    options,
  ) => createGiteaIssueComment(this.#context, repository, issue, input, options);

  updateIssueComment: Adapter<TVersion>["updateIssueComment"] = (
    repository,
    comment,
    input,
    options,
  ) => updateGiteaIssueComment(this.#context, repository, comment, input, options);

  deleteIssueComment: Adapter<TVersion>["deleteIssueComment"] = (repository, comment, options) =>
    deleteGiteaIssueComment(this.#context, repository, comment, options);

  listReleases: Adapter<TVersion>["listReleases"] = (repository, request) =>
    listGiteaReleases(this.#context, repository, request);

  getRelease: Adapter<TVersion>["getRelease"] = (repository, id, options) =>
    getGiteaRelease(this.#context, repository, id, options);

  getReleaseByTag: Adapter<TVersion>["getReleaseByTag"] = (repository, tagName, options) =>
    getGiteaReleaseByTag(this.#context, repository, tagName, options);

  createRelease: Adapter<TVersion>["createRelease"] = (repository, input, options) =>
    createGiteaRelease(this.#context, repository, input, options);

  updateRelease: Adapter<TVersion>["updateRelease"] = (repository, release, input, options) =>
    updateGiteaRelease(this.#context, repository, release, input, options);

  deleteRelease: Adapter<TVersion>["deleteRelease"] = (repository, release, options) =>
    deleteGiteaRelease(this.#context, repository, release, options);

  listReleaseAssets: Adapter<TVersion>["listReleaseAssets"] = (repository, release, options) =>
    listGiteaReleaseAssets(this.#context, repository, release, options);

  getReleaseAsset: Adapter<TVersion>["getReleaseAsset"] = (repository, release, id, options) =>
    getGiteaReleaseAsset(this.#context, repository, release, id, options);

  uploadReleaseAsset: Adapter<TVersion>["uploadReleaseAsset"] = (
    repository,
    release,
    input,
    options,
  ) => uploadGiteaReleaseAsset(this.#context, repository, release, input, options);

  updateReleaseAsset: Adapter<TVersion>["updateReleaseAsset"] = (
    repository,
    release,
    asset,
    input,
    options,
  ) => updateGiteaReleaseAsset(this.#context, repository, release, asset, input, options);

  deleteReleaseAsset: Adapter<TVersion>["deleteReleaseAsset"] = (
    repository,
    release,
    asset,
    options,
  ) => deleteGiteaReleaseAsset(this.#context, repository, release, asset, options);

  listRepositoryWebhooks: Adapter<TVersion>["listRepositoryWebhooks"] = (repository, request) =>
    listGiteaRepositoryWebhooks(this.#context, repository, request);

  getRepositoryWebhook: Adapter<TVersion>["getRepositoryWebhook"] = (repository, id, options) =>
    getGiteaRepositoryWebhook(this.#context, repository, id, options);

  createRepositoryWebhook: Adapter<TVersion>["createRepositoryWebhook"] = (
    repository,
    input,
    options,
  ) => createGiteaRepositoryWebhook(this.#context, repository, input, options);

  updateRepositoryWebhook: Adapter<TVersion>["updateRepositoryWebhook"] = (
    repository,
    webhook,
    input,
    options,
  ) => updateGiteaRepositoryWebhook(this.#context, repository, webhook, input, options);

  deleteRepositoryWebhook: Adapter<TVersion>["deleteRepositoryWebhook"] = (
    repository,
    webhook,
    options,
  ) => deleteGiteaRepositoryWebhook(this.#context, repository, webhook, options);

  getCiWorkflow: Adapter<TVersion>["getCiWorkflow"] = (repository, workflowId, options) =>
    getGiteaCiWorkflow(this.#context, repository, workflowId, options);

  listCiRuns: Adapter<TVersion>["listCiRuns"] = (repository, request) =>
    listGiteaCiRuns(this.#context, repository, request);

  getCiRun: Adapter<TVersion>["getCiRun"] = (repository, runId, options) =>
    getGiteaCiRun(this.#context, repository, runId, options);

  listCiRunJobs: Adapter<TVersion>["listCiRunJobs"] = (repository, runId, request) =>
    listGiteaCiRunJobs(this.#context, repository, runId, request);

  getCiJob: Adapter<TVersion>["getCiJob"] = (repository, jobId, options) =>
    getGiteaCiJob(this.#context, repository, jobId, options);

  findCiRunArtifact: Adapter<TVersion>["findCiRunArtifact"] = (
    repository,
    runId,
    name,
    options,
  ) => findGiteaCiRunArtifact(this.#context, repository, runId, name, options);

  getCiArtifact: Adapter<TVersion>["getCiArtifact"] = (repository, artifactId, options) =>
    getGiteaCiArtifact(this.#context, repository, artifactId, options);

  listPackages: Adapter<TVersion>["listPackages"] = (owner, request) =>
    listGiteaPackages(this.#context, owner, request);

  listPackageVersions: Adapter<TVersion>["listPackageVersions"] = (coordinates, request) =>
    listGiteaPackageVersions(this.#context, coordinates, request);

  getPackageVersion: Adapter<TVersion>["getPackageVersion"] = (identity, options) =>
    getGiteaPackageVersion(this.#context, identity, options);

  findPackageVersion: Adapter<TVersion>["findPackageVersion"] = (identity, options) =>
    findGiteaPackageVersion(this.#context, identity, options);

  listPackageFiles: Adapter<TVersion>["listPackageFiles"] = (identity, options) =>
    listGiteaPackageFiles(this.#context, identity, options);

  deletePackageVersion: Adapter<TVersion>["deletePackageVersion"] = (identity, options) =>
    deleteGiteaPackageVersion(this.#context, identity, options);

  deletePackage: Adapter<TVersion>["deletePackage"] = (coordinates, options) =>
    deleteGiteaPackage(this.#context, coordinates, options);

  getBlob: Adapter<TVersion>["getBlob"] = (repository, sha, options) =>
    getGiteaBlob(this.#context, repository, sha, options);

  listPullRequestReviews: Adapter<TVersion>["listPullRequestReviews"] = (
    repository,
    pullRequest,
    request,
  ) => listGiteaPullRequestReviews(this.#context, repository, pullRequest, request);

  getPullRequestReview: Adapter<TVersion>["getPullRequestReview"] = (
    repository,
    pullRequest,
    id,
    options,
  ) => getGiteaPullRequestReview(this.#context, repository, pullRequest, id, options);

  createPullRequestReview: Adapter<TVersion>["createPullRequestReview"] = (
    repository,
    pullRequest,
    input,
    options,
  ) => createGiteaPullRequestReview(this.#context, repository, pullRequest, input, options);

  submitPullRequestReview: Adapter<TVersion>["submitPullRequestReview"] = (
    repository,
    pullRequest,
    review,
    input,
    options,
  ) => submitGiteaPullRequestReview(this.#context, repository, pullRequest, review, input, options);

  listBranchRules: Adapter<TVersion>["listBranchRules"] = (repository, options) =>
    listGiteaBranchRules(this.#context, repository, options);

  getBranchRule: Adapter<TVersion>["getBranchRule"] = (repository, name, options) =>
    getGiteaBranchRule(this.#context, repository, name, options);

  createBranchRule: Adapter<TVersion>["createBranchRule"] = (repository, input, options) =>
    createGiteaBranchRule(this.#context, repository, input, options);

  updateBranchRule: Adapter<TVersion>["updateBranchRule"] = (repository, rule, input, options) =>
    updateGiteaBranchRule(this.#context, repository, rule, input, options);

  deleteBranchRule: Adapter<TVersion>["deleteBranchRule"] = (repository, rule, options) =>
    deleteGiteaBranchRule(this.#context, repository, rule, options);

  getEffectiveBranchProtection: Adapter<TVersion>["getEffectiveBranchProtection"] = (
    repository,
    branch,
    options,
  ) => getGiteaEffectiveBranchProtection(this.#context, repository, branch, options);

  setBranchRuleOrder: Adapter<TVersion>["setBranchRuleOrder"] = (repository, options) =>
    setGiteaBranchRuleOrder(this.#context, repository, options);

  #withContext(context: GiteaAdapterContext<TVersion>): GiteaGitHostAdapter<TVersion> {
    return new GiteaGitHostAdapter(this.version, { baseUrl: context.webBaseUrl() }, context);
  }
}
