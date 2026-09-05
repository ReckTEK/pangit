import {
  createClient,
  errors,
  type ProviderVersion,
} from "../../../../../../packages/pangit/src/fluent-api/mod.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../../request-recorder.ts";
import type { PackageContractFixtures } from "./package-contract-fixtures.ts";

export type PackageContractInput<
  TProvider extends "gitea",
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: PackageContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise bounded package metadata reads and direct version/package cleanup. */
export async function runPackageContract<
  const TProvider extends "gitea",
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: PackageContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/packages", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const packages = git.packages;
    const coordinates = input.fixtures.coordinates;
    const readIdentity = { ...coordinates, version: input.fixtures.readVersion };
    const deleteIdentity = { ...coordinates, version: input.fixtures.deleteVersion };
    const missingIdentity = { ...coordinates, version: input.fixtures.missingVersion };

    const support = await prove(
      "packages.support",
      [],
      () => Promise.resolve(packages.support),
    );
    assert(support.supported, "Packages are not advertised as supported");
    assert(support.operations["list-packages"] === "one-page", "Package listing is not bounded");
    assert(
      support.operations["list-files"] === "direct-bounded-result",
      "Package-file listing does not require an explicit result bound",
    );
    assert(support.upload === "native-only", "Package upload leaked into the shared capability");
    assertions.push("package support metadata is static, conservative, and request-free");

    const ownerPage = await prove(
      "packages.list",
      ["listPackages"],
      () =>
        packages.list(coordinates.owner, {
          type: coordinates.type,
          query: coordinates.name,
          limit: 10,
        }),
    );
    assert(ownerPage.items.length <= 10, "Owner package page exceeded its requested limit");
    assert(
      ownerPage.items.some((entry) =>
        entry.name === coordinates.name && entry.version === input.fixtures.readVersion
      ),
      "Owner package page omitted the known read version",
    );

    const versionPage = await prove(
      "packages.versions",
      ["listPackageVersions"],
      () => packages.versions(coordinates, { limit: 10 }),
    );
    assert(versionPage.items.length <= 10, "Package-version page exceeded its requested limit");
    assert(
      versionPage.items.some((entry) => entry.version === input.fixtures.readVersion),
      "Package-version page omitted the known read version",
    );
    assert(
      versionPage.items.some((entry) => entry.version === input.fixtures.deleteVersion),
      "Package-version page omitted the known deletion version",
    );
    assertions.push("owner and version discovery each inspect exactly one bounded provider page");

    const direct = await prove(
      "packages.get",
      ["getPackage"],
      () => packages.get(readIdentity),
    );
    assert(direct.owner === coordinates.owner, "Direct package lookup changed its owner");
    assert(direct.type === coordinates.type, "Direct package lookup changed its type");
    assert(direct.name === coordinates.name, "Direct package lookup changed its name");
    assert(
      direct.version === input.fixtures.readVersion,
      "Direct package lookup changed its version",
    );
    assert(Object.isFrozen(direct), "Package-version entity is mutable");

    const found = await prove(
      "packages.find",
      ["getPackage"],
      () => packages.find(readIdentity),
    );
    assert(found?.id === direct.id, "Package find returned the wrong version");

    const files = await prove(
      "packages.files",
      ["listPackageFiles"],
      () => packages.files(readIdentity, { maxFiles: 4 }),
    );
    assert(files.length <= 4, "Package-file result exceeded its explicit bound");
    const file = files.find((candidate) => candidate.name === input.fixtures.file.name);
    assert(file !== undefined, "Package-file result omitted the known file");
    assert(file.size === input.fixtures.file.size, "Package-file size was not normalized");
    assert(Object.isFrozen(file), "Package-file entity is mutable");
    assert(Object.isFrozen(file.digests), "Package-file digests are mutable");

    const nativeName = await prove(
      "packageVersion.native.gitea",
      [],
      () => direct.native.gitea(({ package: nativePackage }) => nativePackage.name),
    );
    assert(nativeName === coordinates.name, "Package native payload was not retained");
    const nativeFileName = await prove(
      "packageFile.native.gitea",
      [],
      () => file.native.gitea(({ packageFile }) => packageFile.name),
    );
    assert(nativeFileName === file.name, "Package-file native payload was not retained");
    assertions.push("direct get/find/files retain normalized and exact native metadata");

    const missing = await prove(
      "packages.find.missing",
      ["getPackage"],
      () => packages.find(missingIdentity),
    );
    assert(missing === undefined, "Missing package version did not return undefined");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await packages.get({ ...readIdentity, type: " " });
      } catch (error) {
        invalid = error instanceof errors.ValidationError &&
          error.operation === "getPackageVersion";
      }
    });
    requestEvidence.push(
      proveRequestSequence("packages.get.invalidType", [], invalidCapture).evidence,
    );
    assert(invalid, "Blank package type was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await packages.get(readIdentity, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof errors.OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("packages.get.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Package cancellation was not normalized");
    assertions.push("confirmed absence costs one request; invalid and cancelled reads cost zero");

    await prove(
      "packages.deleteVersion",
      ["deletePackageVersion"],
      () => packages.deleteVersion(deleteIdentity),
    );
    const deletedVersion = await prove(
      "packages.find.afterDeleteVersion",
      ["getPackage"],
      () => packages.find(deleteIdentity),
    );
    assert(deletedVersion === undefined, "Deleted package version is still present");

    await prove(
      "packages.delete",
      ["deletePackage"],
      () => packages.delete(coordinates),
    );
    const deletedPackage = await prove(
      "packages.find.afterDeletePackage",
      ["getPackage"],
      () => packages.find(readIdentity),
    );
    assert(deletedPackage === undefined, "Deleted package is still present");
    assertions.push("version and whole-package lifecycle cleanup are direct and identity-based");
  });

  return Object.freeze({
    id: "shared-capability/packages",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
