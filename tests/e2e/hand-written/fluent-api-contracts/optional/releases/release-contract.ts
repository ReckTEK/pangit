import {
  createClient,
  errors,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../packages/pangit/src/fluent-api/mod.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../../request-recorder.ts";
import type { ReleaseContractFixtures } from "./release-contract-fixtures.ts";

export type ReleaseContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: ReleaseContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise the portable release and release-asset lifecycle against one known tag. */
export async function runReleaseContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: ReleaseContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/releases", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const releases = repository.releases;

    const support = await prove(
      "repository.releases.support",
      [],
      () => Promise.resolve(releases.support),
    );
    assert(support.supported, "Releases are not advertised as supported");
    assert(support.operations.list === "one-page", "Release listing is not one-page bounded");
    assert(support.operations["get-by-tag"] === "direct", "Release tag lookup is not direct");
    assert(
      support.operations["list-assets"] === "direct-bounded-result",
      "Release asset listing does not require a result bound",
    );
    assertions.push("release support metadata is static, explicit, and request-free");

    const created = await prove(
      "repository.releases.create",
      ["repoCreateRelease"],
      () =>
        releases.create({
          tagName: input.fixtures.tagName,
          name: "PanGit live release",
          description: "created through the shared release contract",
          draft: false,
          prerelease: false,
        }),
    );
    assert(created.id.trim().length > 0, "Created release has no identity");
    assert(created.tagName === input.fixtures.tagName, "Created release changed its tag");
    assert(Object.isFrozen(created), "Release entity is mutable");

    const direct = await prove(
      "repository.releases.get",
      ["repoGetRelease"],
      () => releases.get(created.id),
    );
    assert(direct.id === created.id, "Direct release lookup returned the wrong release");

    const byTag = await prove(
      "repository.releases.getByTag",
      ["repoGetReleaseByTag"],
      () => releases.getByTag(input.fixtures.tagName),
    );
    assert(byTag.id === created.id, "Release tag lookup returned the wrong release");

    const page = await prove(
      "repository.releases.list",
      ["repoListReleases"],
      () => releases.list({ limit: 4 }),
    );
    assert(page.items.length <= 4, "Release page exceeded its requested limit");
    assert(
      page.items.some((release) => release.id === created.id),
      "Release page omitted known release",
    );
    assertions.push("create, ID get, tag get, and bounded list have exact one-request budgets");

    const updated = await prove(
      "repository.releases.update",
      ["repoEditRelease"],
      () =>
        releases.update(created, {
          name: "PanGit live release updated",
          description: "updated through the shared release contract",
          prerelease: true,
        }),
    );
    assert(updated.name?.endsWith("updated"), "Release name update was not normalized");
    assert(updated.prerelease, "Release prerelease update was not normalized");

    const assetBytes = new Uint8Array(input.fixtures.asset.bytes);
    const asset = await prove(
      "repository.releases.assets.upload",
      ["repoCreateReleaseAttachment"],
      () =>
        releases.assets.upload(updated, {
          name: input.fixtures.asset.name,
          data: assetBytes,
        }),
    );
    assert(asset.name === input.fixtures.asset.name, "Uploaded release asset changed its name");
    assert(Number(asset.size) === assetBytes.byteLength, "Uploaded release asset changed its size");
    assert(Object.isFrozen(asset), "Release-asset entity is mutable");

    const directAsset = await prove(
      "repository.releases.assets.get",
      ["repoGetReleaseAttachment"],
      () => releases.assets.get(updated, asset.id),
    );
    assert(directAsset.id === asset.id, "Direct asset lookup returned the wrong asset");

    const assets = await prove(
      "repository.releases.assets.list",
      ["repoListReleaseAttachments"],
      () => releases.assets.list(updated, { maxItems: 4 }),
    );
    assert(assets.length <= 4, "Release-asset result exceeded its explicit bound");
    assert(assets.some((candidate) => candidate.id === asset.id), "Asset list omitted known asset");

    const renamed = await prove(
      "repository.releases.assets.update",
      ["repoEditReleaseAttachment"],
      () =>
        releases.assets.update(updated, asset, {
          name: input.fixtures.asset.renamedName,
        }),
    );
    assert(
      renamed.name === input.fixtures.asset.renamedName,
      "Release-asset rename was not normalized",
    );

    const nativeTag = await prove(
      "release.native.gitea",
      [],
      () => updated.native.gitea(({ release }) => release.tag_name),
    );
    assert(nativeTag === input.fixtures.tagName, "Release native payload was not retained");
    const nativeAssetName = await prove(
      "releaseAsset.native.gitea",
      [],
      () => renamed.native.gitea(({ releaseAsset }) => releaseAsset.name),
    );
    assert(nativeAssetName === renamed.name, "Release-asset native payload was not retained");
    assertions.push("asset upload/get/bounded-list/update and native access retain exact identity");

    await prove(
      "repository.releases.assets.delete",
      ["repoDeleteReleaseAttachment"],
      () => releases.assets.delete(updated, renamed),
    );
    let missingAsset = false;
    const missingAssetCapture = await recorder.capture(async () => {
      try {
        await releases.assets.get(updated, asset.id);
      } catch (error) {
        missingAsset = error instanceof errors.NotFoundError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "repository.releases.assets.get.afterDelete",
        ["repoGetReleaseAttachment"],
        missingAssetCapture,
      ).evidence,
    );
    assert(missingAsset, "Deleted release asset was not reported missing");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await releases.create({ tagName: " " });
      } catch (error) {
        invalid = error instanceof errors.ValidationError && error.operation === "createRelease";
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.releases.create.invalidTag", [], invalidCapture).evidence,
    );
    assert(
      invalid,
      "Blank release tag was not rejected locally as createRelease ValidationError",
    );

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await releases.get(created.id, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof errors.OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.releases.get.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Release cancellation was not normalized");

    await prove(
      "repository.releases.delete",
      ["repoDeleteRelease"],
      () => releases.delete(updated),
    );
    let missingRelease = false;
    const missingReleaseCapture = await recorder.capture(async () => {
      try {
        await releases.get(created.id);
      } catch (error) {
        missingRelease = error instanceof errors.NotFoundError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "repository.releases.get.afterDelete",
        ["repoGetRelease"],
        missingReleaseCapture,
      ).evidence,
    );
    assert(missingRelease, "Deleted release was not reported missing");
    assertions.push("asset/release cleanup is direct; absence is separately proven in one request");
    assertions.push("invalid and cancelled release calls perform zero provider requests");
  });

  return Object.freeze({
    id: "shared-capability/releases",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
