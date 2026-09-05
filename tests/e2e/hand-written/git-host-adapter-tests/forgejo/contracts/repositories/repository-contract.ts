import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  NotFoundError,
  OperationAbortedError,
  ValidationError,
} from "../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { RepositoryContractFixtures } from "../../../../fluent-api-contracts/repositories/repository-contract-fixtures.ts";

type RepositoryContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: RepositoryContractFixtures;
};

type DisposableRepository = { delete(): Promise<void> };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise only the Git-host-neutral repository-container API against one live adapter. */
export async function runRepositoryContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: RepositoryContractInput<TProvider, TVersion>,
): Promise<FluentApiContractResult> {
  const { provider, version, apiUrl, token, fixtures } = input;
  const renamedRepositoryName = `${fixtures.mutationRepository}-renamed`;
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();

  const prove = async <TValue>(
    operation: string,
    expectedOperationIds: readonly string[],
    action: () => Promise<TValue>,
  ): Promise<TValue> => {
    const proof = proveRequestSequence(
      operation,
      expectedOperationIds,
      await recorder.capture(action),
    );
    requestEvidence.push(proof.evidence);
    return proof.value;
  };

  const passed = await t.step("core/repositories", async () => {
    const connection = await createClient(provider, version, {
      baseUrl: apiUrl,
      beforeRequest: recorder.beforeRequest,
    });
    const git = await prove(
      "authorizeToken",
      ["userGetCurrent"],
      () => connection.auth.token(token),
    );
    assert(git.provider === provider && git.version === version, "Authorization changed selection");
    assertions.push("token authorization retains the selected client");

    const containers = await prove(
      "listRepositoryContainers",
      ["orgListCurrentUserOrgs"],
      () => git.containers(),
    );
    assert(
      containers.items.some((container) =>
        container.kind === "user" && container.name === fixtures.user.name
      ),
      "Container discovery omitted the authenticated user",
    );
    assert(
      containers.items.some((container) =>
        container.kind === "organization" && container.name === fixtures.organization.name
      ),
      "Container discovery omitted the organization",
    );
    assertions.push("container discovery returns normalized user and organization owners");

    let invalidCursorRejected = false;
    const invalidCursorCapture = await recorder.capture(async () => {
      try {
        await git.containers({ limit: 1, cursor: "not-a-forgejo-container-cursor" });
      } catch (error) {
        invalidCursorRejected = error instanceof ValidationError && error.provider === provider &&
          error.version === version && error.operation === "listRepositoryContainers";
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "listRepositoryContainers.invalidCursor",
        [],
        invalidCursorCapture,
      ).evidence,
    );
    assert(invalidCursorRejected, "Invalid container cursor was not rejected contextually");
    assertions.push("invalid opaque container cursors fail locally with exact adapter context");

    const user = await prove(
      "getCurrentUserContainer",
      [],
      () => git.container(fixtures.user.name),
    );
    assert(
      user.kind === "user" && user.name === fixtures.user.name,
      "User container lookup was incorrect",
    );
    const organization = await prove(
      "getOrganizationContainer",
      ["orgGet"],
      () => git.container(fixtures.organization.name),
    );
    assert(
      organization.kind === "organization" && organization.name === fixtures.organization.name,
      "Organization container lookup was incorrect",
    );
    assertions.push("container(name) resolves normalized user and organization owners");

    assert(
      await prove("hasRepository", ["repoGet"], () => user.hasRepository(fixtures.user.repository)),
      "Direct user repository existence check missed the fixture",
    );
    const foundUserRepository = await prove(
      "findRepository",
      ["repoGet"],
      () => user.findRepository(fixtures.user.repository),
    );
    assert(foundUserRepository !== undefined, "Optional repository lookup missed the fixture");
    assert(
      foundUserRepository.fullName === `${fixtures.user.name}/${fixtures.user.repository}`,
      "Optional repository lookup returned the wrong entity",
    );
    const userRepository = await prove(
      "getRepository",
      ["repoGet"],
      () => user.repository(fixtures.user.repository),
    );
    assert(
      userRepository.fullName === `${fixtures.user.name}/${fixtures.user.repository}`,
      "Required user repository lookup returned the wrong entity",
    );
    assertions.push("repository existence, optional lookup, and required lookup are direct");

    const missingName = `${fixtures.user.repository}-missing`;
    let requiredMissing = false;
    try {
      await prove("getRepository.missing", ["repoGet"], () => user.repository(missingName));
    } catch (error) {
      requiredMissing = error instanceof NotFoundError;
    }
    assert(requiredMissing, "Required missing repository did not throw NotFoundError");
    assert(
      await prove("findRepository.missing", ["repoGet"], () => user.findRepository(missingName)) ===
        undefined,
      "Optional missing repository did not return undefined",
    );
    assert(
      !(await prove("hasRepository.missing", ["repoGet"], () => user.hasRepository(missingName))),
      "Missing repository existence returned true",
    );
    assertions.push("only confirmed repository absence becomes undefined or false");

    const userRepositories = await prove(
      "listUserRepositories",
      ["userCurrentListRepos"],
      () => user.repositories({ limit: 50 }),
    );
    assert(
      userRepositories.items.some((repository) => repository.name === fixtures.user.repository),
      "Current-user repository page omitted the fixture",
    );

    const organizationRepositories = await prove(
      "listRepositories",
      ["orgListRepos"],
      () => organization.repositories(),
    );
    assert(
      organizationRepositories.items.some((repository) =>
        repository.name === fixtures.organization.repository
      ),
      "Organization repository listing omitted the fixture",
    );
    const organizationRepository = await prove(
      "getOrganizationRepository",
      ["repoGet"],
      () => organization.repository(fixtures.organization.repository),
    );
    assert(
      organizationRepository.owner === fixtures.organization.name,
      "Organization repository lookup returned the wrong owner",
    );
    assertions.push("container-scoped repository listing and lookup return normalized entities");

    let organizationDisposable: DisposableRepository | undefined;
    try {
      const createdOrganizationRepository = await prove(
        "createOrganizationRepository",
        ["createOrgRepo"],
        () =>
          organization.createRepository(fixtures.organizationMutationRepository, {
            initialize: true,
            defaultBranch: "main",
          }),
      );
      organizationDisposable = createdOrganizationRepository;
      await prove(
        "deleteOrganizationRepository",
        ["repoDelete"],
        () => createdOrganizationRepository.delete(),
      );
      organizationDisposable = undefined;
    } finally {
      await organizationDisposable?.delete();
    }

    let initializedDisposable: DisposableRepository | undefined;
    try {
      const initialized = await prove(
        "createInitializedRepository",
        ["createCurrentUserRepo", "repoChangeFiles"],
        () =>
          user.createRepository(fixtures.initializedRepository, {
            private: true,
            defaultBranch: "trunk",
            initialCommitMessage: "PanGit caller-supplied initial tree",
            files: [
              { path: "README.md", content: "initialized by PanGit\n" },
              { path: "nested/data.bin", content: new Uint8Array([0, 1, 127, 128, 255]) },
            ],
          }),
      );
      initializedDisposable = initialized;
      assert(initialized.defaultBranch === "trunk", "Named initial branch was not retained");
      const initializedFiles = await prove(
        "readInitializedRepositoryFiles",
        ["repoGetContents", "repoGetContents"],
        () => initialized.content.readFiles(["README.md", "nested/data.bin"], { ref: "trunk" }),
      );
      assert(
        new TextDecoder().decode(initializedFiles[0].content?.bytes) ===
            "initialized by PanGit\n" &&
          initializedFiles[1].content?.bytes?.join(",") === "0,1,127,128,255",
        "Initialized repository did not contain the exact caller files",
      );
      await prove("deleteInitializedRepository", ["repoDelete"], () => initialized.delete());
      initializedDisposable = undefined;
      assertions.push("repository creation accepts an exact multi-file initial tree and branch");
    } finally {
      await initializedDisposable?.delete();
    }

    let disposable: DisposableRepository | undefined;
    try {
      const created = await prove(
        "createRepository",
        ["createCurrentUserRepo"],
        () =>
          user.createRepository(fixtures.mutationRepository, {
            description: "PanGit fluent contract E2E",
            private: true,
            initialize: true,
            defaultBranch: "main",
          }),
      );
      disposable = created;
      assert(
        created.owner === fixtures.user.name &&
          created.name === fixtures.mutationRepository && created.private === true,
        "Repository creation returned the wrong entity",
      );

      const renamed = await prove(
        "renameRepository",
        ["repoEdit"],
        () => created.rename(renamedRepositoryName),
      );
      disposable = renamed;
      assert(renamed.name === renamedRepositoryName, "Repository rename returned the wrong entity");
      assert(
        created.name === fixtures.mutationRepository,
        "Repository rename mutated the earlier immutable snapshot",
      );
      const refreshed = await prove(
        "refreshRenamedRepository",
        ["repoGet"],
        () => user.repository(renamedRepositoryName),
      );
      assert(refreshed.id === renamed.id, "Renamed repository could not be fetched");

      await prove("deleteRepository", ["repoDelete"], () => renamed.delete());
      disposable = undefined;
      assert(
        !(await prove(
          "hasRepository.afterDelete",
          ["repoGet"],
          () => user.hasRepository(renamedRepositoryName),
        )),
        "Deleted repository still exists",
      );
      assertions.push("repository create, rename, refresh, and delete succeed");
    } finally {
      await disposable?.delete();
    }

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortedCapture = await recorder.capture(async () => {
      try {
        await user.repository(fixtures.user.repository, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("getRepository.preflightAbort", [], abortedCapture).evidence,
    );
    assert(aborted, "Repository cancellation was not normalized");

    let blankRejected = false;
    const blankCapture = await recorder.capture(async () => {
      try {
        await user.repository("   ");
      } catch (error) {
        blankRejected = error instanceof ValidationError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("getRepository.blankIdentity", [], blankCapture).evidence,
    );
    assert(blankRejected, "Whitespace-only repository identity was accepted");
    assertions.push("repository validation and preflight cancellation make zero requests");
  });

  return Object.freeze({
    id: "core/repositories",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
