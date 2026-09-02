import {
  createClient,
  type Provider,
  type ProviderVersion,
  type Repository,
} from "../../../../packages/pangit/src/fluent-api/mod.ts";

export type RepositoryContainerContractFixtures = {
  user: { name: string; repository: string };
  organization: { name: string; repository: string };
  mutationRepository: string;
};

export type FluentApiContractResult = {
  name: string;
  passed: boolean;
  assertions: string[];
};

type RepositoryContainerContractInput<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  provider: TProvider;
  version: TVersion;
  apiUrl: string;
  token: string;
  fixtures: RepositoryContainerContractFixtures;
};

type DisposableRepository = Pick<Repository<Provider, ProviderVersion<Provider>>, "delete">;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise the Git-host-neutral repository-container API against one live adapter. */
export async function runRepositoryContainerContract<
  const TProvider extends Provider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: RepositoryContainerContractInput<TProvider, TVersion>,
): Promise<FluentApiContractResult> {
  const { provider, version, apiUrl, token, fixtures } = input;
  const renamedRepositoryName = `${fixtures.mutationRepository}-renamed`;
  const assertions: string[] = [];

  const passed = await t.step("repository-container contract", async () => {
    const connection = createClient(provider, version, apiUrl);
    const git = await connection.auth.token(token);
    assert(git.provider === provider && git.version === version, "Authorization changed selection");
    assertions.push("token authorization retains the selected client");

    const containers = await git.containers();
    assert(
      containers.some((container) =>
        container.kind === "user" && container.name === fixtures.user.name
      ),
      "Container discovery omitted the authenticated user",
    );
    assert(
      containers.some((container) =>
        container.kind === "organization" && container.name === fixtures.organization.name
      ),
      "Container discovery omitted the organization",
    );
    assertions.push("container discovery returns normalized user and organization owners");

    const user = await git.container(fixtures.user.name);
    assert(
      user.kind === "user" && user.name === fixtures.user.name,
      "User container lookup was incorrect",
    );
    const organization = await git.container(fixtures.organization.name);
    assert(
      organization.kind === "organization" &&
        organization.name === fixtures.organization.name,
      "Organization container lookup was incorrect",
    );
    assertions.push("container(name) resolves normalized user and organization owners");

    assert(
      await user.hasRepository(fixtures.user.repository),
      "Direct user repository existence check missed the fixture",
    );
    const foundUserRepository = await user.findRepository(fixtures.user.repository);
    assert(foundUserRepository !== undefined, "Optional repository lookup missed the fixture");
    assert(
      foundUserRepository.fullName === `${fixtures.user.name}/${fixtures.user.repository}`,
      "Optional repository lookup returned the wrong entity",
    );
    const userRepository = await user.repository(fixtures.user.repository);
    assert(
      userRepository.fullName === `${fixtures.user.name}/${fixtures.user.repository}`,
      "Required user repository lookup returned the wrong entity",
    );
    assertions.push("repository existence, optional lookup, and required lookup are direct");

    const organizationRepositories = await organization.repositories();
    assert(
      organizationRepositories.some((repository) =>
        repository.name === fixtures.organization.repository
      ),
      "Organization repository listing omitted the fixture",
    );
    const organizationRepository = await organization.repository(
      fixtures.organization.repository,
    );
    assert(
      organizationRepository.owner === fixtures.organization.name,
      "Organization repository lookup returned the wrong owner",
    );
    assertions.push("container-scoped repository listing and lookup return normalized entities");

    let disposable: DisposableRepository | undefined;
    try {
      const created = await user.createRepository(fixtures.mutationRepository, {
        description: "PanGit fluent contract E2E",
        private: true,
        initialize: true,
        defaultBranch: "main",
      });
      disposable = created;
      assert(
        created.owner === fixtures.user.name &&
          created.name === fixtures.mutationRepository && created.private === true,
        "Repository creation returned the wrong entity",
      );

      const renamed = await created.rename(renamedRepositoryName);
      disposable = renamed;
      assert(renamed.name === renamedRepositoryName, "Repository rename returned the wrong entity");
      const refreshed = await user.repository(renamedRepositoryName);
      assert(refreshed.id === renamed.id, "Renamed repository could not be fetched");

      await renamed.delete();
      disposable = undefined;
      assertions.push("repository create, rename, refresh, and delete succeed");
    } finally {
      await disposable?.delete();
    }
  });

  return { name: "repository-container", passed, assertions };
}
