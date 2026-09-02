import {
  createClient,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import type {
  FluentApiContractResult,
  RepositoryContainerContractFixtures,
} from "../../fluent-api-contracts/repository-container-api-contract.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise only Gitea's typed native escape hatch; it is not part of the shared contract. */
export async function runGiteaNativeContextContract(
  t: Deno.TestContext,
  input: {
    version: ProviderVersion<"gitea">;
    apiUrl: string;
    token: string;
    fixtures: RepositoryContainerContractFixtures;
  },
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const passed = await t.step("Gitea native-context contract", async () => {
    const git = await createClient("gitea", input.version, input.apiUrl).auth.token(input.token);
    const user = await git.container(input.fixtures.user.name);
    const organization = await git.container(input.fixtures.organization.name);
    const repository = await organization.repository(input.fixtures.organization.repository);

    const nativeUserName = await user.native.gitea((context) => {
      assert(
        context.client.constructor.name === "GiteaRestClient",
        "Native door returned the wrong client",
      );
      assert(context.kind === "user", "Native door returned the wrong container kind");
      return context.container.login;
    });
    assert(nativeUserName === input.fixtures.user.name, "Native container payload was incorrect");

    const nativeRepositoryName = await repository.native.gitea(({ client, repository }) => {
      assert(
        client.constructor.name === "GiteaRestClient",
        "Native door returned the wrong client",
      );
      return repository.full_name;
    });
    assert(
      nativeRepositoryName ===
        `${input.fixtures.organization.name}/${input.fixtures.organization.repository}`,
      "Native repository payload was incorrect",
    );
    assertions.push("native.gitea retains exact generated container and repository contexts");
  });

  return { name: "gitea-native-context", passed, assertions };
}
