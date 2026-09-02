import { createProviderClient } from "../../../../../packages/pangit/src/generated-rest-clients/create-rest-client.ts";
import type { RestClientTypeMap } from "../../../../../packages/pangit/src/generated-rest-clients/rest-client-type-map.ts";
import type { ProviderVersion } from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import { unwrapRestResponse } from "../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { CiRunDiscoveryContractFixtures } from "../../fluent-api-contracts/optional/ci-run-discovery/ci-run-discovery-contract-fixtures.ts";
import type { PackageContractFixtures } from "../../fluent-api-contracts/optional/packages/package-contract-fixtures.ts";
import type { RepositoryWebhookContractFixtures } from "../../fluent-api-contracts/optional/repository-webhooks/repository-webhook-contract-fixtures.ts";
import type { RepositoryContractFixtures } from "../../fluent-api-contracts/repositories/repository-contract-fixtures.ts";

type GiteaVersion = ProviderVersion<"gitea">;
type GiteaClient<TVersion extends GiteaVersion> = RestClientTypeMap["gitea"][TVersion];

type Cleanup = {
  readonly name: string;
  readonly run: () => Promise<void>;
};

export type GiteaRepositoryFixture = {
  readonly owner: string;
  readonly name: string;
  readonly defaultBranch: string;
  readonly headSha: string;
};

export type GiteaOrganizationFixture = {
  readonly name: string;
};

export type GiteaUserFixture = {
  readonly username: string;
  readonly password: string;
};

export type GiteaPullRequestFixture = {
  readonly number: number;
};

export type GiteaFileChangeFixture = {
  readonly operation: "create" | "update" | "upload" | "delete" | "rename";
  readonly path: string;
  readonly content?: string | Uint8Array;
  readonly fromPath?: string;
  readonly sha?: string;
};

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Gitea fixture ${label} is missing`);
  }
  return value;
}

function uniquePrefix(): string {
  return `pge2e-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Creates and removes only contract-owned Gitea resources through direct raw-client operations.
 * It never discovers cleanup targets by listing repositories, organizations, or other collections.
 */
export class GiteaE2EFixtureDriver<TVersion extends GiteaVersion> {
  readonly #cleanups: Cleanup[] = [];
  readonly #client: GiteaClient<TVersion>;
  readonly #apiUrl: string;
  readonly #token: string;
  readonly #timeoutMs: number;
  #closed = false;

  private constructor(
    readonly version: TVersion,
    readonly currentUser: string,
    readonly prefix: string,
    client: GiteaClient<TVersion>,
    apiUrl: string,
    token: string,
    timeoutMs: number,
  ) {
    this.#client = client;
    this.#apiUrl = apiUrl;
    this.#token = token;
    this.#timeoutMs = timeoutMs;
  }

  /** Create an exact-version raw Gitea fixture driver and resolve the authenticated identity. */
  static async create<const TVersion extends GiteaVersion>(input: {
    readonly version: TVersion;
    readonly apiUrl: string;
    readonly token: string;
    readonly timeoutMs: number;
  }): Promise<GiteaE2EFixtureDriver<TVersion>> {
    const client = await createProviderClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      headers: { Authorization: `token ${input.token}` },
      throwOnError: false,
      useOperationServers: false,
      headerForwarding: "same-origin",
    });
    const currentUserPayload = unwrapRestResponse(
      await client.userGetCurrent({}, { signal: AbortSignal.timeout(input.timeoutMs) }),
    ) as { readonly login?: unknown };
    return new GiteaE2EFixtureDriver(
      input.version,
      requiredString(currentUserPayload.login, "authenticated user login"),
      uniquePrefix(),
      client,
      input.apiUrl,
      input.token,
      input.timeoutMs,
    );
  }

  /** Create only the identities used by one repository-container contract. */
  async createRepositoryFixtures(): Promise<RepositoryContractFixtures> {
    this.#requireOpen();
    const userRepository = `${this.prefix}-user`;
    const organization = `${this.prefix}-org`;
    const organizationRepository = `${this.prefix}-repo`;
    const mutationRepository = `${this.prefix}-mutation`;
    const renamedMutationRepository = `${mutationRepository}-renamed`;
    const initializedRepository = `${this.prefix}-initialized`;
    const organizationMutationRepository = `${this.prefix}-org-mutation`;

    await this.#createUserRepository(userRepository);
    await this.#createOrganization(organization);
    await this.#createOrganizationRepository(organization, organizationRepository);

    // These names are created by the fluent behavior, so known-target cleanup tolerates 404.
    this.#trackRepository(this.currentUser, mutationRepository);
    this.#trackRepository(this.currentUser, renamedMutationRepository);
    this.#trackRepository(this.currentUser, initializedRepository);
    this.#trackRepository(organization, organizationMutationRepository);

    return Object.freeze({
      user: Object.freeze({ name: this.currentUser, repository: userRepository }),
      organization: Object.freeze({ name: organization, repository: organizationRepository }),
      mutationRepository,
      initializedRepository,
      organizationMutationRepository,
    });
  }

  /** Create one initialized user repository for a capability-specific contract. */
  async createInitializedRepository(label: string): Promise<GiteaRepositoryFixture> {
    this.#requireOpen();
    const name = `${this.prefix}-${requiredString(label, "repository label")}`;
    await this.#createUserRepository(name);
    const branch = unwrapRestResponse(
      await this.#client.repoGetBranch(
        { path: { owner: this.currentUser, repo: name, branch: "main" } },
        { signal: this.#timeoutSignal() },
      ),
    ) as { readonly commit?: { readonly id?: unknown } };
    return Object.freeze({
      owner: this.currentUser,
      name,
      defaultBranch: "main",
      headSha: requiredString(branch.commit?.id, "default branch SHA"),
    });
  }

  /** Create one empty user repository; the caller may create its first commit. */
  async createEmptyRepository(
    label: string,
  ): Promise<{ readonly owner: string; readonly name: string }> {
    this.#requireOpen();
    const name = `${this.prefix}-${requiredString(label, "repository label")}`;
    unwrapRestResponse(
      await this.#client.createCurrentUserRepo({
        body: {
          mediaType: "application/json",
          value: { name, auto_init: false, default_branch: "main" },
        },
      }, { signal: this.#timeoutSignal() }),
    );
    this.#trackRepository(this.currentUser, name);
    return Object.freeze({ owner: this.currentUser, name });
  }

  /** Create one contract-owned organization and return its direct identity. */
  async createOrganization(label: string): Promise<GiteaOrganizationFixture> {
    this.#requireOpen();
    const name = `${this.prefix}-${requiredString(label, "organization label")}`;
    await this.#createOrganization(name);
    return Object.freeze({ name });
  }

  /** Create one contract-owned user for multi-identity behavior such as reviews. */
  async createUser(label: string): Promise<GiteaUserFixture> {
    this.#requireOpen();
    const username = `${this.prefix}-${requiredString(label, "user label")}`;
    const password = `Pge2e-Aa1!${crypto.randomUUID()}`;
    unwrapRestResponse(
      await this.#client.adminCreateUser({
        body: {
          mediaType: "application/json",
          value: {
            username,
            password,
            email: `${username}@example.invalid`,
            must_change_password: false,
            send_notify: false,
          },
        },
      }, { signal: this.#timeoutSignal() }),
    );
    this.#cleanups.push({
      name: `user ${username}`,
      run: async () => {
        const result = await this.#client.adminDeleteUser(
          { path: { username }, query: { purge: true } },
          { signal: this.#timeoutSignal() },
        );
        if (result.status !== 404) unwrapRestResponse(result);
      },
    });
    return Object.freeze({ username, password });
  }

  /** Grant a known fixture user direct repository access without discovery. */
  async addCollaborator(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    username: string,
    permission: "read" | "write" | "admin" = "write",
  ): Promise<void> {
    this.#requireOpen();
    unwrapRestResponse(
      await this.#client.repoAddCollaborator({
        path: {
          owner: repository.owner,
          repo: repository.name,
          collaborator: requiredString(username, "collaborator username"),
        },
        body: { mediaType: "application/json", value: { permission } },
      }, { signal: this.#timeoutSignal() }),
    );
  }

  /** Apply one raw batch fixture commit and return the exact created commit SHA. */
  async commitFiles(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    input: {
      readonly branch?: string;
      readonly newBranch?: string;
      readonly message: string;
      readonly changes: readonly GiteaFileChangeFixture[];
    },
  ): Promise<string> {
    this.#requireOpen();
    const payload = unwrapRestResponse(
      await this.#client.repoChangeFiles({
        path: { owner: repository.owner, repo: repository.name },
        body: {
          mediaType: "application/json",
          value: {
            message: requiredString(input.message, "commit message"),
            ...(input.branch === undefined ? {} : { branch: input.branch }),
            ...(input.newBranch === undefined ? {} : { new_branch: input.newBranch }),
            files: input.changes.map((change) => ({
              operation: change.operation,
              path: requiredString(change.path, "change path"),
              ...(change.fromPath === undefined ? {} : { from_path: change.fromPath }),
              ...(change.sha === undefined ? {} : { sha: change.sha }),
              ...(change.content === undefined ? {} : { content: encodeBase64(change.content) }),
            })),
          },
        },
      }, { signal: this.#timeoutSignal() }),
    ) as { readonly commit?: { readonly sha?: unknown } };
    return requiredString(payload.commit?.sha, "created commit SHA");
  }

  /** Create one raw fixture branch from a known ref and return its target SHA. */
  async createBranch(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    name: string,
    source: string,
  ): Promise<{ readonly name: string; readonly sha: string }> {
    this.#requireOpen();
    const payload = unwrapRestResponse(
      await this.#client.repoCreateBranch({
        path: { owner: repository.owner, repo: repository.name },
        body: {
          mediaType: "application/json",
          value: {
            new_branch_name: requiredString(name, "branch name"),
            old_ref_name: requiredString(source, "branch source"),
          },
        },
      }, { signal: this.#timeoutSignal() }),
    ) as { readonly name?: unknown; readonly commit?: { readonly id?: unknown } };
    return Object.freeze({
      name: requiredString(payload.name, "created branch name"),
      sha: requiredString(payload.commit?.id, "created branch SHA"),
    });
  }

  /** Create one raw annotated fixture tag. */
  async createTag(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    name: string,
    target: string,
    message = "PanGit E2E fixture tag",
  ): Promise<void> {
    this.#requireOpen();
    unwrapRestResponse(
      await this.#client.repoCreateTag({
        path: { owner: repository.owner, repo: repository.name },
        body: {
          mediaType: "application/json",
          value: {
            tag_name: requiredString(name, "tag name"),
            target: requiredString(target, "tag target"),
            message: requiredString(message, "tag message"),
          },
        },
      }, { signal: this.#timeoutSignal() }),
    );
  }

  /** Create one raw pull-request fixture from already-known refs. */
  async createPullRequest(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    input: {
      readonly title: string;
      readonly body?: string;
      readonly base: string;
      readonly head: string;
    },
  ): Promise<GiteaPullRequestFixture> {
    this.#requireOpen();
    const payload = unwrapRestResponse(
      await this.#client.repoCreatePullRequest({
        path: { owner: repository.owner, repo: repository.name },
        body: {
          mediaType: "application/json",
          value: {
            title: requiredString(input.title, "pull-request title"),
            base: requiredString(input.base, "pull-request base"),
            head: requiredString(input.head, "pull-request head"),
            ...(input.body === undefined ? {} : { body: input.body }),
          },
        },
      }, { signal: this.#timeoutSignal() }),
    ) as { readonly number?: unknown };
    const number = payload.number;
    if (!Number.isSafeInteger(number) || (number as number) <= 0) {
      throw new Error("Gitea fixture pull-request number is missing");
    }
    return Object.freeze({ number: number as number });
  }

  /** Wait on one known fixture PR until Gitea has completed mergeability calculation. */
  async waitForPullRequestMergeable(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    number: number,
  ): Promise<void> {
    this.#requireOpen();
    if (!Number.isSafeInteger(number) || number <= 0) {
      throw new TypeError("Gitea fixture pull-request number is invalid");
    }
    const deadline = Date.now() + this.#timeoutMs;
    let consecutiveReadyReads = 0;
    let readySince: number | undefined;
    while (true) {
      const payload = unwrapRestResponse(
        await this.#client.repoGetPullRequest({
          path: { owner: repository.owner, repo: repository.name, index: number },
        }, { signal: this.#timeoutSignal() }),
      ) as {
        readonly mergeable?: unknown;
        readonly merged?: unknown;
        readonly merge_base?: unknown;
        readonly head?: { readonly sha?: unknown };
      };
      const ready = payload.mergeable === true && payload.merged !== true &&
        typeof payload.merge_base === "string" && payload.merge_base.length > 0 &&
        typeof payload.head?.sha === "string" && payload.head.sha.length > 0 &&
        payload.head.sha !== payload.merge_base;
      if (ready) {
        readySince ??= Date.now();
        consecutiveReadyReads++;
      } else {
        readySince = undefined;
        consecutiveReadyReads = 0;
      }
      // Gitea reports `mergeable: true` for the non-mergeable ancestor state and
      // can expose a cached value briefly before its merge worker settles. Check
      // the exact head/base relationship and require a short stable-ready window
      // so fixture setup cannot race the real operation under test.
      if (
        consecutiveReadyReads >= 3 && readySince !== undefined && Date.now() - readySince >= 2_000
      ) return;
      if (Date.now() >= deadline) {
        throw new Error(`Gitea fixture pull request ${number} mergeability timed out`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  /** Wait until Gitea's server-side issue search can see one known pull request. */
  async waitForPullRequestSearch(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    number: number,
    query: string,
  ): Promise<void> {
    this.#requireOpen();
    await this.#waitForFixture("pull-request search indexing", async () => {
      const payload = unwrapRestResponse(
        await this.#client.issueSearchIssues({
          query: {
            type: "pulls",
            q: requiredString(query, "pull-request search query"),
            owner: repository.owner,
            state: "open",
            page: 1,
            limit: 20,
          },
        }, { signal: this.#timeoutSignal() }),
      ) as readonly {
        readonly number?: unknown;
        readonly repository?: { readonly full_name?: unknown; readonly name?: unknown };
      }[];
      return payload.some((issue) =>
          issue.number === number &&
          (issue.repository?.full_name === `${repository.owner}/${repository.name}` ||
            issue.repository?.name === repository.name)
        )
        ? true
        : undefined;
    });
  }

  /** Create one exact provider-state status as raw setup for normalization assertions. */
  async createCommitStatus(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    ref: string,
    input: {
      readonly context: string;
      readonly state: "error" | "failure" | "pending" | "skipped" | "success" | "warning";
      readonly description?: string;
      readonly targetUrl?: string;
    },
  ): Promise<void> {
    this.#requireOpen();
    unwrapRestResponse(
      await this.#client.repoCreateStatus({
        path: {
          owner: repository.owner,
          repo: repository.name,
          sha: requiredString(ref, "commit-status ref"),
        },
        body: {
          mediaType: "application/json",
          value: {
            context: requiredString(input.context, "commit-status context"),
            state: input.state,
            ...(input.description === undefined ? {} : { description: input.description }),
            ...(input.targetUrl === undefined ? {} : { target_url: input.targetUrl }),
          },
        },
      }, { signal: this.#timeoutSignal() }),
    );
  }

  /** Require one known status context before a known branch may merge. */
  async requireCommitStatusForBranch(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    branch: string,
    context: string,
  ): Promise<void> {
    this.#requireOpen();
    unwrapRestResponse(
      await this.#client.repoCreateBranchProtection({
        path: { owner: repository.owner, repo: repository.name },
        body: {
          mediaType: "application/json",
          value: {
            rule_name: requiredString(branch, "protected branch"),
            enable_status_check: true,
            status_check_contexts: [requiredString(context, "required status context")],
          },
        },
      }, { signal: this.#timeoutSignal() }),
    );
  }

  /** Resolve one raw fixture blob SHA by direct path. */
  async getFileSha(
    repository: Pick<GiteaRepositoryFixture, "owner" | "name">,
    path: string,
    ref?: string,
  ): Promise<string> {
    this.#requireOpen();
    const payload = unwrapRestResponse(
      await this.#client.repoGetContents(
        {
          path: {
            owner: repository.owner,
            repo: repository.name,
            filepath: requiredString(path, "content path"),
          },
          ...(ref === undefined ? {} : { query: { ref } }),
        },
        { signal: this.#timeoutSignal() },
      ),
    ) as { readonly sha?: unknown };
    return requiredString(payload.sha, "content blob SHA");
  }

  /** Create one known raw fork and wait only on its direct destination identity. */
  async createFork(
    source: Pick<GiteaRepositoryFixture, "owner" | "name">,
    destinationOrganization: string,
    name: string,
  ): Promise<void> {
    this.#requireOpen();
    const organization = requiredString(destinationOrganization, "fork organization");
    const forkName = requiredString(name, "fork name");
    unwrapRestResponse(
      await this.#client.createFork({
        path: { owner: source.owner, repo: source.name },
        body: {
          mediaType: "application/json",
          value: { organization, name: forkName },
        },
      }, { signal: this.#timeoutSignal() }),
    );
    this.#trackRepository(organization, forkName);
    const deadline = Date.now() + this.#timeoutMs;
    while (true) {
      const result = await this.#client.repoGet(
        { path: { owner: organization, repo: forkName } },
        { signal: this.#timeoutSignal() },
      );
      if (result.ok) return;
      if (result.status !== 404) unwrapRestResponse(result);
      if (Date.now() >= deadline) {
        throw new Error(`Gitea fixture fork ${organization}/${forkName} timed out`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /** Create a keyed journal receiver that never reads deliveries belonging to another contract. */
  createWebhookReceiver(label: string): RepositoryWebhookContractFixtures["receiver"] {
    this.#requireOpen();
    const key = `${this.prefix}-${requiredString(label, "webhook receiver label")}`;
    const journalUrl = new URL("http://webhook-journal:8080/events");
    journalUrl.searchParams.set("key", key);
    const targetUrl = new URL(
      `/hooks/${encodeURIComponent(key)}`,
      "http://webhook-journal:8080",
    ).href;
    const clear = async () => {
      const response = await fetch(journalUrl, {
        method: "DELETE",
        signal: this.#timeoutSignal(),
      });
      if (response.status !== 204) {
        throw new Error(`Webhook journal cleanup failed with HTTP ${response.status}`);
      }
    };
    this.#cleanups.push({ name: `webhook journal ${key}`, run: clear });
    return Object.freeze({
      targetUrl,
      clear,
      waitForEvent: async (event: string, timeoutMs: number) => {
        const expectedEvent = requiredString(event, "webhook event");
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
          throw new TypeError("Webhook wait timeout must be a positive safe integer");
        }
        const eventUrl = new URL(journalUrl);
        eventUrl.searchParams.set("event", expectedEvent);
        const deadline = Date.now() + timeoutMs;
        while (true) {
          const remaining = deadline - Date.now();
          if (remaining <= 0) {
            throw new Error(`Webhook journal timed out waiting for ${expectedEvent}`);
          }
          const response = await fetch(eventUrl, {
            signal: AbortSignal.timeout(Math.min(this.#timeoutMs, remaining)),
          });
          if (!response.ok) {
            throw new Error(`Webhook journal read failed with HTTP ${response.status}`);
          }
          const payload = await response.json() as { readonly events?: unknown };
          if (!Array.isArray(payload.events)) {
            throw new Error("Webhook journal returned malformed events");
          }
          const found = payload.events.find((value): value is { event: string; body: unknown } =>
            value !== null && typeof value === "object" &&
            (value as { event?: unknown }).event === expectedEvent && "body" in value
          );
          if (found !== undefined) return Object.freeze({ event: found.event, body: found.body });
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      },
    });
  }

  /** Create one successful workflow and resolve only its known run, job, and artifact identities. */
  async createCiRunDiscoveryFixtures(): Promise<CiRunDiscoveryContractFixtures> {
    this.#requireOpen();
    const repository = await this.createInitializedRepository("ci-run-discovery");
    const workflowId = "optional-ci.yaml";
    const workflowPath = `.gitea/workflows/${workflowId}`;
    const workflowSource = [
      "name: PanGit optional CI",
      "on:",
      "  push:",
      "jobs:",
      "  artifact:",
      "    runs-on: sandbox",
      "    steps:",
      "      - run: bash /fixtures/upload-artifact.sh",
      "",
    ].join("\n");
    const sha = await this.commitFiles(repository, {
      branch: repository.defaultBranch,
      message: "add optional CI fixture",
      changes: [{ operation: "create", path: workflowPath, content: workflowSource }],
    });
    const path = { owner: repository.owner, repo: repository.name };

    const workflow = await this.#waitForFixture("workflow registration", async () => {
      const response = await this.#client.actionsGetWorkflow(
        { path: { ...path, workflow_id: workflowId } },
        { signal: this.#timeoutSignal() },
      );
      if (response.status === 404) return undefined;
      const payload = unwrapRestResponse(response) as {
        readonly id?: unknown;
        readonly path?: unknown;
      };
      const returnedPath = requiredString(payload.path, "workflow path");
      if (returnedPath !== workflowId && returnedPath !== workflowPath) {
        throw new Error(`Gitea fixture returned unexpected workflow path ${returnedPath}`);
      }
      return {
        id: requiredString(payload.id, "workflow id"),
        path: workflowPath,
      };
    });

    const run = await this.#waitForFixture("successful workflow run", async () => {
      const payload = unwrapRestResponse(
        await this.#client.getWorkflowRuns(
          {
            path,
            query: {
              page: 1,
              limit: 2,
              branch: repository.defaultBranch,
              event: "push",
              head_sha: sha,
            },
          },
          { signal: this.#timeoutSignal() },
        ),
      ) as { readonly workflow_runs?: unknown };
      if (!Array.isArray(payload.workflow_runs)) {
        throw new Error("Gitea fixture returned malformed workflow runs");
      }
      const candidate = payload.workflow_runs.find((value) =>
        value !== null && typeof value === "object" &&
        (value as { head_sha?: unknown }).head_sha === sha
      ) as Record<string, unknown> | undefined;
      if (candidate === undefined) return undefined;
      const status = typeof candidate.status === "string" ? candidate.status : undefined;
      const conclusion = typeof candidate.conclusion === "string"
        ? candidate.conclusion
        : undefined;
      if (
        [status, conclusion].some((value) =>
          value === "failure" || value === "cancelled" || value === "canceled"
        )
      ) {
        throw new Error(`Gitea fixture workflow failed with ${conclusion ?? status}`);
      }
      if (status !== "success" && conclusion !== "success") return undefined;
      return {
        id: positiveIdString(candidate.id, "workflow run id"),
        branch: requiredString(candidate.head_branch, "workflow run branch"),
        sha: requiredString(candidate.head_sha, "workflow run SHA"),
      };
    });

    const job = await this.#waitForFixture("successful workflow job", async () => {
      const payload = unwrapRestResponse(
        await this.#client.listWorkflowRunJobs(
          { path: { ...path, run: BigInt(run.id) }, query: { page: 1, limit: 2 } },
          { signal: this.#timeoutSignal() },
        ),
      ) as { readonly jobs?: unknown };
      if (!Array.isArray(payload.jobs)) throw new Error("Gitea fixture returned malformed jobs");
      const candidate = payload.jobs[0] as Record<string, unknown> | undefined;
      if (candidate === undefined) return undefined;
      const status = typeof candidate.status === "string" ? candidate.status : undefined;
      const conclusion = typeof candidate.conclusion === "string"
        ? candidate.conclusion
        : undefined;
      if (
        [status, conclusion].some((value) =>
          value === "failure" || value === "cancelled" || value === "canceled"
        )
      ) {
        throw new Error(`Gitea fixture job failed with ${conclusion ?? status}`);
      }
      if (status !== "success" && conclusion !== "success") return undefined;
      return { id: positiveIdString(candidate.id, "workflow job id") };
    });

    const artifact = await this.#waitForFixture("workflow artifact", async () => {
      const payload = unwrapRestResponse(
        await this.#client.getArtifactsOfRun(
          {
            path: { ...path, run: BigInt(run.id) },
            query: { name: "e2e-artifact" },
          },
          { signal: this.#timeoutSignal() },
        ),
      ) as { readonly artifacts?: unknown };
      if (!Array.isArray(payload.artifacts)) {
        throw new Error("Gitea fixture returned malformed artifacts");
      }
      const candidate = payload.artifacts.find((value) =>
        value !== null && typeof value === "object" &&
        (value as { name?: unknown }).name === "e2e-artifact"
      ) as Record<string, unknown> | undefined;
      if (candidate === undefined) return undefined;
      return {
        id: positiveIdString(candidate.id, "workflow artifact id"),
        name: requiredString(candidate.name, "workflow artifact name"),
      };
    });

    return Object.freeze({
      repository: Object.freeze({ owner: repository.owner, name: repository.name }),
      workflow: Object.freeze(workflow),
      run: Object.freeze({ ...run, status: "completed", conclusion: "success" }),
      job: Object.freeze({ ...job, status: "completed", conclusion: "success" }),
      artifact: Object.freeze(artifact),
      missingArtifactName: `${this.prefix}-missing-artifact`,
    });
  }

  /** Upload two versions through Gitea's generic protocol and track their exact package identity. */
  async createPackageFixtures(): Promise<PackageContractFixtures> {
    this.#requireOpen();
    const coordinates = Object.freeze({
      owner: this.currentUser,
      type: "generic",
      name: `${this.prefix}-package`,
    });
    const readVersion = "1.0.0";
    const deleteVersion = "2.0.0";
    const file = "fixture.txt";
    const bytes = new TextEncoder().encode("PanGit optional package fixture\n");
    this.#trackPackage(coordinates);
    await this.#uploadGenericPackage(coordinates, readVersion, file, bytes);
    await this.#uploadGenericPackage(coordinates, deleteVersion, file, bytes);
    return Object.freeze({
      coordinates,
      readVersion,
      deleteVersion,
      missingVersion: "999.0.0-missing",
      file: Object.freeze({ name: file, size: bytes.byteLength }),
    });
  }

  /** Register a known identity that a fluent contract may create before it can return an entity. */
  trackKnownRepository(owner: string, name: string): void {
    this.#requireOpen();
    this.#trackRepository(
      requiredString(owner, "tracked repository owner"),
      requiredString(name, "tracked repository name"),
    );
  }

  /** Remove every known fixture target in reverse dependency order. */
  async cleanup(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    const errors: string[] = [];
    for (const cleanup of this.#cleanups.toReversed()) {
      try {
        await cleanup.run();
      } catch (error) {
        errors.push(`${cleanup.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.#cleanups.length = 0;
    if (errors.length > 0) throw new Error(`Gitea fixture cleanup failed: ${errors.join("; ")}`);
  }

  async #createUserRepository(name: string): Promise<void> {
    unwrapRestResponse(
      await this.#client.createCurrentUserRepo({
        body: {
          mediaType: "application/json",
          value: { name, auto_init: true, default_branch: "main" },
        },
      }, { signal: this.#timeoutSignal() }),
    );
    this.#trackRepository(this.currentUser, name);
  }

  async #createOrganization(name: string): Promise<void> {
    unwrapRestResponse(
      await this.#client.orgCreate({
        body: {
          mediaType: "application/json",
          value: { username: name, full_name: `PanGit E2E ${this.prefix}` },
        },
      }, { signal: this.#timeoutSignal() }),
    );
    this.#cleanups.push({
      name: `organization ${name}`,
      run: async () => {
        const result = await this.#client.orgDelete(
          { path: { org: name } },
          { signal: this.#timeoutSignal() },
        );
        if (result.status !== 404) unwrapRestResponse(result);
      },
    });
  }

  async #createOrganizationRepository(organization: string, name: string): Promise<void> {
    unwrapRestResponse(
      await this.#client.createOrgRepo({
        path: { org: organization },
        body: {
          mediaType: "application/json",
          value: { name, auto_init: true, default_branch: "main" },
        },
      }, { signal: this.#timeoutSignal() }),
    );
    this.#trackRepository(organization, name);
  }

  async #uploadGenericPackage(
    coordinates: { readonly owner: string; readonly type: "generic"; readonly name: string },
    version: string,
    filename: string,
    bytes: Uint8Array,
  ): Promise<void> {
    const url = this.#packageEndpoint(
      "packages",
      coordinates.owner,
      coordinates.type,
      coordinates.name,
      version,
      filename,
    );
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${this.#token}`,
        "Content-Type": "application/octet-stream",
      },
      body: bytes.slice().buffer as ArrayBuffer,
      signal: this.#timeoutSignal(),
    });
    if (!response.ok) {
      throw new Error(`Gitea package fixture upload failed with HTTP ${response.status}`);
    }
  }

  #trackPackage(coordinates: {
    readonly owner: string;
    readonly type: "generic";
    readonly name: string;
  }): void {
    this.#cleanups.push({
      name: `package ${coordinates.owner}/${coordinates.type}/${coordinates.name}`,
      run: async () => {
        const response = await this.#client.deletePackage(
          { path: coordinates },
          { signal: this.#timeoutSignal() },
        );
        if (response.status !== 404) unwrapRestResponse(response);
      },
    });
  }

  async #waitForFixture<TValue>(
    label: string,
    read: () => Promise<TValue | undefined>,
  ): Promise<TValue> {
    const deadline = Date.now() + this.#timeoutMs;
    while (true) {
      const value = await read();
      if (value !== undefined) return value;
      if (Date.now() >= deadline) throw new Error(`Gitea fixture ${label} timed out`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  #packageEndpoint(...segments: readonly string[]): URL {
    const url = new URL(this.#apiUrl);
    const apiPath = url.pathname.replace(/\/+$/, "");
    if (!apiPath.endsWith("/api/v1")) {
      throw new Error(`Gitea API base URL must end in /api/v1: ${url.origin}${apiPath}`);
    }
    url.pathname = `${apiPath.slice(0, -3)}/${segments.map(encodeURIComponent).join("/")}`;
    url.search = "";
    url.hash = "";
    return url;
  }

  #trackRepository(owner: string, repository: string): void {
    this.#cleanups.push({
      name: `repository ${owner}/${repository}`,
      run: async () => {
        const result = await this.#client.repoDelete(
          { path: { owner, repo: repository } },
          { signal: this.#timeoutSignal() },
        );
        if (result.status !== 404) unwrapRestResponse(result);
      },
    });
  }

  #timeoutSignal(): AbortSignal {
    return AbortSignal.timeout(this.#timeoutMs);
  }

  #requireOpen(): void {
    if (this.#closed) throw new Error("Gitea fixture driver is already closed");
  }
}

function encodeBase64(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function positiveIdString(value: unknown, label: string): string {
  if (
    (typeof value !== "number" && typeof value !== "bigint") || value <= 0 ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw new Error(`Gitea fixture ${label} is missing`);
  }
  return String(value);
}
