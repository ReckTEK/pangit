import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import { ValidationError, type ValidationErrorContext } from "../../adapter-contract/errors.ts";
import type { OperationOptions } from "../../adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";
import type { Page, PageRequest } from "../../adapter-contract/pagination.ts";
import { createPage, resolvePageRequest } from "../../adapter-contract/pagination.ts";
import type {
  CreateReleaseInput,
  ReleaseAdapter,
  ReleaseAssetData,
  ReleaseCapabilitySupport,
  ReleaseData,
  UpdateReleaseAssetInput,
  UpdateReleaseInput,
  UploadReleaseAssetInput,
} from "../../adapter-contract/optional/releases.ts";
import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import {
  createReleaseAssetEntity,
  createReleaseEntity,
  type Release,
  type ReleaseAsset,
} from "../../entities/optional/Release.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface RepositoryReleases<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: ReleaseCapabilitySupport;
  list(request?: PageRequest): Promise<Page<Release<TProvider, TVersion>>>;
  get(id: string, options?: OperationOptions): Promise<Release<TProvider, TVersion>>;
  getByTag(tagName: string, options?: OperationOptions): Promise<Release<TProvider, TVersion>>;
  create(
    input: CreateReleaseInput,
    options?: OperationOptions,
  ): Promise<Release<TProvider, TVersion>>;
  update(
    release: Release<TProvider, TVersion>,
    input: UpdateReleaseInput,
    options?: OperationOptions,
  ): Promise<Release<TProvider, TVersion>>;
  delete(release: Release<TProvider, TVersion>, options?: OperationOptions): Promise<void>;
  assets: Readonly<{
    list(
      release: Release<TProvider, TVersion>,
      options: OperationOptions & { readonly maxItems: number },
    ): Promise<readonly ReleaseAsset<TProvider, TVersion>[]>;
    get(
      release: Release<TProvider, TVersion>,
      id: string,
      options?: OperationOptions,
    ): Promise<ReleaseAsset<TProvider, TVersion>>;
    upload(
      release: Release<TProvider, TVersion>,
      input: UploadReleaseAssetInput,
      options?: OperationOptions,
    ): Promise<ReleaseAsset<TProvider, TVersion>>;
    update(
      release: Release<TProvider, TVersion>,
      asset: ReleaseAsset<TProvider, TVersion>,
      input: UpdateReleaseAssetInput,
      options?: OperationOptions,
    ): Promise<ReleaseAsset<TProvider, TVersion>>;
    delete(
      release: Release<TProvider, TVersion>,
      asset: ReleaseAsset<TProvider, TVersion>,
      options?: OperationOptions,
    ): Promise<void>;
  }>;
}

export function createRepositoryReleases<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: ReleaseAdapter<TProvider, TVersion> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  },
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryReleases<TProvider, TVersion> {
  const validationContext = (
    operation: string,
  ): ValidationErrorContext<TProvider, TVersion> => ({
    operation,
    ...(adapter.provider === undefined ? {} : { provider: adapter.provider }),
    ...(adapter.version === undefined ? {} : { version: adapter.version }),
  });
  const resolveRequest = (request: PageRequest, operation: string) => {
    if (request.limit !== undefined) {
      requirePositiveInteger(request.limit, "page limit", validationContext(operation));
    }
    return resolvePageRequest(request, 50, validationContext(operation));
  };
  const releaseData = (
    release: Release<TProvider, TVersion>,
  ): ReleaseData<TProvider, TVersion> => ({ ...release, native: release.native });
  const assetData = (
    asset: ReleaseAsset<TProvider, TVersion>,
  ): ReleaseAssetData<TProvider, TVersion> => ({ ...asset, native: asset.native });
  const assets = Object.freeze({
    async list(
      release: Release<TProvider, TVersion>,
      options: OperationOptions & { readonly maxItems: number },
    ) {
      requirePositiveInteger(
        options.maxItems,
        "maximum release assets",
        validationContext("listReleaseAssets"),
      );
      const values = await adapter.listReleaseAssets(repository, releaseData(release), options);
      return Object.freeze(values.map(createReleaseAssetEntity));
    },
    async get(
      release: Release<TProvider, TVersion>,
      id: string,
      options: OperationOptions = {},
    ) {
      requireIdentity(id, "release asset id", validationContext("getReleaseAsset"));
      return createReleaseAssetEntity(
        await adapter.getReleaseAsset(repository, releaseData(release), id, options),
      );
    },
    async upload(
      release: Release<TProvider, TVersion>,
      input: UploadReleaseAssetInput,
      options: OperationOptions = {},
    ) {
      requireIdentity(
        input.name,
        "release asset name",
        validationContext("uploadReleaseAsset"),
      );
      return createReleaseAssetEntity(
        await adapter.uploadReleaseAsset(repository, releaseData(release), input, options),
      );
    },
    async update(
      release: Release<TProvider, TVersion>,
      asset: ReleaseAsset<TProvider, TVersion>,
      input: UpdateReleaseAssetInput,
      options: OperationOptions = {},
    ) {
      requireIdentity(
        input.name,
        "release asset name",
        validationContext("updateReleaseAsset"),
      );
      return createReleaseAssetEntity(
        await adapter.updateReleaseAsset(
          repository,
          releaseData(release),
          assetData(asset),
          input,
          options,
        ),
      );
    },
    delete(
      release: Release<TProvider, TVersion>,
      asset: ReleaseAsset<TProvider, TVersion>,
      options: OperationOptions = {},
    ) {
      return adapter.deleteReleaseAsset(
        repository,
        releaseData(release),
        assetData(asset),
        options,
      );
    },
  });
  return Object.freeze({
    support: adapter.releaseSupport,
    async list(request: PageRequest = {}) {
      const page = await adapter.listReleases(
        repository,
        resolveRequest(request, "listReleases"),
      );
      return createPage(page.items.map(createReleaseEntity), page);
    },
    async get(id: string, options: OperationOptions = {}) {
      requireIdentity(id, "release id", validationContext("getRelease"));
      return createReleaseEntity(await adapter.getRelease(repository, id, options));
    },
    async getByTag(tagName: string, options: OperationOptions = {}) {
      requireIdentity(tagName, "release tag name", validationContext("getReleaseByTag"));
      return createReleaseEntity(await adapter.getReleaseByTag(repository, tagName, options));
    },
    async create(input: CreateReleaseInput, options: OperationOptions = {}) {
      const context = validationContext("createRelease");
      requireIdentity(input.tagName, "release tag name", context);
      if (input.name !== undefined) requireIdentity(input.name, "release name", context);
      if (input.target !== undefined) requireIdentity(input.target, "release target", context);
      return createReleaseEntity(await adapter.createRelease(repository, input, options));
    },
    async update(
      release: Release<TProvider, TVersion>,
      input: UpdateReleaseInput,
      options: OperationOptions = {},
    ) {
      const context = validationContext("updateRelease");
      if (
        input.name === undefined && input.description === undefined && input.draft === undefined &&
        input.prerelease === undefined
      ) {
        throw new ValidationError("release update requires at least one changed field", context);
      }
      if (input.name !== undefined) requireIdentity(input.name, "release name", context);
      return createReleaseEntity(
        await adapter.updateRelease(repository, releaseData(release), input, options),
      );
    },
    delete(release: Release<TProvider, TVersion>, options: OperationOptions = {}) {
      return adapter.deleteRelease(repository, releaseData(release), options);
    },
    assets,
  });
}
