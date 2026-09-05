import { ForgejoFixtureResources } from "./fixtures/ForgejoFixtureResources.ts";
import { createProviderClient } from "../../../../../packages/pangit/src/generated-rest-clients/create-rest-client.ts";
import { unwrapRestResponse } from "../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { PackageContractFixtures } from "../../fluent-api-contracts/optional/packages/package-contract-fixtures.ts";
import type { RepositoryWebhookContractFixtures } from "../../fluent-api-contracts/optional/repository-webhooks/repository-webhook-contract-fixtures.ts";
import type { RepositoryContractFixtures } from "../../fluent-api-contracts/repositories/repository-contract-fixtures.ts";
import type {
  ForgejoCiFixtures,
  ForgejoClient,
  ForgejoFileChangeFixture,
  ForgejoOrganizationFixture,
  ForgejoPullRequestFixture,
  ForgejoRepositoryFixture,
  ForgejoUserFixture,
  ForgejoVersion,
} from "./fixtures/types.ts";
import { encodeBase64, requiredString, uniquePrefix } from "./fixtures/values.ts";
import {
  createCiRunDiscoveryFixtures,
  createFork,
  createWebhookReceiver,
  waitForPullRequestMergeable,
  waitForPullRequestSearch,
} from "./fixtures/mod.ts";
export type {
  ForgejoCiFixtures,
  ForgejoFileChangeFixture,
  ForgejoOrganizationFixture,
  ForgejoPullRequestFixture,
  ForgejoRepositoryFixture,
  ForgejoUserFixture,
} from "./fixtures/types.ts";
/**
 * Creates and removes only contract-owned Forgejo resources through direct raw-client operations.
 * It never discovers cleanup targets by listing repositories, organizations, or other collections.
 */
export class ForgejoE2EFixtureDriver<TVersion extends ForgejoVersion> {
  readonly #resources: ForgejoFixtureResources<TVersion>;
  readonly #client: ForgejoClient<TVersion>;
  readonly #timeoutMs: number;

  private constructor(
    readonly version: TVersion,
    readonly currentUser: string,
    readonly prefix: string,
    client: ForgejoClient<TVersion>,
    apiUrl: string,
    token: string,
    timeoutMs: number,
  ) {
    this.#client = client;
    this.#resources = new ForgejoFixtureResources(client, apiUrl, token, timeoutMs, currentUser);
    this.#timeoutMs = timeoutMs;
  }

  /** Create an exact-version raw Forgejo fixture driver and resolve the authenticated identity. */
  static async create<const TVersion extends ForgejoVersion>(input: {
    readonly version: TVersion;
    readonly apiUrl: string;
    readonly token: string;
    readonly timeoutMs: number;
  }): Promise<ForgejoE2EFixtureDriver<TVersion>> {
    const client = await createProviderClient("forgejo", input.version, {
      baseUrl: input.apiUrl,
      headers: { Authorization: `token ${input.token}` },
      throwOnError: false,
      useOperationServers: false,
      headerForwarding: "same-origin",
    });
    const currentUserPayload = unwrapRestResponse(
      await client.userGetCurrent({}, { signal: AbortSignal.timeout(input.timeoutMs) }),
    ) as { readonly login?: unknown };
    return new ForgejoE2EFixtureDriver(
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
    this.#resources.requireOpen();
    const userRepository = `${this.prefix}-user`;
    const organization = `${this.prefix}-org`;
    const organizationRepository = `${this.prefix}-repo`;
    const mutationRepository = `${this.prefix}-mutation`;
    const renamedMutationRepository = `${mutationRepository}-renamed`;
    const initializedRepository = `${this.prefix}-initialized`;
    const organizationMutationRepository = `${this.prefix}-org-mutation`;

    await this.#resources.createUserRepository(userRepository);
    await this.#resources.createOrganization(organization);
    await this.#resources.createOrganizationRepository(organization, organizationRepository);

    // These names are created by the fluent behavior, so known-target cleanup tolerates 404.
    this.#resources.trackRepository(this.currentUser, mutationRepository);
    this.#resources.trackRepository(this.currentUser, renamedMutationRepository);
    this.#resources.trackRepository(this.currentUser, initializedRepository);
    this.#resources.trackRepository(organization, organizationMutationRepository);

    return Object.freeze({
      user: Object.freeze({ name: this.currentUser, repository: userRepository }),
      organization: Object.freeze({ name: organization, repository: organizationRepository }),
      mutationRepository,
      initializedRepository,
      organizationMutationRepository,
    });
  }

  /** Create one initialized user repository for a capability-specific contract. */
  async createInitializedRepository(label: string): Promise<ForgejoRepositoryFixture> {
    this.#resources.requireOpen();
    const name = `${this.prefix}-${requiredString(label, "repository label")}`;
    await this.#resources.createUserRepository(name);
    const branch = unwrapRestResponse(
      await this.#client.repoGetBranch(
        { path: { owner: this.currentUser, repo: name, branch: "main" } },
        { signal: this.#resources.timeoutSignal() },
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
    this.#resources.requireOpen();
    const name = `${this.prefix}-${requiredString(label, "repository label")}`;
    unwrapRestResponse(
      await this.#client.createCurrentUserRepo({
        body: {
          mediaType: "application/json",
          value: { name, auto_init: false, default_branch: "main" },
        },
      }, { signal: this.#resources.timeoutSignal() }),
    );
    this.#resources.trackRepository(this.currentUser, name);
    return Object.freeze({ owner: this.currentUser, name });
  }

  /** Create one contract-owned organization and return its direct identity. */
  async createOrganization(label: string): Promise<ForgejoOrganizationFixture> {
    this.#resources.requireOpen();
    const name = `${this.prefix}-${requiredString(label, "organization label")}`;
    await this.#resources.createOrganization(name);
    return Object.freeze({ name });
  }

  /** Create one contract-owned user for multi-identity behavior such as reviews. */
  async createUser(label: string): Promise<ForgejoUserFixture> {
    this.#resources.requireOpen();
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
      }, { signal: this.#resources.timeoutSignal() }),
    );
    this.#resources.trackCleanup({
      name: `user ${username}`,
      run: async () => {
        const result = await this.#client.adminDeleteUser(
          { path: { username }, query: { purge: true } },
          { signal: this.#resources.timeoutSignal() },
        );
        if (result.status !== 404) unwrapRestResponse(result);
      },
    });
    return Object.freeze({ username, password });
  }

  /** Grant a known fixture user direct repository access without discovery. */
  async addCollaborator(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    username: string,
    permission: "read" | "write" | "admin" = "write",
  ): Promise<void> {
    this.#resources.requireOpen();
    unwrapRestResponse(
      await this.#client.repoAddCollaborator({
        path: {
          owner: repository.owner,
          repo: repository.name,
          collaborator: requiredString(username, "collaborator username"),
        },
        body: { mediaType: "application/json", value: { permission } },
      }, { signal: this.#resources.timeoutSignal() }),
    );
  }

  /** Apply one raw batch fixture commit and return the exact created commit SHA. */
  async commitFiles(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    input: {
      readonly branch?: string;
      readonly newBranch?: string;
      readonly message: string;
      readonly changes: readonly ForgejoFileChangeFixture[];
    },
  ): Promise<string> {
    this.#resources.requireOpen();
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
      }, { signal: this.#resources.timeoutSignal() }),
    ) as { readonly commit?: { readonly sha?: unknown } };
    return requiredString(payload.commit?.sha, "created commit SHA");
  }

  /** Create one raw fixture branch from a known ref and return its target SHA. */
  async createBranch(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    name: string,
    source: string,
  ): Promise<{ readonly name: string; readonly sha: string }> {
    this.#resources.requireOpen();
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
      }, { signal: this.#resources.timeoutSignal() }),
    ) as { readonly name?: unknown; readonly commit?: { readonly id?: unknown } };
    return Object.freeze({
      name: requiredString(payload.name, "created branch name"),
      sha: requiredString(payload.commit?.id, "created branch SHA"),
    });
  }

  /** Create one raw annotated fixture tag. */
  async createTag(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    name: string,
    target: string,
    message = "PanGit E2E fixture tag",
  ): Promise<void> {
    this.#resources.requireOpen();
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
      }, { signal: this.#resources.timeoutSignal() }),
    );
  }

  /** Create one raw pull-request fixture from already-known refs. */
  async createPullRequest(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    input: {
      readonly title: string;
      readonly body?: string;
      readonly base: string;
      readonly head: string;
    },
  ): Promise<ForgejoPullRequestFixture> {
    this.#resources.requireOpen();
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
      }, { signal: this.#resources.timeoutSignal() }),
    ) as { readonly number?: unknown };
    const number = payload.number;
    if (!Number.isSafeInteger(number) || (number as number) <= 0) {
      throw new Error("Forgejo fixture pull-request number is missing");
    }
    return Object.freeze({ number: number as number });
  }

  /** Wait on one known fixture PR until Forgejo has completed mergeability calculation. */
  async waitForPullRequestMergeable(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    number: number,
  ): Promise<void> {
    this.#resources.requireOpen();
    return await waitForPullRequestMergeable(this.#client, this.#timeoutMs, repository, number);
  }

  /** Wait until Forgejo's server-side issue search can see one known pull request. */
  async waitForPullRequestSearch(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    number: number,
    query: string,
  ): Promise<void> {
    this.#resources.requireOpen();
    return await waitForPullRequestSearch(this.#client, this.#timeoutMs, repository, number, query);
  }

  /** Create one exact provider-state status as raw setup for normalization assertions. */
  async createCommitStatus(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    ref: string,
    input: {
      readonly context: string;
      readonly state: "error" | "failure" | "pending" | "skipped" | "success" | "warning";
      readonly description?: string;
      readonly targetUrl?: string;
    },
  ): Promise<void> {
    this.#resources.requireOpen();
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
      }, { signal: this.#resources.timeoutSignal() }),
    );
  }

  /** Require one known status context before a known branch may merge. */
  async requireCommitStatusForBranch(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    branch: string,
    context: string,
  ): Promise<void> {
    this.#resources.requireOpen();
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
      }, { signal: this.#resources.timeoutSignal() }),
    );
  }

  /** Resolve one raw fixture blob SHA by direct path. */
  async getFileSha(
    repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    path: string,
    ref?: string,
  ): Promise<string> {
    this.#resources.requireOpen();
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
        { signal: this.#resources.timeoutSignal() },
      ),
    ) as { readonly sha?: unknown };
    return requiredString(payload.sha, "content blob SHA");
  }

  /** Create one known raw fork and wait only on its direct destination identity. */
  async createFork(
    source: Pick<ForgejoRepositoryFixture, "owner" | "name">,
    destinationOrganization: string,
    name: string,
  ): Promise<void> {
    this.#resources.requireOpen();
    return await createFork(
      this.#client,
      this.#timeoutMs,
      (owner, name) => this.#resources.trackRepository(owner, name),
      source,
      destinationOrganization,
      name,
    );
  }

  /** Create a keyed journal receiver that never reads deliveries belonging to another contract. */
  createWebhookReceiver(label: string): RepositoryWebhookContractFixtures["receiver"] {
    this.#resources.requireOpen();
    return createWebhookReceiver(
      this.prefix,
      this.#timeoutMs,
      (cleanup) => this.#resources.trackCleanup(cleanup),
      label,
    );
  }

  /** Create one successful workflow and resolve only its known run, job, and artifact identities. */
  async createCiRunDiscoveryFixtures(): Promise<ForgejoCiFixtures> {
    this.#resources.requireOpen();
    return await createCiRunDiscoveryFixtures(this, this.#client, this.#timeoutMs);
  }

  /** Upload two versions through Forgejo's generic protocol and track their exact package identity. */
  async createPackageFixtures(): Promise<PackageContractFixtures> {
    this.#resources.requireOpen();
    const coordinates = Object.freeze({
      owner: this.currentUser,
      type: "generic",
      name: `${this.prefix}-package`,
    });
    const readVersion = "1.0.0";
    const deleteVersion = "2.0.0";
    const file = "fixture.txt";
    const bytes = new TextEncoder().encode("PanGit optional package fixture\n");
    this.#resources.trackPackage(coordinates, [readVersion, deleteVersion]);
    await this.#resources.uploadGenericPackage(coordinates, readVersion, file, bytes);
    await this.#resources.uploadGenericPackage(coordinates, deleteVersion, file, bytes);
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
    this.#resources.requireOpen();
    this.#resources.trackRepository(
      requiredString(owner, "tracked repository owner"),
      requiredString(name, "tracked repository name"),
    );
  }

  /** Remove every known fixture target in reverse dependency order. */

  cleanup(): Promise<void> {
    return this.#resources.cleanup();
  }
}
