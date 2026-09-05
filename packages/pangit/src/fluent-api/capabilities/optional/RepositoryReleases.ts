import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import { ValidationError, type ValidationErrorContext } from "../../adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../../adapter-contract/pagination.ts";

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

export interface RepositoryReleases<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly support: ReleaseCapabilitySupport;
  list(request?: PageRequest): Promise<Page<Release<TProvider, TVersion, TRegistry>>>;
  get(id: string, options?: OperationOptions): Promise<Release<TProvider, TVersion, TRegistry>>;
  getByTag(
    tagName: string,
    options?: OperationOptions,
  ): Promise<Release<TProvider, TVersion, TRegistry>>;
  create(
    input: CreateReleaseInput,
    options?: OperationOptions,
  ): Promise<Release<TProvider, TVersion, TRegistry>>;
  update(
    release: Release<TProvider, TVersion, TRegistry>,
    input: UpdateReleaseInput,
    options?: OperationOptions,
  ): Promise<Release<TProvider, TVersion, TRegistry>>;
  delete(
    release: Release<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
  assets: Readonly<{
    list(
      release: Release<TProvider, TVersion, TRegistry>,
      options: OperationOptions & { readonly maxItems: number },
    ): Promise<readonly ReleaseAsset<TProvider, TVersion, TRegistry>[]>;
    get(
      release: Release<TProvider, TVersion, TRegistry>,
      id: string,
      options?: OperationOptions,
    ): Promise<ReleaseAsset<TProvider, TVersion, TRegistry>>;
    upload(
      release: Release<TProvider, TVersion, TRegistry>,
      input: UploadReleaseAssetInput,
      options?: OperationOptions,
    ): Promise<ReleaseAsset<TProvider, TVersion, TRegistry>>;
    update(
      release: Release<TProvider, TVersion, TRegistry>,
      asset: ReleaseAsset<TProvider, TVersion, TRegistry>,
      input: UpdateReleaseAssetInput,
      options?: OperationOptions,
    ): Promise<ReleaseAsset<TProvider, TVersion, TRegistry>>;
    delete(
      release: Release<TProvider, TVersion, TRegistry>,
      asset: ReleaseAsset<TProvider, TVersion, TRegistry>,
      options?: OperationOptions,
    ): Promise<void>;
  }>;
}

export function createRepositoryReleases<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: ReleaseAdapter<TProvider, TVersion, TRegistry> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  },
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryReleases<TProvider, TVersion, TRegistry> {
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
    release: Release<TProvider, TVersion, TRegistry>,
  ): ReleaseData<TProvider, TVersion, TRegistry> => ({ ...release, native: release.native });
  const assetData = (
    asset: ReleaseAsset<TProvider, TVersion, TRegistry>,
  ): ReleaseAssetData<TProvider, TVersion, TRegistry> => ({ ...asset, native: asset.native });
  const assets = Object.freeze({
    async list(
      release: Release<TProvider, TVersion, TRegistry>,
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
      release: Release<TProvider, TVersion, TRegistry>,
      id: string,
      options: OperationOptions = {},
    ) {
      requireIdentity(id, "release asset id", validationContext("getReleaseAsset"));
      return createReleaseAssetEntity(
        await adapter.getReleaseAsset(repository, releaseData(release), id, options),
      );
    },
    async upload(
      release: Release<TProvider, TVersion, TRegistry>,
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
      release: Release<TProvider, TVersion, TRegistry>,
      asset: ReleaseAsset<TProvider, TVersion, TRegistry>,
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
      release: Release<TProvider, TVersion, TRegistry>,
      asset: ReleaseAsset<TProvider, TVersion, TRegistry>,
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
      release: Release<TProvider, TVersion, TRegistry>,
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
    delete(release: Release<TProvider, TVersion, TRegistry>, options: OperationOptions = {}) {
      return adapter.deleteRelease(repository, releaseData(release), options);
    },
    assets,
  });
}
