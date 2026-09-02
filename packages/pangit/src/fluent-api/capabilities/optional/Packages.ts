import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type { SelectedGitHostAdapter } from "../../adapter-contract/GitHostAdapter.ts";
import type { ValidationErrorContext } from "../../adapter-contract/errors.ts";
import type { OperationOptions } from "../../adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";
import type { Page, PageRequest } from "../../adapter-contract/pagination.ts";
import { createPage, resolvePageRequest } from "../../adapter-contract/pagination.ts";
import type {
  ListPackageFilesOptions,
  PackageAdapter,
  PackageCapabilitySupport,
  PackageCoordinates,
  PackageVersionIdentity,
} from "../../adapter-contract/optional/packages.ts";
import {
  createPackageFile,
  createPackageVersion,
  type PackageFile,
  type PackageVersion,
} from "../../entities/optional/Package.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface ListPackagesOptions extends PageRequest {
  readonly query?: string;
  readonly type?: string;
}

export interface Packages<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: PackageCapabilitySupport;
  list(
    owner: string,
    options?: ListPackagesOptions,
  ): Promise<Page<PackageVersion<TProvider, TVersion>>>;
  versions(
    coordinates: PackageCoordinates,
    request?: PageRequest,
  ): Promise<Page<PackageVersion<TProvider, TVersion>>>;
  get(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersion<TProvider, TVersion>>;
  find(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersion<TProvider, TVersion> | undefined>;
  files(
    identity: PackageVersionIdentity,
    options: ListPackageFilesOptions,
  ): Promise<readonly PackageFile<TProvider, TVersion>[]>;
  deleteVersion(identity: PackageVersionIdentity, options?: OperationOptions): Promise<void>;
  delete(coordinates: PackageCoordinates, options?: OperationOptions): Promise<void>;
}

export function createPackages<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(adapter: PackageAdapter<TProvider, TVersion>): Packages<TProvider, TVersion> {
  return createPackagesFromSelection(
    () => Promise.resolve(adapter),
    adapter.packageSupport,
  );
}

/** Build the client-scoped package handle without loading the selected provider adapter. */
export function createLazyPackages<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  selectedAdapter: SelectedGitHostAdapter<TProvider, TVersion>,
  support: PackageCapabilitySupport,
): Packages<TProvider, TVersion> {
  return createPackagesFromSelection(selectedAdapter, support);
}

function createPackagesFromSelection<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  selectedAdapter: () => Promise<PackageAdapter<TProvider, TVersion>>,
  support: PackageCapabilitySupport,
): Packages<TProvider, TVersion> {
  return Object.freeze({
    support,
    async list(owner: string, options: ListPackagesOptions = {}) {
      const adapter = await selectedAdapter();
      const context = adapterValidationContext(adapter, "listPackages");
      validatePageLimit(options, context);
      const page = await adapter.listPackages(requireIdentity(owner, "package owner", context), {
        ...resolvePageRequest(options, 50, context),
        ...(options.query === undefined
          ? {}
          : { query: requireIdentity(options.query, "package query", context) }),
        ...(options.type === undefined
          ? {}
          : { type: requireIdentity(options.type, "package type", context) }),
      });
      return createPage(page.items.map(createPackageVersion), page);
    },
    async versions(coordinates: PackageCoordinates, request: PageRequest = {}) {
      const adapter = await selectedAdapter();
      const context = adapterValidationContext(adapter, "listPackageVersions");
      validatePageLimit(request, context);
      const page = await adapter.listPackageVersions(
        validateCoordinates(coordinates, context),
        resolvePageRequest(request, 50, context),
      );
      return createPage(page.items.map(createPackageVersion), page);
    },
    async get(identity: PackageVersionIdentity, options: OperationOptions = {}) {
      const adapter = await selectedAdapter();
      const context = adapterValidationContext(adapter, "getPackageVersion");
      return createPackageVersion(
        await adapter.getPackageVersion(validateIdentity(identity, context), options),
      );
    },
    async find(identity: PackageVersionIdentity, options: OperationOptions = {}) {
      const adapter = await selectedAdapter();
      const context = adapterValidationContext(adapter, "findPackageVersion");
      const found = await adapter.findPackageVersion(validateIdentity(identity, context), options);
      return found === undefined ? undefined : createPackageVersion(found);
    },
    async files(identity: PackageVersionIdentity, options: ListPackageFilesOptions) {
      const adapter = await selectedAdapter();
      const context = adapterValidationContext(adapter, "listPackageFiles");
      requirePositiveInteger(options.maxFiles, "maximum package files", context);
      const files = await adapter.listPackageFiles(validateIdentity(identity, context), options);
      return Object.freeze(files.map(createPackageFile));
    },
    async deleteVersion(identity: PackageVersionIdentity, options: OperationOptions = {}) {
      const adapter = await selectedAdapter();
      const context = adapterValidationContext(adapter, "deletePackageVersion");
      return adapter.deletePackageVersion(validateIdentity(identity, context), options);
    },
    async delete(coordinates: PackageCoordinates, options: OperationOptions = {}) {
      const adapter = await selectedAdapter();
      const context = adapterValidationContext(adapter, "deletePackage");
      return adapter.deletePackage(validateCoordinates(coordinates, context), options);
    },
  });
}

function validateCoordinates(
  coordinates: PackageCoordinates,
  context: ValidationErrorContext,
): PackageCoordinates {
  return Object.freeze({
    owner: requireIdentity(coordinates.owner, "package owner", context),
    type: requireIdentity(coordinates.type, "package type", context),
    name: requireIdentity(coordinates.name, "package name", context),
  });
}

function validateIdentity(
  identity: PackageVersionIdentity,
  context: ValidationErrorContext,
): PackageVersionIdentity {
  return Object.freeze({
    ...validateCoordinates(identity, context),
    version: requireIdentity(identity.version, "package version", context),
  });
}

function adapterValidationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: PackageAdapter<TProvider, TVersion>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  const identity = adapter as PackageAdapter<TProvider, TVersion> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  };
  return {
    operation,
    ...(identity.provider === undefined ? {} : { provider: identity.provider }),
    ...(identity.version === undefined ? {} : { version: identity.version }),
  };
}

function validatePageLimit(request: PageRequest, context: ValidationErrorContext): void {
  if (request.limit !== undefined) {
    requirePositiveInteger(request.limit, "page limit", context);
  }
}
