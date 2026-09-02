import type { RestClientTypeMap } from "../../generated-rest-clients/rest-client-type-map.ts";
import type { ClientOptions } from "../../generated-rest-clients/client-options.ts";
import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import { createProviderClient } from "../../generated-rest-clients/create-rest-client.ts";
import type { AnyRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import { unwrapRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import type {
  CreateRepositoryOptions,
  RepositoryContainerData,
  RepositoryData,
  RepositoryHostAdapter,
} from "../../fluent-api/host-adapter-contract/RepositoryHostAdapter.ts";
import type {
  GiteaOrganizationPayload,
  GiteaRepositoryContainerNative,
  GiteaRepositoryContainerNativeContext,
  GiteaUserPayload,
} from "./GiteaRepositoryContainerNative.ts";
import type {
  GiteaRepositoryNative,
  GiteaRepositoryNativeContext,
  GiteaRepositoryPayload,
} from "./GiteaRepositoryNative.ts";

type GiteaVersion = ProviderVersion<"gitea">;
type GiteaClient<TVersion extends GiteaVersion> = RestClientTypeMap["gitea"][TVersion];
type AnyGiteaOrganization = GiteaOrganizationPayload<GiteaVersion>;
type AnyGiteaRepository = GiteaRepositoryPayload<GiteaVersion>;
type AnyGiteaUser = GiteaUserPayload<GiteaVersion>;

/** Maximum page size used while producing complete repository collections. */
const pageSize = 50;

/** Gitea implementation of the universal repository-container adapter contract. */
export class GiteaRepositoryHostAdapter<TVersion extends GiteaVersion>
  implements RepositoryHostAdapter<"gitea", TVersion> {
  /** Transport configuration retained across authorization. */
  readonly #options: ClientOptions;
  /** Authenticated user retained for private repository access and user-owned creation. */
  readonly #currentUser?: AnyGiteaUser;
  /** Lazily-created exact generated client for the selected Gitea version. */
  #clientPromise?: Promise<GiteaClient<TVersion>>;

  /** Create a lazy Gitea adapter for one generated API version. */
  constructor(
    readonly version: TVersion,
    options: ClientOptions,
    client?: GiteaClient<TVersion>,
    currentUser?: AnyGiteaUser,
  ) {
    this.#options = Object.freeze({ ...options, throwOnError: false });
    this.#currentUser = currentUser;
    if (client !== undefined) this.#clientPromise = Promise.resolve(client);
  }

  /** Create and verify a new Gitea adapter carrying token credentials. */
  async authorizeToken(
    token: string,
    tokenType = "token",
    signal?: AbortSignal,
  ): Promise<GiteaRepositoryHostAdapter<TVersion>> {
    const client = await createProviderClient("gitea", this.version, {
      ...this.#options,
      headers: { Authorization: `${tokenType} ${token}` },
      throwOnError: false,
    });
    const currentUser = unwrapRestResponse(
      await client.userGetCurrent({}, signal === undefined ? {} : { signal }),
    ) as AnyGiteaUser;
    return new GiteaRepositoryHostAdapter(
      this.version,
      this.#options,
      client,
      currentUser,
    );
  }

  /** List the current user and organizations available as repository containers. */
  async containers(): Promise<readonly RepositoryContainerData<"gitea", TVersion>[]> {
    if (this.#currentUser === undefined) return [];

    const client = await this.#client();
    const organizations = await this.#currentUserOrganizations(client);
    return [
      this.#userContainerData(client, this.#currentUser),
      ...uniqueBy(organizations, organizationKey).map((organization) =>
        this.#organizationContainerData(client, organization)
      ),
    ];
  }

  /** Resolve a named Gitea organization or user as one repository-owning container. */
  async container(name: string): Promise<RepositoryContainerData<"gitea", TVersion>> {
    const client = await this.#client();
    if (this.#currentUser !== undefined && userName(this.#currentUser) === name) {
      return this.#userContainerData(client, this.#currentUser);
    }

    const organizationResult = await client.orgGet({ path: { org: name } });
    if (!isNotFound(organizationResult)) {
      const organization = unwrapRestResponse(organizationResult);
      return this.#organizationContainerData(client, organization as AnyGiteaOrganization);
    }

    const user = unwrapRestResponse(await client.userGet({ path: { username: name } }));
    return this.#userContainerData(client, user as AnyGiteaUser);
  }

  /** List repositories owned by one resolved Gitea user or organization. */
  async containerRepositories(
    container: RepositoryContainerData<"gitea", TVersion>,
  ): Promise<readonly RepositoryData<"gitea", TVersion>[]> {
    const client = await this.#client();
    return (await this.#containerRepositoryPayloads(client, container)).map((repository) =>
      this.#repositoryData(client, repository)
    );
  }

  /** Fetch one repository owned by one resolved Gitea container. */
  async containerRepository(
    container: RepositoryContainerData<"gitea", TVersion>,
    name: string,
  ): Promise<RepositoryData<"gitea", TVersion>> {
    const client = await this.#client();
    const repository = unwrapRestResponse(
      await client.repoGet({ path: { owner: container.name, repo: name } }),
    );
    return this.#repositoryData(client, repository as AnyGiteaRepository);
  }

  /** Fetch one repository when present without converting a confirmed 404 into an error. */
  async findContainerRepository(
    container: RepositoryContainerData<"gitea", TVersion>,
    name: string,
  ): Promise<RepositoryData<"gitea", TVersion> | undefined> {
    const client = await this.#client();
    const result = await client.repoGet({ path: { owner: container.name, repo: name } });
    if (isNotFound(result)) return undefined;
    const repository = unwrapRestResponse(result);
    return this.#repositoryData(client, repository as AnyGiteaRepository);
  }

  /** Create one repository owned by one resolved Gitea user or organization. */
  async createContainerRepository(
    container: RepositoryContainerData<"gitea", TVersion>,
    name: string,
    options: CreateRepositoryOptions,
  ): Promise<RepositoryData<"gitea", TVersion>> {
    const client = await this.#client();
    const body = {
      mediaType: "application/json" as const,
      value: {
        name,
        ...(options.description === undefined ? {} : { description: options.description }),
        ...(options.private === undefined ? {} : { private: options.private }),
        ...(options.initialize === undefined ? {} : { auto_init: options.initialize }),
        ...(options.defaultBranch === undefined ? {} : { default_branch: options.defaultBranch }),
      },
    };

    let repository: AnyGiteaRepository;
    if (container.kind === "organization") {
      repository = unwrapRestResponse(
        await client.createOrgRepo({ path: { org: container.name }, body }),
      ) as AnyGiteaRepository;
    } else if (container.kind === "user") {
      if (this.#currentUserName() !== container.name) {
        throw new TypeError(
          `cannot create a repository for Gitea user ${container.name}; authorize as that user`,
        );
      }
      repository = unwrapRestResponse(
        await client.createCurrentUserRepo({ body }),
      ) as AnyGiteaRepository;
    } else {
      throw new TypeError(`unsupported Gitea container kind ${container.kind}`);
    }
    return this.#repositoryData(client, repository as AnyGiteaRepository);
  }

  /** Rename one Gitea repository and return its refreshed entity data. */
  async renameRepository(
    repository: RepositoryData<"gitea", TVersion>,
    name: string,
  ): Promise<RepositoryData<"gitea", TVersion>> {
    const client = await this.#client();
    const renamed = unwrapRestResponse(
      await client.repoEdit({
        path: { owner: repository.owner, repo: repository.name },
        body: { mediaType: "application/json", value: { name } },
      }),
    );
    return this.#repositoryData(client, renamed as AnyGiteaRepository);
  }

  /** Permanently delete one Gitea repository. */
  async deleteRepository(repository: RepositoryData<"gitea", TVersion>): Promise<void> {
    const client = await this.#client();
    unwrapRestResponse(
      await client.repoDelete({ path: { owner: repository.owner, repo: repository.name } }),
    );
  }

  /** Create the generated Gitea client once, only after the adapter is used. */
  async #client(): Promise<GiteaClient<TVersion>> {
    this.#clientPromise ??= createProviderClient("gitea", this.version, this.#options);
    return await this.#clientPromise;
  }

  /** Return the authenticated Gitea login when this adapter carries credentials. */
  #currentUserName(): string | undefined {
    return this.#currentUser === undefined ? undefined : userName(this.#currentUser);
  }

  /** Read every organization page visible to the authenticated user. */
  async #currentUserOrganizations(
    client: GiteaClient<TVersion>,
  ): Promise<AnyGiteaOrganization[]> {
    return await this.#allPages((page) =>
      this.#organizationPage(
        client.orgListCurrentUserOrgs({ query: { page, limit: pageSize } }),
      )
    );
  }

  /** Read every repository page owned by one resolved Gitea container. */
  #containerRepositoryPayloads(
    client: GiteaClient<TVersion>,
    container: RepositoryContainerData<"gitea", TVersion>,
  ): Promise<AnyGiteaRepository[]> {
    if (container.kind === "organization") {
      return this.#allPages(async (page) =>
        unwrapRestResponse(
          await client.orgListRepos({
            path: { org: container.name },
            query: { page, limit: pageSize },
          }),
        ) as AnyGiteaRepository[]
      );
    }
    if (container.kind !== "user") {
      return Promise.reject(new TypeError(`unsupported Gitea container kind ${container.kind}`));
    }
    if (this.#currentUserName() === container.name) {
      return this.#allPages(async (page) =>
        unwrapRestResponse(
          await client.userCurrentListRepos({ query: { page, limit: pageSize } }),
        ) as AnyGiteaRepository[]
      );
    }
    return this.#allPages(async (page) =>
      unwrapRestResponse(
        await client.userListRepos({
          path: { username: container.name },
          query: { page, limit: pageSize },
        }),
      ) as AnyGiteaRepository[]
    );
  }

  /** Unwrap one generated organization-list response without copying its schema. */
  async #organizationPage(
    response: Promise<AnyRestResponse>,
  ): Promise<AnyGiteaOrganization[]> {
    return unwrapRestResponse(await response) as AnyGiteaOrganization[];
  }

  /** Consume a generated page reader until it returns a short page. */
  async #allPages<TValue>(
    read: (page: number) => Promise<readonly TValue[]>,
  ): Promise<TValue[]> {
    const values: TValue[] = [];
    for (let page = 1;; page++) {
      const found = await read(page);
      values.push(...found);
      if (found.length < pageSize) return values;
    }
  }

  /** Normalize one Gitea user as a universal repository container. */
  #userContainerData(
    client: GiteaClient<TVersion>,
    user: AnyGiteaUser,
  ): RepositoryContainerData<"gitea", TVersion> {
    const name = userName(user);
    return Object.freeze({
      kind: "user",
      id: requiredIdentity(user.id, `user ${name} id`),
      name,
      ...(optionalString(user.full_name) === undefined
        ? {}
        : { displayName: optionalString(user.full_name) }),
      ...(optionalString(user.description) === undefined
        ? {}
        : { description: optionalString(user.description) }),
      native: new GiteaRepositoryContainerNativeDoor({
        client,
        kind: "user",
        container: user as GiteaUserPayload<TVersion>,
      }),
    });
  }

  /** Normalize one Gitea organization as a universal repository container. */
  #organizationContainerData(
    client: GiteaClient<TVersion>,
    organization: AnyGiteaOrganization,
  ): RepositoryContainerData<"gitea", TVersion> {
    const name = organizationName(organization);
    return Object.freeze({
      kind: "organization",
      id: requiredIdentity(organization.id, `organization ${name} id`),
      name,
      ...(optionalString(organization.full_name) === undefined
        ? {}
        : { displayName: optionalString(organization.full_name) }),
      ...(optionalString(organization.description) === undefined
        ? {}
        : { description: optionalString(organization.description) }),
      native: new GiteaRepositoryContainerNativeDoor({
        client,
        kind: "organization",
        container: organization as GiteaOrganizationPayload<TVersion>,
      }),
    });
  }

  /** Normalize shared repository fields while retaining the exact generated payload. */
  #repositoryData(
    client: GiteaClient<TVersion>,
    repository: AnyGiteaRepository,
  ): RepositoryData<"gitea", TVersion> {
    const name = requiredIdentity(repository.name, "repository name");
    const fullName = optionalString(repository.full_name);
    const owner = optionalString(repository.owner?.login) ?? fullName?.split("/")[0];
    if (owner === undefined || owner.length === 0) {
      throw new TypeError(`repository ${name} has no owner`);
    }
    return Object.freeze({
      id: requiredIdentity(repository.id, `repository ${owner}/${name} id`),
      owner,
      name,
      fullName: fullName ?? `${owner}/${name}`,
      ...(optionalString(repository.description) === undefined
        ? {}
        : { description: optionalString(repository.description) }),
      ...(optionalString(repository.default_branch) === undefined
        ? {}
        : { defaultBranch: optionalString(repository.default_branch) }),
      ...(typeof repository.private === "boolean" ? { private: repository.private } : {}),
      ...(optionalString(repository.html_url) === undefined
        ? {}
        : { url: optionalString(repository.html_url) }),
      native: new GiteaRepositoryNativeDoor(
        client,
        repository as GiteaRepositoryPayload<TVersion>,
      ),
    });
  }
}

/** Gitea-only container door bound to one exact generated client and payload. */
class GiteaRepositoryContainerNativeDoor<TVersion extends GiteaVersion>
  implements GiteaRepositoryContainerNative<TVersion> {
  /** Exact generated context selected by the fluent client version. */
  readonly #context: GiteaRepositoryContainerNativeContext<TVersion>;

  /** Bind the exact generated repository-container context for direct callbacks. */
  constructor(context: GiteaRepositoryContainerNativeContext<TVersion>) {
    this.#context = context;
  }

  /** Run a callback with the selected generated Gitea container context. */
  async gitea<TResult>(
    use: (context: GiteaRepositoryContainerNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult> {
    return await use(this.#context);
  }
}

/** Gitea-only repository door bound to one exact client and payload. */
class GiteaRepositoryNativeDoor<TVersion extends GiteaVersion>
  implements GiteaRepositoryNative<TVersion> {
  /** Exact generated client selected by the fluent client version. */
  readonly #client: GiteaClient<TVersion>;
  /** Exact generated repository payload fetched by the adapter. */
  readonly #repository: GiteaRepositoryPayload<TVersion>;

  /** Bind the exact generated repository context for direct callbacks. */
  constructor(
    client: GiteaClient<TVersion>,
    repository: GiteaRepositoryPayload<TVersion>,
  ) {
    this.#client = client;
    this.#repository = repository;
  }

  /** Run a callback with the selected generated Gitea repository context. */
  async gitea<TResult>(
    use: (context: GiteaRepositoryNativeContext<TVersion>) => TResult | Promise<TResult>,
  ): Promise<TResult> {
    return await use({ client: this.#client, repository: this.#repository });
  }
}

/** Read the required lookup name from a generated Gitea organization. */
function organizationName(organization: AnyGiteaOrganization): string {
  return requiredIdentity(
    optionalString(organization.name) ?? optionalString(organization.username),
    "organization name",
  );
}

/** Read the required login from a generated Gitea user. */
function userName(user: AnyGiteaUser): string {
  return requiredIdentity(user.login, "user login");
}

/** Build a stable organization deduplication key. */
function organizationKey(organization: AnyGiteaOrganization): string {
  return optionalString(organization.id) ?? organizationName(organization);
}

/** Preserve the first discovered value for each stable provider key. */
function uniqueBy<TValue>(
  values: readonly TValue[],
  key: (value: TValue) => string,
): TValue[] {
  const unique = new Map<string, TValue>();
  for (const value of values) {
    const identity = key(value);
    if (!unique.has(identity)) unique.set(identity, value);
  }
  return [...unique.values()];
}

/** Convert and validate one required generated identity. */
function requiredIdentity(value: unknown, name: string): string {
  const identity = optionalString(value);
  if (identity === undefined || identity.length === 0) throw new TypeError(`${name} is missing`);
  return identity;
}

/** Convert a generated textual or lossless numeric value to portable text. */
function optionalString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return undefined;
}

/** Treat an HTTP 404 as confirmed absence even when Gitea adds an undeclared JSON error body. */
function isNotFound(response: AnyRestResponse): boolean {
  return response.status === 404;
}
